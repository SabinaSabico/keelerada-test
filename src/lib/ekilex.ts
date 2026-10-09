import { loadSettings } from '@/lib/storage'
import type { WordItem } from '@/lib/types'
import { createId } from '@/lib/utils'

type EkilexSearchResponse = {
  totalCount?: number
  words?: Array<{
    wordId?: number
    wordValue?: string
    wordValuePrese?: string
    lang?: string
    datasetCodes?: string[]
  }>
}

type EkilexDetailsResponse = {
  lexemes?: Array<{
    definitions?: Array<{
      value?: string
      valuePrese?: string
    }>
  }>
  word?: {
    wordId?: number
    wordValue?: string
  }
}

function ekilexBaseUrl(): string {
  // Local Vite proxy avoids CORS. On GitHub Pages we call the API directly
  // (may fail if Ekilex does not allow browser CORS).
  if (import.meta.env.DEV) return '/api/ekilex'
  return 'https://ekilex.ee/api'
}

async function ekilexFetch(path: string): Promise<Response> {
  const key = loadSettings().ekilexApiKey?.trim()
  if (!key) {
    throw new Error(
      'Ekilex API võti puudub. Lisa see seadetes (hammasratas), kui soovid sõnu kontrollida.',
    )
  }
  return fetch(`${ekilexBaseUrl()}${path}`, {
    headers: {
      Accept: 'application/json',
      'ekilex-api-key': key,
    },
  })
}

export async function searchEkilexWord(word: string): Promise<{
  found: boolean
  wordId?: number
  definition?: string
}> {
  const q = encodeURIComponent(word.trim())
  const res = await ekilexFetch(`/word/search/${q}?datasets=eki`)
  if (!res.ok) {
    throw new Error(`Ekilex otsing ebaõnnestus (HTTP ${res.status}).`)
  }
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
    const detailsRes = await ekilexFetch(
      `/word/details/${hit.wordId}`,
    )
    if (detailsRes.ok) {
      const details = (await detailsRes.json()) as EkilexDetailsResponse
      const defs =
        details.lexemes?.flatMap((lex) =>
          (lex.definitions || []).map(
            (d) => d.valuePrese || d.value || '',
          ),
        ) || []
      definition = defs.map((d) => d.replace(/<[^>]+>/g, '').trim()).find(Boolean)
    }
  } catch {
    /* definition optional */
  }

  return { found: true, wordId: hit.wordId, definition }
}

export type EkilexEnrichResult = {
  words: WordItem[]
  warning?: string
}

/**
 * Prefer words that exist in Ekilex; attach dictionary definitions when found.
 * If Ekilex is unavailable (no key / CORS), keep Gemini words and warn.
 */
export async function enrichWordsWithEkilex(
  words: WordItem[],
): Promise<EkilexEnrichResult> {
  const key = loadSettings().ekilexApiKey?.trim()
  if (!key) {
    return {
      words,
      warning:
        'Ekilex võti puudub — sõnu ei kontrollitud sõnastikus. Lisa võti seadetes või jätka Gemini definitsioonidega.',
    }
  }

  try {
    const enriched: WordItem[] = []
    for (const item of words) {
      try {
        const hit = await searchEkilexWord(item.word)
        enriched.push({
          ...item,
          id: item.id || createId(),
          ekilexFound: hit.found,
          ekilexWordId: hit.wordId,
          definition: hit.definition || item.definition,
          note: hit.found
            ? item.note
            : [item.note, 'Ei leitud Ekilexist'].filter(Boolean).join(' · '),
        })
      } catch {
        enriched.push({ ...item, ekilexFound: false })
      }
    }

    const found = enriched.filter((w) => w.ekilexFound)
    const missing = enriched.filter((w) => !w.ekilexFound)

    // Prefer dictionary hits, but keep others so the teacher can edit.
    const ordered = [...found, ...missing]
    const warning = missing.length
      ? `${missing.length} sõna ei leitud Ekilexist (märgitud). Eelista leitud sõnu või asenda need käsitsi.`
      : undefined

    return { words: ordered, warning }
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err)
    return {
      words,
      warning: `Ekilex päring ebaõnnestus (${message}). GitHub Pages’il võib takistuseks olla CORS — kohalikult aitab Vite proxy.`,
    }
  }
}
