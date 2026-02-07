/**
 * HTML to Clean Text Converter
 *
 * Converts HTML to clean, readable text while removing navigation,
 * footers, and other artifacts. Uses html-to-text library for
 * browser-like rendering of content.
 */

import { convert } from 'html-to-text'

/**
 * Convert HTML to clean, readable text
 * Removes navigation, footers, and renders content like a browser
 */
export function htmlToCleanText(html: string): string {
  const options = {
    // Preserve paragraph structure
    wordwrap: false as const,

    // Selectors to ignore (navigation, footer, etc.)
    selectors: [
      // Skip navigation
      { selector: 'nav', format: 'skip' },
      { selector: '[role="navigation"]', format: 'skip' },
      { selector: '.nav', format: 'skip' },
      { selector: '.navigation', format: 'skip' },
      { selector: '.menu', format: 'skip' },

      // Skip header/footer
      { selector: 'header', format: 'skip' },
      { selector: 'footer', format: 'skip' },
      { selector: '.header', format: 'skip' },
      { selector: '.footer', format: 'skip' },

      // Skip sidebar
      { selector: 'aside', format: 'skip' },
      { selector: '.sidebar', format: 'skip' },

      // Skip script/style
      { selector: 'script', format: 'skip' },
      { selector: 'style', format: 'skip' },
      { selector: 'noscript', format: 'skip' },

      // Skip advertisements
      { selector: '.ad', format: 'skip' },
      { selector: '.advertisement', format: 'skip' },
      { selector: '[id*="ad-"]', format: 'skip' },

      // Format headings with newlines
      {
        selector: 'h1',
        format: 'heading',
        options: {
          uppercase: false,
          leadingLineBreaks: 2,
          trailingLineBreaks: 1
        }
      },
      {
        selector: 'h2',
        format: 'heading',
        options: {
          uppercase: false,
          leadingLineBreaks: 2,
          trailingLineBreaks: 1
        }
      },
      {
        selector: 'h3',
        format: 'heading',
        options: {
          uppercase: false,
          leadingLineBreaks: 2,
          trailingLineBreaks: 1
        }
      },

      // Format paragraphs
      {
        selector: 'p',
        format: 'paragraph',
        options: {
          leadingLineBreaks: 1,
          trailingLineBreaks: 1
        }
      },

      // Format lists
      { selector: 'ul', format: 'unorderedList' },
      { selector: 'ol', format: 'orderedList' },

      // Links - keep text, skip URL
      { selector: 'a', options: { ignoreHref: true } },

      // Images - skip entirely (alt text not reliable)
      { selector: 'img', format: 'skip' },
    ] as any,

    // Limits
    limits: {
      maxInputLength: 1_000_000, // Max 1MB of HTML
    },

    // Whitespace handling
    preserveNewlines: false,
    trimEmptyLines: true,
  }

  let cleaned = convert(html, options)

  // Post-processing cleanup
  cleaned = cleaned
    .replace(/\n{3,}/g, '\n\n') // Collapse multiple newlines
    .replace(/[ \t]+/g, ' ') // Collapse multiple spaces
    .trim()

  return cleaned
}

/**
 * Try to extract only main content area from HTML
 * Uses common semantic HTML5 patterns
 */
export function extractMainContentFromHtml(html: string): string {
  // Try to find main content container
  const mainPatterns = [
    /<main[^>]*>([\s\S]*?)<\/main>/i,
    /<article[^>]*>([\s\S]*?)<\/article>/i,
    /<div[^>]*class="[^"]*content[^"]*"[^>]*>([\s\S]*?)<\/div>/i,
    /<div[^>]*id="[^"]*content[^"]*"[^>]*>([\s\S]*?)<\/div>/i,
  ]

  for (const pattern of mainPatterns) {
    const match = html.match(pattern)
    if (match && match[1].length > 200) {
      // Found substantial main content
      return htmlToCleanText(match[1])
    }
  }

  // No clear main content found, process entire HTML
  return htmlToCleanText(html)
}
