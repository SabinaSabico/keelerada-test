import {
  DEFAULT_OPPEKAVA_URL,
  type AppSettings,
  type MaterialSet,
} from '@/lib/types'

const MATERIALS_KEY = 'keelerada.materials.v1'
const SETTINGS_KEY = 'keelerada.settings.v1'

/** Current stable Flash for new projects (Google Gemini API docs). */
export const DEFAULT_GEMINI_MODEL = 'gemini-3.8-flash'

const RETIRED_GEMINI_MODELS = new Set([
  'gemini-2.0-flash',
  'gemini-2.0-flash-lite',
  'gemini-2.0-flash-001',
  'gemini-1.5-flash',
  'gemini-1.5-flash-latest',
  'gemini-pro',
])

export const DEFAULT_SETTINGS: AppSettings = {
  geminiApiKey: '',
  ekilexApiKey: '',
  wordCount: 13,
  oppekavaUrl: DEFAULT_OPPEKAVA_URL,
  geminiModel: DEFAULT_GEMINI_MODEL,
}

function readJson<T>(key: string, fallback: T): T {
  try {
    const raw = localStorage.getItem(key)
    if (!raw) return fallback
    return JSON.parse(raw) as T
  } catch {
    return fallback
  }
}

export function loadSettings(): AppSettings {
  const stored = readJson<Partial<AppSettings>>(SETTINGS_KEY, {})
  const envGemini = import.meta.env.VITE_GEMINI_API_KEY as string | undefined
  const envEkilex = import.meta.env.VITE_EKILEX_API_KEY as string | undefined
  const storedModel = (stored.geminiModel || '').trim()
  const geminiModel =
    !storedModel || RETIRED_GEMINI_MODELS.has(storedModel)
      ? DEFAULT_GEMINI_MODEL
      : storedModel

  return {
    ...DEFAULT_SETTINGS,
    ...stored,
    geminiApiKey: stored.geminiApiKey || envGemini || '',
    ekilexApiKey: stored.ekilexApiKey || envEkilex || '',
    oppekavaUrl: stored.oppekavaUrl || DEFAULT_SETTINGS.oppekavaUrl,
    wordCount: stored.wordCount ?? DEFAULT_SETTINGS.wordCount,
    geminiModel,
  }
}

export function saveSettings(settings: AppSettings): void {
  localStorage.setItem(SETTINGS_KEY, JSON.stringify(settings))
}

export function loadMaterials(): MaterialSet[] {
  const items = readJson<MaterialSet[]>(MATERIALS_KEY, [])
  return items.sort(
    (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
  )
}

export function saveMaterials(items: MaterialSet[]): void {
  localStorage.setItem(MATERIALS_KEY, JSON.stringify(items))
}

export function upsertMaterial(item: MaterialSet): MaterialSet[] {
  const existing = loadMaterials().filter((m) => m.id !== item.id)
  const next = [item, ...existing]
  saveMaterials(next)
  return next
}

export function deleteMaterial(id: string): MaterialSet[] {
  const next = loadMaterials().filter((m) => m.id !== id)
  saveMaterials(next)
  return next
}

export function getMaterial(id: string): MaterialSet | undefined {
  return loadMaterials().find((m) => m.id === id)
}
