import * as core from '@actions/core'
import * as fs from 'fs'
import * as path from 'path'
import axios from 'axios'
import markdownLinkExtractor from 'markdown-link-extractor'
const readdir = fs.promises.readdir
const readFile = fs.promises.readFile

const docsPath: string = process.env.DOCS_PATH || './docs'
const jwtToken: string = process.env.JWT_TOKEN || ''

const checkLink = async (url: string): Promise<void> => {
  try {
   if(jwtToken !== '') { 
    const response = await axios.get(url, config)
    if (response.status === 404) {
      throw new Error(`Dead link found: ${url}`)
    }
  }console.error(`JWT not provided`)
  } catch (error) {
    console.error(`Error checking link ${url}: ${(error as Error).message}`)
    throw error
  }
}

const checkLinksInMarkdown = async (filePath: string): Promise<void> => {
  const markdown: string = await readFile(filePath, 'utf8')
  const links: string[] = markdownLinkExtractor(markdown)
  await Promise.all(links.map(checkLink))
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
    console.log('All links checked successfully.')
  } catch (error) {
    // Fail the workflow run if an error occurs
    if (error instanceof Error) core.setFailed(error.message)
  }
}
