import * as fs from 'fs'
import * as path from 'path'
import axios from 'axios'
import markdownLinkExtractor from 'markdown-link-extractor'
import * as core from '@actions/core'

const readdir = fs.promises.readdir
const readFile = fs.promises.readFile

const docsPath: string = process.env.DOCS_PATH || './docs'
const jwtToken: string = process.env.JWT_TOKEN || ''

const checkLink = async (
  url: string,
  filePath: string,
  line: number
): Promise<void> => {
  try {
    const config = {
      headers: {} as { [header: string]: string }
    }

    if (jwtToken && url.startsWith('https://baseplate.legogroup.io/')) {
      console.log(`Checking ${url} with JWT token`)
      config.headers['Authorization'] = `Bearer ${jwtToken}`
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

const checkLinksInMarkdown = async (filePath: string): Promise<void> => {
  const markdown: string = await readFile(filePath, 'utf8')
  const lines = markdown.split(/\r?\n/)
  for (const [index, line] of lines.entries()) {
    const extractedUrls = markdownLinkExtractor(line, true)
    for (const url of extractedUrls) {
      // Use for...of here as well
      await checkLink(url, filePath, index + 1)
    }
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
