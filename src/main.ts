import * as core from '@actions/core'
import * as fs from 'fs'
import * as path from 'path'
import axios from 'axios'
interface MarkdownLink {
  url: string
  line: number
}
const readdir = fs.promises.readdir
const readFile = fs.promises.readFile
const useToken: boolean = process.env.INPUT_USETOKEN === 'true'
const docsPath: string = process.env.DOCS_PATH || './docs'
const jwtToken: string = process.env.JWT_TOKEN || ''

const markdownLinkRegex = /$$([^$$]+)\]$(http[s]?:\/\/[^)]+)$/g
const emptyImageLinkRegex = /!$$$$$(http[s]?:\/\/[^)]+)$/g

const extractLinksFromMarkdown = (markdown: string): MarkdownLink[] => {
  const lines = markdown.split(/\r?\n/)
  const links: MarkdownLink[] = []

  lines.forEach((line, index) => {
    let match: RegExpExecArray | null
    while ((match = markdownLinkRegex.exec(line)) !== null) {
      links.push({ url: match[2], line: index + 1 })
    }
  })

  return links
}

const checkLink = async (
  url: string,
  filePath: string,
  line: number
): Promise<void> => {
  try {
    const config: any = {}
    if (
      useToken &&
      jwtToken &&
      url.startsWith('https://baseplate.legogroup.io/')
    ) {
      config.headers = { Authorization: `Bearer ${jwtToken}` }
    }
    const response = await axios.head(url, config)
    if (response.status === 200) {
      console.log(`✅ [${filePath}:${line}] ${url}`)
    } else {
      console.error(
        `❌ [${filePath}:${line}] ${url} (Status: ${response.status})`
      )
      process.exitCode = 1
    }
  } catch (error) {
    console.error(
      `❌ [${filePath}:${line}] ${url} (Error: ${(error as Error).message})`
    )
    process.exitCode = 1
  }
}

const extractEmptyImageLinksFromMarkdown = (markdown: string): string[] => {
  const links: string[] = []
  let match: RegExpExecArray | null

  while ((match = emptyImageLinkRegex.exec(markdown)) !== null) {
    links.push(match[1]) // match[1] contains the URL
  }

  return links
}

const checkLinksInMarkdown = async (filePath: string): Promise<void> => {
  const markdown: string = await readFile(filePath, 'utf8')
  const links: MarkdownLink[] = extractLinksFromMarkdown(markdown)
  for (const { url, line } of links) {
    console.log(`Checking link: ${url}`)
    await checkLink(url, filePath, line)
  }
}
/**
 * The main function for the action.
 * @returns {Promise<void>} Resolves when the action is complete.
 */
export async function run(): Promise<void> {
  try {
    const files: string[] = await readdir(docsPath)
    const markdownFiles: string[] = files.filter(file => file.endsWith('.md'))
    for (const file of markdownFiles) {
      console.log(docsPath)
      await checkLinksInMarkdown(path.join(docsPath, file))
    }
    if (process.exitCode !== 0) {
      console.log(`exit code----${process.exitCode}`)
      console.error('Some links failed the check.')
      process.exit(1) // Exit with error code if there were any link check failures
    } else {
      console.log('All links checked successfully.')
    }
  } catch (error) {
    // Fail the workflow run if an error occurs
    if (error instanceof Error) core.setFailed(error.message)
  }
}
