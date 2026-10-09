import { GoogleGenerativeAI } from '@google/generative-ai'
import { DEFAULT_GEMINI_MODEL, loadSettings } from '@/lib/storage'

export class GeminiError extends Error {
  constructor(message: string) {
    super(message)
    this.name = 'GeminiError'
  }
}

/**
 * Free/stable Flash models to try when the preferred one is overloaded or gone.
 * Order: settings preference first, then these fallbacks (deduped at runtime).
 * @see https://ai.google.dev/gemini-api/docs/models
 */
export const GEMINI_FALLBACK_MODELS = [
  'gemini-3.8-flash',
  'gemini-3.5-flash-lite',
  'gemini-3.5-flash',
  'gemini-3.6-flash',
  'gemini-flash-latest',
] as const

function getApiKey(): string {
  const settings = loadSettings()
  const key = settings.geminiApiKey?.trim()
  if (!key) {
    throw new GeminiError(
      'Gemini API võti puudub. Ava seaded (hammasratas) ja sisesta võti.',
    )
  }
  return key
}

function stripCodeFences(text: string): string {
  const trimmed = text.trim()
  const fenced = trimmed.match(/^```(?:json)?\s*([\s\S]*?)\s*```$/i)
  return fenced ? fenced[1].trim() : trimmed
}

export function parseJsonFromModel<T>(text: string): T {
  const cleaned = stripCodeFences(text)
  try {
    return JSON.parse(cleaned) as T
  } catch {
    const start = cleaned.indexOf('{')
    const end = cleaned.lastIndexOf('}')
    if (start >= 0 && end > start) {
      try {
        return JSON.parse(cleaned.slice(start, end + 1)) as T
      } catch {
        /* fall through */
      }
    }
    throw new GeminiError(
      'AI vastust ei õnnestunud JSON-ina lugeda. Proovi uuesti.',
    )
  }
}

function isRetryableModelError(message: string): boolean {
  return (
    /\b503\b|UNAVAILABLE|high demand|temporarily|try again later/i.test(
      message,
    ) ||
    /\b404\b|NOT_FOUND|no longer available|is not found/i.test(message) ||
    /\b429\b|RESOURCE_EXHAUSTED|rate.?limit/i.test(message)
  )
}

function mapGeminiError(message: string): GeminiError {
  if (/api key|API_KEY|PERMISSION_DENIED|403|401/i.test(message)) {
    return new GeminiError(
      'Gemini API võti on vigane või puudub õigus. Kontrolli seadeid.',
    )
  }
  if (
    /\b429\b|RESOURCE_EXHAUSTED|quota exceeded|rate.?limit|too many requests/i.test(
      message,
    )
  ) {
    return new GeminiError(
      'Gemini limiit on täis või päringuid on liiga palju. Proovi hiljem uuesti.',
    )
  }
  if (/\b503\b|UNAVAILABLE|high demand/i.test(message)) {
    return new GeminiError(
      'Gemini on hetkel ülekoormatud. Proovi mõne hetke pärast uuesti.',
    )
  }
  if (
    /\b404\b|NOT_FOUND|no longer available|is not found|not supported/i.test(
      message,
    )
  ) {
    return new GeminiError(
      `Gemini mudel ei ole saadaval. Vaikimisi mudel on ${DEFAULT_GEMINI_MODEL}. Ava seaded ja uuenda mudeli nime.`,
    )
  }
  return new GeminiError(`Gemini päring ebaõnnestus: ${message}`)
}

function modelQueue(): string[] {
  const preferred = loadSettings().geminiModel?.trim() || DEFAULT_GEMINI_MODEL
  const seen = new Set<string>()
  const queue: string[] = []
  for (const name of [preferred, ...GEMINI_FALLBACK_MODELS]) {
    if (!name || seen.has(name)) continue
    seen.add(name)
    queue.push(name)
  }
  return queue
}

async function generateWithModel(
  apiKey: string,
  modelName: string,
  prompt: string,
): Promise<string> {
  const genAI = new GoogleGenerativeAI(apiKey)
  const model = genAI.getGenerativeModel({
    model: modelName,
    generationConfig: {
      temperature: 0.4,
      responseMimeType: 'application/json',
    },
  })
  const result = await model.generateContent(prompt)
  const text = result.response.text()
  if (!text?.trim()) {
    throw new GeminiError('AI tagastas tühja vastuse.')
  }
  return text
}

export async function generateJson<T>(prompt: string): Promise<T> {
  const apiKey = getApiKey()
  const models = modelQueue()
  let lastMessage = ''

  for (let i = 0; i < models.length; i += 1) {
    const modelName = models[i]
    try {
      const text = await generateWithModel(apiKey, modelName, prompt)
      return parseJsonFromModel<T>(text)
    } catch (err) {
      if (err instanceof GeminiError && err.message.includes('JSON')) {
        throw err
      }
      const message = err instanceof Error ? err.message : String(err)
      lastMessage = message
      const canRetry =
        i < models.length - 1 && isRetryableModelError(message)
      if (!canRetry) {
        if (err instanceof GeminiError) throw err
        throw mapGeminiError(message)
      }
      // try next fallback model
    }
  }

  throw mapGeminiError(lastMessage || 'Kõik Gemini mudelid ebaõnnestusid.')
}
