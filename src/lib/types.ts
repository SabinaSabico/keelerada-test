export type TeacherProfile = {
  id: string
  name: string
}

export type CurriculumInfo = {
  goals: string[]
  keywords: string[]
  learningOutcomes?: string[]
  notes?: string
  raw?: string
}

export type WordItem = {
  id: string
  word: string
  note?: string
  definition?: string
  ekilexFound?: boolean
  ekilexWordId?: number
}

export type MatchingPair = {
  term_id: number
  definition: string
  term?: string
}

export type FillBlankQuestion = {
  sentence: string
  options: string[]
  correct_answer: string
  term_id?: number
}

export type ComprehensionQuestion = {
  question: string
  options: string[]
  correct_answer: string
  related_term_ids?: number[]
}

export type MatchingExercise = {
  id: string
  type: 'matching'
  title: string
  pairs: MatchingPair[]
}

export type FillBlankExercise = {
  id: string
  type: 'fill_blank'
  title: string
  questions: FillBlankQuestion[]
}

export type ComprehensionExercise = {
  id: string
  type: 'comprehension'
  title: string
  questions: ComprehensionQuestion[]
}

/** Legacy fallback shape from earlier PoC builds. */
export type LegacyExercise = {
  id: string
  type: string
  title: string
  body: string
  answer?: string
}

export type Exercise =
  | MatchingExercise
  | FillBlankExercise
  | ComprehensionExercise
  | LegacyExercise

export type MaterialSet = {
  id: string
  createdAt: string
  teacherId: string
  fileName: string
  classLevel: string
  subject: string
  topic: string
  sourceText: string
  curriculum: CurriculumInfo
  words: WordItem[]
  exercises: Exercise[]
}

export type AppSettings = {
  geminiApiKey: string
  ekilexApiKey: string
  wordCount: number
  oppekavaUrl: string
  geminiModel: string
}

export const DEFAULT_OPPEKAVA_URL =
  'https://projektid.edu.ee/spaces/OKMV/pages/211453474/P%C3%B5hikool'
