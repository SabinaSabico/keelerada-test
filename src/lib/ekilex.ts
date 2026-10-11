import { loadSettings } from '@/lib/storage'
import type { WordItem } from '@/lib/types'
import { createId } from '@/lib/utils'

/**
 * Dictionary enrichment for the browser PoC.
 *
 * Official Ekilex API (`ekilex.ee` + `ekilex-api-key` header) fails in the
 * browser: CORS preflight does not allow that custom header. Local Vite can
 * proxy it, but GitHub Pages cannot.
 *
 * We therefore look up words via SONAPI (https://api.sonapi.ee), a public
 * read API over EKI / Sõnaveeb dictionary data, which allows browser CORS
 * without an API key.
 *
 * @see https://api.sonapi.ee/v2/{word}
 * @see https://ekilex.ee/swagger-ui/index.html
 */

type SonapiMeaning = {
  definition?: string
}

type SonapiSearchItem = {
  meanings?: SonapiMeaning[]
}

type SonapiResponse = {
  requestedWord?: string
  estonianWord?: string
  searchResult?: SonapiSearchItem[]
  translations?: unknown[]
}

type EkilexSearchResponse = {
  totalCount?: number
  words?: Array<{
    wordId?: number
    wordValue?: string
    wordValuePrese?: string
  }>
}

type EkilexDetailsResponse = {
  lexemes?: Array<{
    definitions?: Array<{
      value?: string
      valuePrese?: string
    }>
  }>
}

function ekilexBaseUrl(): string {
  if (import.meta.env.DEV) return '/api/ekilex'
  return 'https://ekilex.ee/api'
}

async function searchSonapi(word: string): Promise<{
  found: boolean
  definition?: string
}> {
  const q = encodeURIComponent(word.trim())
  const res = await fetch(`https://api.sonapi.ee/v2/${q}`, {
    headers: { Accept: 'application/json' },
  })
  if (res.status === 404) return { found: false }
  if (!res.ok) {
    throw new Error(`SONAPI HTTP ${res.status}`)
  }
  const data = (await res.json()) as SonapiResponse
  const results = Array.isArray(data.searchResult) ? data.searchResult : []
  if (!results.length) {
    // Some lemmas return empty searchResult but still resolve the word.
    const softFound =
      Boolean(data.estonianWord) &&
      data.estonianWord!.toLowerCase() === word.trim().toLowerCase() &&
      Array.isArray(data.translations) &&
      data.translations.length > 0
    return { found: softFound }
  }

  const definition = results
    .flatMap((r) => r.meanings || [])
    .map((m) => (m.definition || '').replace(/<[^>]+>/g, '').trim())
    .find(Boolean)

  return { found: true, definition }
}

async function searchOfficialEkilex(word: string): Promise<{
  found: boolean
  wordId?: number
  definition?: string
} | null> {
  const key = loadSettings().ekilexApiKey?.trim()
  if (!key) return null

  // Only attempt official Ekilex where the Vite proxy can avoid CORS (local).
  if (!import.meta.env.DEV) return null

  try {
    const q = encodeURIComponent(word.trim())
    const res = await fetch(
      `${ekilexBaseUrl()}/word/search/${q}?datasets=eki`,
      {
        headers: {
          Accept: 'application/json',
          'ekilex-api-key': key,
        },
      },
    )
    if (!res.ok) return { found: false }
    const data = (await res.json()) as EkilexSearchResponse
    const hit =
      data.words?.find(
        (w) =>
          (w.wordValue || '').toLowerCase() === word.trim().toLowerCase() ||
          (w.wordValuePrese || '').toLowerCase() === word.trim().toLowerCase(),
      ) || data.words?.[0]
    if (!hit?.wordId) return { found: false }

    let definition: string | undefined
    try {
      const detailsRes = await fetch(
        `${ekilexBaseUrl()}/word/details/${hit.wordId}`,
        {
          headers: {
            Accept: 'application/json',
            'ekilex-api-key': key,
          },
        },
      )
      if (detailsRes.ok) {
        const details = (await detailsRes.json()) as EkilexDetailsResponse
        const defs =
          details.lexemes?.flatMap((lex) =>
            (lex.definitions || []).map((d) => d.valuePrese || d.value || ''),
          ) || []
        definition = defs
          .map((d) => d.replace(/<[^>]+>/g, '').trim())
          .find(Boolean)
      }
    } catch {
      /* optional */
    }
    return { found: true, wordId: hit.wordId, definition }
  } catch {
    return null
  }
}

export async function searchDictionaryWord(word: string): Promise<{
  found: boolean
  wordId?: number
  definition?: string
  source: 'sonapi' | 'ekilex'
}> {
  const ekilex = await searchOfficialEkilex(word)
  if (ekilex?.found) {
    return { ...ekilex, source: 'ekilex' }
  }

  const sonapi = await searchSonapi(word)
  return { ...sonapi, source: 'sonapi' }
}

export type EkilexEnrichResult = {
  words: WordItem[]
  warning?: string
}

/**
 * Prefer words that exist in the Estonian dictionary; attach definitions.
 */
export async function enrichWordsWithEkilex(
  words: WordItem[],
): Promise<EkilexEnrichResult> {
  const enriched: WordItem[] = []
  let hardFailures = 0

  for (const item of words) {
    try {
      const hit = await searchDictionaryWord(item.word)
      enriched.push({
        ...item,
        id: item.id || createId(),
        ekilexFound: hit.found,
        ekilexWordId: hit.wordId,
        definition: hit.definition || item.definition,
        definitionSource: hit.definition
          ? hit.source
          : item.definitionSource,
        note: hit.found
          ? item.note
          : [item.note, 'Ei leitud sõnastikust'].filter(Boolean).join(' · '),
      })
    } catch {
      hardFailures += 1
      enriched.push({
        ...item,
        id: item.id || createId(),
        ekilexFound: false,
      })
    }
  }

  if (hardFailures === words.length && words.length > 0) {
    return {
      words,
      warning:
        'Sõnastiku kontroll ebaõnnestus (võrgu-/teenuse viga). Jätkan Gemini sõnadega ilma sõnastikukontrollita.',
    }
  }

  const found = enriched.filter((w) => w.ekilexFound)
  const missing = enriched.filter((w) => !w.ekilexFound)
  const ordered = [...found, ...missing]

  const warning = missing.length
    ? `${missing.length} sõna ei leitud EKI sõnastikust (SONAPI/Sõnaveeb). Eelista leitud sõnu või asenda need käsitsi.`
    : undefined

  return { words: ordered, warning }
}
