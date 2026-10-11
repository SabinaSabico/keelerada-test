import { generateJson } from '@/lib/gemini'
import { PROMPTS } from '@/lib/prompts'
import { loadSettings } from '@/lib/storage'
import type { CurriculumInfo } from '@/lib/types'

export type CurriculumResult = {
  curriculum: CurriculumInfo
  warning?: string
}

/**
 * Ask Gemini to read the õppekava URL via URL Context (server-side fetch by Google).
 * The browser never downloads the page — no CORS.
 */
export async function fetchCurriculumInfo(input: {
  classLevel: string
  subject: string
  topic: string
}): Promise<CurriculumResult> {
  const settings = loadSettings()
  const url = settings.oppekavaUrl?.trim()

  const prompt = PROMPTS.curriculum({
    classLevel: input.classLevel,
    subject: input.subject,
    topic: input.topic,
    oppekavaUrl: url || undefined,
  })

  const data = await generateJson<{
    goals?: string[]
    learningOutcomes?: string[]
    keywords?: string[]
    notes?: string
  }>(prompt, url ? { urlContextUrls: [url] } : undefined)

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
  }
}
