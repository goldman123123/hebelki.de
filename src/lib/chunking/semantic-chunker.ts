import { createLogger } from '@/lib/logger'

const log = createLogger('lib:chunking:semantic-chunker')
/**
 * Semantic Chunking for Text Content
 *
 * Breaks large text into meaningful chunks based on semantic boundaries
 * (sentences, paragraphs) rather than arbitrary character limits.
 *
 * Benefits:
 * - Better embedding quality (1 idea = 1 chunk)
 * - Improved search accuracy
 * - More context-aware retrieval
 */

export interface Chunk {
  content: string
  startIndex: number
  endIndex: number
  sentences: string[]
  metadata?: Record<string, unknown>
}

export interface SemanticChunkOptions {
  maxChunkSize?: number // Max characters per chunk (default: 1000)
  minChunkSize?: number // Min characters per chunk (default: 200)
  overlapSize?: number // Character overlap between chunks (default: 100)
  preserveParagraphs?: boolean // Try to keep paragraphs together (default: true)
}

/**
 * Split text into semantic chunks
 *
 * Strategy:
 * 1. Split by paragraphs first (preserves topic boundaries)
 * 2. Split paragraphs into sentences
 * 3. Group sentences into chunks respecting maxChunkSize
 * 4. Add overlap between chunks for context continuity
 */
export async function semanticChunk(
  text: string,
  options: SemanticChunkOptions = {}
): Promise<Chunk[]> {
  const {
    maxChunkSize = 1000,
    minChunkSize = 200,
    overlapSize = 100,
    preserveParagraphs = true,
  } = options

  // Clean the text
  const cleanedText = text
    .replace(/\r\n/g, '\n') // Normalize line endings
    .replace(/\n{3,}/g, '\n\n') // Collapse multiple newlines
    .trim()

  if (cleanedText.length === 0) {
    return []
  }

  // Split into paragraphs
  const paragraphs = cleanedText.split(/\n\n+/)

  const chunks: Chunk[] = []
  let currentChunkSentences: string[] = []
  let currentChunkSize = 0
  let globalCharIndex = 0

  for (const paragraph of paragraphs) {
    if (!paragraph.trim()) continue

    // Split paragraph into sentences
    const sentences = splitIntoSentences(paragraph)

    for (const sentence of sentences) {
      const sentenceSize = sentence.length

      // Check if adding this sentence would exceed max chunk size
      if (
        currentChunkSize + sentenceSize > maxChunkSize &&
        currentChunkSentences.length > 0
      ) {
        // Create chunk from accumulated sentences
        const chunk = createChunk(
          currentChunkSentences,
          globalCharIndex - currentChunkSize,
          globalCharIndex
        )

        // Only add if meets minimum size
        if (chunk.content.length >= minChunkSize) {
          chunks.push(chunk)
        }

        // Keep overlap sentences for context continuity
        const overlapSentences = getOverlapSentences(
          currentChunkSentences,
          overlapSize
        )

        currentChunkSentences = overlapSentences
        currentChunkSize = overlapSentences.join(' ').length
      }

      // Add sentence to current chunk
      currentChunkSentences.push(sentence.trim())
      currentChunkSize += sentenceSize
      globalCharIndex += sentenceSize
    }

    // If preserving paragraphs, add paragraph break
    if (preserveParagraphs && currentChunkSentences.length > 0) {
      currentChunkSize += 2 // Account for paragraph break
      globalCharIndex += 2
    }
  }

  // Add final chunk
  if (currentChunkSentences.length > 0) {
    const chunk = createChunk(
      currentChunkSentences,
      globalCharIndex - currentChunkSize,
      globalCharIndex
    )

    if (chunk.content.length >= minChunkSize) {
      chunks.push(chunk)
    }
  }

  log.info(`Split ${text.length} chars into ${chunks.length} chunks`)

  return chunks
}

/**
 * Split text into sentences using multiple delimiters
 */
function splitIntoSentences(text: string): string[] {
  // Split on sentence boundaries: . ! ? followed by space/newline
  // But preserve decimal numbers (e.g., 3.5) and abbreviations (e.g., Dr.)
  const sentenceRegex = /(?<=[.!?])\s+(?=[A-ZÄÖÜ])|(?<=[.!?])\n+/

  const sentences = text
    .split(sentenceRegex)
    .map(s => s.trim())
    .filter(s => s.length > 0)

  // Handle case where no sentence boundaries found
  if (sentences.length === 0 && text.trim()) {
    return [text.trim()]
  }

  return sentences
}

/**
 * Create a chunk from sentences
 */
function createChunk(
  sentences: string[],
  startIndex: number,
  endIndex: number
): Chunk {
  const content = sentences.join(' ')

  return {
    content,
    startIndex,
    endIndex,
    sentences: [...sentences],
  }
}

/**
 * Get sentences for overlap to maintain context between chunks
 */
function getOverlapSentences(sentences: string[], overlapSize: number): string[] {
  if (sentences.length === 0) return []

  let totalSize = 0
  const overlapSentences: string[] = []

  // Take sentences from the end until we reach overlap size
  for (let i = sentences.length - 1; i >= 0; i--) {
    const sentence = sentences[i]
    totalSize += sentence.length

    if (totalSize > overlapSize) break

    overlapSentences.unshift(sentence)
  }

  return overlapSentences
}

/**
 * Chunk markdown content (handles headings, lists, code blocks)
 */
export async function chunkMarkdown(
  markdown: string,
  options: SemanticChunkOptions = {}
): Promise<Chunk[]> {
  // Preserve markdown structure by treating headings as natural boundaries
  const sections = markdown.split(/(?=^#{1,6}\s)/m)

  const allChunks: Chunk[] = []
  let globalOffset = 0

  for (const section of sections) {
    if (!section.trim()) continue

    // Extract heading if present
    const headingMatch = section.match(/^(#{1,6}\s.+?)(\n|$)/)
    const heading = headingMatch ? headingMatch[1] : null
    const content = heading ? section.slice(heading.length).trim() : section

    // Chunk the section content
    const chunks = await semanticChunk(content, {
      ...options,
      preserveParagraphs: true,
    })

    // Add heading to each chunk's metadata
    for (const chunk of chunks) {
      allChunks.push({
        ...chunk,
        startIndex: chunk.startIndex + globalOffset,
        endIndex: chunk.endIndex + globalOffset,
        content: heading ? `${heading}\n\n${chunk.content}` : chunk.content,
        metadata: {
          ...chunk.metadata,
          heading: heading || undefined,
          hasHeading: !!heading,
        },
      })
    }

    globalOffset += section.length
  }

  return allChunks
}

/**
 * Process scraped page into chunks with metadata
 */
export interface ProcessedPageChunk extends Chunk {
  url: string
  pageTitle: string
  chunkIndex: number
  totalChunks: number
}

export async function processScrapedPageToChunks(
  url: string,
  pageTitle: string,
  markdown: string,
  options: SemanticChunkOptions = {}
): Promise<ProcessedPageChunk[]> {
  const chunks = await chunkMarkdown(markdown, options)

  return chunks.map((chunk, index) => ({
    ...chunk,
    url,
    pageTitle,
    chunkIndex: index,
    totalChunks: chunks.length,
  }))
}
