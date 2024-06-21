// types/markdown-link-extractor.d.ts
declare module 'markdown-link-extractor' {
  function markdownLinkExtractor(
    markdown: string,
    keepFragment?: boolean
  ): string[]
  export = markdownLinkExtractor
}
