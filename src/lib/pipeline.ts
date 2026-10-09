import { enrichWordsWithEkilex } from '@/lib/ekilex'
import { fetchCurriculumInfo } from '@/lib/curriculum'
import { generateJson } from '@/lib/gemini'
import { PROMPTS } from '@/lib/prompts'
import type {
  ComprehensionExercise,
  CurriculumInfo,
  Exercise,
  FillBlankExercise,
  MatchingExercise,
  WordItem,
} from '@/lib/types'
import { createId } from '@/lib/utils'

export async function runCurriculumStep(input: {
  classLevel: string
  subject: string
  topic: string
}) {
  return fetchCurriculumInfo(input)
}

/** Õppekava (background) + sõnade loomine ühes kasutaja sammus. */
export async function runCurriculumThenWords(
  input: {
    classLevel: string
    subject: string
    topic: string
    wordCount: number
    sourceText: string
  },
  onStatus?: (status: string) => void,
): Promise<{
  curriculum: CurriculumInfo
  words: WordItem[]
  warning?: string
}> {
  onStatus?.('Kontrollin õppekava…')
  const curriculumResult = await runCurriculumStep({
    classLevel: input.classLevel,
    subject: input.subject,
    topic: input.topic,
  })

  onStatus?.('Loon sõnu…')
  const wordsResult = await runWordsStep({
    ...input,
    curriculum: curriculumResult.curriculum,
  })

  const warnings = [curriculumResult.warning, wordsResult.warning].filter(
    Boolean,
  ) as string[]

  return {
    curriculum: curriculumResult.curriculum,
    words: wordsResult.words,
    warning: warnings.length ? warnings.join(' ') : undefined,
  }
}

export async function runWordsStep(input: {
  classLevel: string
  subject: string
  topic: string
  wordCount: number
  sourceText: string
  curriculum: CurriculumInfo
}): Promise<{ words: WordItem[]; warning?: string }> {
  const data = await generateJson<{
    words?: Array<{ word?: string; note?: string }>
  }>(PROMPTS.extractWords(input))

  const words = (data.words || [])
    .map((w) => ({
      id: createId(),
      word: (w.word || '').trim(),
      note: w.note?.trim() || undefined,
    }))
    .filter((w) => w.word)

  if (!words.length) {
    throw new Error('AI ei tagastanud ühtegi sõna. Proovi uuesti.')
  }

  return enrichWordsWithEkilex(words)
}

type KeeleradaPayload = {
  grade?: string | number
  subject?: string
  terms?: Array<{ id?: number; term?: string; definition?: string }>
  exercises?: Array<{
    type?: string
    title?: string
    pairs?: Array<{ term_id?: number; definition?: string }>
    questions?: Array<{
      sentence?: string
      question?: string
      options?: string[]
      correct_answer?: string
      term_id?: number
      related_term_ids?: number[]
    }>
  }>
}

export async function runExercisesStep(input: {
  classLevel: string
  subject: string
  topic: string
  sourceText: string
  words: WordItem[]
  curriculum: CurriculumInfo
}): Promise<{ words: WordItem[]; exercises: Exercise[] }> {
  const data = await generateJson<KeeleradaPayload>(
    PROMPTS.createExercises(input),
  )

  const termById = new Map<number, { term: string; definition: string }>()
  const updatedWords: WordItem[] = []

  ;(data.terms || []).forEach((t, index) => {
    const id = typeof t.id === 'number' ? t.id : index + 1
    const term = (t.term || '').trim()
    const definition = (t.definition || '').trim()
    if (!term) return
    termById.set(id, { term, definition })
    const existing = input.words.find(
      (w) => w.word.toLowerCase() === term.toLowerCase(),
    )
    updatedWords.push({
      id: existing?.id || createId(),
      word: term,
      definition: definition || existing?.definition,
      note: existing?.note,
      ekilexFound: existing?.ekilexFound,
      ekilexWordId: existing?.ekilexWordId,
    })
  })

  const words = updatedWords.length ? updatedWords : input.words

  const exercises: Exercise[] = []
  for (const ex of data.exercises || []) {
    const type = (ex.type || '').trim()
    const title = (ex.title || 'Ülesanne').trim()
    if (type === 'matching') {
      const item: MatchingExercise = {
        id: createId(),
        type: 'matching',
        title,
        pairs: (ex.pairs || [])
          .map((p) => ({
            term_id: p.term_id || 0,
            definition: (p.definition || '').trim(),
            term: termById.get(p.term_id || 0)?.term,
          }))
          .filter((p) => p.definition && p.term_id),
      }
      if (item.pairs.length) exercises.push(item)
      continue
    }
    if (type === 'fill_blank') {
      const item: FillBlankExercise = {
        id: createId(),
        type: 'fill_blank',
        title,
        questions: (ex.questions || [])
          .map((q) => ({
            sentence: (q.sentence || '').trim(),
            options: (q.options || []).map((o) => String(o)),
            correct_answer: (q.correct_answer || '').trim(),
            term_id: q.term_id,
          }))
          .filter((q) => q.sentence && q.options.length && q.correct_answer),
      }
      if (item.questions.length) exercises.push(item)
      continue
    }
    if (type === 'comprehension') {
      const item: ComprehensionExercise = {
        id: createId(),
        type: 'comprehension',
        title,
        questions: (ex.questions || [])
          .map((q) => ({
            question: (q.question || '').trim(),
            options: (q.options || []).map((o) => String(o)),
            correct_answer: (q.correct_answer || '').trim(),
            related_term_ids: q.related_term_ids,
          }))
          .filter((q) => q.question && q.options.length && q.correct_answer),
      }
      if (item.questions.length) exercises.push(item)
    }
  }

  if (!exercises.length) {
    throw new Error('AI ei tagastanud ühtegi ülesannet. Proovi uuesti.')
  }

  return { words, exercises }
}
