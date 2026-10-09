import { generateJson } from '@/lib/gemini'
import { PROMPTS } from '@/lib/prompts'
import { loadSettings } from '@/lib/storage'
import type { CurriculumInfo } from '@/lib/types'

export type CurriculumResult = {
  curriculum: CurriculumInfo
  warning?: string
}

async function tryFetchPageText(url: string): Promise<{
  text?: string
  warning?: string
}> {
  if (!url.trim()) return {}
  try {
    const res = await fetch(url, { method: 'GET' })
    if (!res.ok) {
      return {
        warning: `Õppekava lehte ei õnnestunud laadida (HTTP ${res.status}). Kasutan URL-i + klassi/aine/teema + Gemini teadmisi.`,
      }
    }
    const contentType = res.headers.get('content-type') || ''
    const raw = await res.text()
    const text = contentType.includes('html')
      ? raw
          .replace(/<script[\s\S]*?<\/script>/gi, ' ')
          .replace(/<style[\s\S]*?<\/style>/gi, ' ')
          .replace(/<[^>]+>/g, ' ')
          .replace(/\s+/g, ' ')
          .trim()
      : raw.trim()
    if (!text) {
      return {
        warning:
          'Õppekava leht oli tühi. Kasutan URL-i + klassi/aine/teema + Gemini teadmisi.',
      }
    }
    return { text }
  } catch {
    return {
      warning:
        'Õppekava URL-i ei saa brauserist lugeda (tõenäoliselt CORS). Gemini saab URL-i ja metaandmed.',
    }
  }
}

export async function fetchCurriculumInfo(input: {
  classLevel: string
  subject: string
  topic: string
}): Promise<CurriculumResult> {
  const settings = loadSettings()
  const url = settings.oppekavaUrl?.trim()
  const fetched = url ? await tryFetchPageText(url) : {}

  const prompt = PROMPTS.curriculum({
    classLevel: input.classLevel,
    subject: input.subject,
    topic: input.topic,
    oppekavaUrl: url || undefined,
    fetchedPageText: fetched.text,
  })

  const data = await generateJson<{
    goals?: string[]
    learningOutcomes?: string[]
    keywords?: string[]
    notes?: string
  }>(prompt)

  return {
    curriculum: {
      goals: Array.isArray(data.goals) ? data.goals.filter(Boolean) : [],
      learningOutcomes: Array.isArray(data.learningOutcomes)
        ? data.learningOutcomes.filter(Boolean)
        : [],
      keywords: Array.isArray(data.keywords)
        ? data.keywords.filter(Boolean)
        : [],
      notes: data.notes?.trim() || undefined,
      raw: JSON.stringify(data),
    },
    warning: fetched.warning,
  }
}
