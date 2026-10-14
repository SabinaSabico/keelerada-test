export type TextToken = {
  /** Stable index in the flattened token stream (across paragraphs). */
  index: number
  type: 'word' | 'other'
  value: string
}

const MOISTE_RE = /\[mõiste:[^\]]*\]/gi

/** Estonian letters + digits; optional hyphenated compounds (e.g. oda-). */
const WORD_RE =
  /[a-zA-ZäöüõšžÄÖÜÕŠŽ0-9]+(?:-[a-zA-ZäöüõšžÄÖÜÕŠŽ0-9]+)*/g

/** Strip inline `[mõiste: …]` gloss markers from reading text. */
export function stripMoisteTags(text: string): string {
  return text.replace(MOISTE_RE, '')
}

export function splitParagraphs(text: string): string[] {
  return text
    .split(/\n\s*\n/)
    .map((p) => p.trim())
    .filter(Boolean)
}

function tokenizeSegment(text: string, startIndex: number): TextToken[] {
  const tokens: TextToken[] = []
  let last = 0
  let i = startIndex

  for (const match of text.matchAll(WORD_RE)) {
    const start = match.index ?? 0
    if (start > last) {
      tokens.push({ index: i++, type: 'other', value: text.slice(last, start) })
    }
    tokens.push({ index: i++, type: 'word', value: match[0] })
    last = start + match[0].length
  }
  if (last < text.length) {
    tokens.push({ index: i++, type: 'other', value: text.slice(last) })
  }
  return tokens
}

/**
 * Tokenize reading text for click-to-select: words are selectable;
 * whitespace and punctuation are not.
 */
export function tokenizeReadingText(rawText: string): {
  displayText: string
  paragraphs: TextToken[][]
  tokens: TextToken[]
} {
  const displayText = stripMoisteTags(rawText).replace(/\u00ad/g, '')
  const paragraphTexts = splitParagraphs(displayText)
  const paragraphs: TextToken[][] = []
  const tokens: TextToken[] = []
  let nextIndex = 0

  for (const para of paragraphTexts) {
    const paraTokens = tokenizeSegment(para, nextIndex)
    paragraphs.push(paraTokens)
    tokens.push(...paraTokens)
    nextIndex =
      paraTokens.length > 0
        ? paraTokens[paraTokens.length - 1].index + 1
        : nextIndex
  }

  return { displayText, paragraphs, tokens }
}

/** Unique surface forms from selected token indices (case-insensitive). */
export function uniqueWordsFromSelection(
  tokens: TextToken[],
  selectedIndices: ReadonlySet<number>,
): string[] {
  const seen = new Set<string>()
  const out: string[] = []
  for (const t of tokens) {
    if (t.type !== 'word' || !selectedIndices.has(t.index)) continue
    const key = t.value.toLowerCase()
    if (seen.has(key)) continue
    seen.add(key)
    out.push(t.value)
  }
  return out
}
