import * as core from '@actions/core'
import * as fs from 'fs'
import * as path from 'path'
import axios from 'axios'

const readdir = fs.promises.readdir
const readFile = fs.promises.readFile
const useToken: boolean = process.env.INPUT_USETOKEN === 'true';
const docsPath: string = process.env.DOCS_PATH || './docs'
const jwtToken: string = process.env.JWT_TOKEN || ''

const markdownLinkRegex = /$$([^$$]+)\]$(http[s]?:\/\/[^)]+)$/g
const emptyImageLinkRegex = /!$$$$$(http[s]?:\/\/[^)]+)$/g

const extractLinksFromMarkdown = (markdown: string): string[] => {
  const links: string[] = []
  let match: RegExpExecArray | null

  while ((match = markdownLinkRegex.exec(markdown)) !== null) {
    links.push(match[2]) // match[2] contains the URL
  }

  return links
}

const checkLink = async (url: string): Promise<void> => {
  try {
    const config: any = {};
    // Apply the JWT token in the header if useToken is true
    if (useToken && jwtToken) {
      config.headers = { Authorization: `Bearer ${jwtToken}` };
    }
    const response = await axios.head(url, config);
    if (response.status === 200) {
      console.log(`✅ ${url}`);
    } else {
      console.error(`❌ ${url} (Status: ${response.status})`);
      process.exitCode = 1;
    }
  } catch (error) {
    console.error(`❌ ${url} (Error: ${(error as Error).message})`);
    process.exitCode = 1;
  }
};

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

  // Extract and check regular links
  const links: string[] = extractLinksFromMarkdown(markdown)
  for (const link of links) {
    await checkLink(link)
  }

  // Extract and report empty image links
  const emptyImageLinks: string[] = extractEmptyImageLinksFromMarkdown(markdown)
  if (emptyImageLinks.length > 0) {
    console.error(`Empty image links found in ${filePath}:`)
    for (const link of emptyImageLinks) {
      console.error(link)
    }
    process.exit(1) // Exit with an error code if empty image links are found
  }
}
/**
 * The main function for the action.
 * @returns {Promise<void>} Resolves when the action is complete.
 */
export async function run(): Promise<void> {
  try {
    const files: string[] = await readdir(docsPath);
    const markdownFiles: string[] = files.filter((file) => file.endsWith('.md'));
    for (const file of markdownFiles) {
      await checkLinksInMarkdown(path.join(docsPath, file));
    }
    if (process.exitCode !== 0) {
      console.error('Some links failed the check.');
      process.exit(1); // Exit with error code if there were any link check failures
    } else {
      console.log('All links checked successfully.');
    }
  } catch (error) {
    // Fail the workflow run if an error occurs
    if (error instanceof Error) core.setFailed(error.message)
  }
}
