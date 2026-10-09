import { useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Loader2, Plus, Trash2, Upload } from 'lucide-react'
import { InteractiveExercises } from '@/components/InteractiveExercises'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { GeminiError } from '@/lib/gemini'
import { isAllowedFile, parseUploadedFile } from '@/lib/parseFile'
import {
  runCurriculumThenWords,
  runExercisesStep,
} from '@/lib/pipeline'
import { loadSettings, upsertMaterial } from '@/lib/storage'
import { MOCK_TEACHER } from '@/lib/teacher'
import type {
  CurriculumInfo,
  Exercise,
  MaterialSet,
  WordItem,
} from '@/lib/types'
import { createId } from '@/lib/utils'

type Step = 1 | 2 | 3 | 4

const STEP_LABELS: Record<Step, string> = {
  1: 'Tekst',
  2: 'Sõnad',
  3: 'Ülesanded',
  4: 'Salvestatud',
}

const emptyCurriculum = (): CurriculumInfo => ({
  goals: [],
  learningOutcomes: [],
  keywords: [],
  notes: '',
})

export function NewMaterialPage() {
  const navigate = useNavigate()
  const defaults = useMemo(() => loadSettings(), [])

  const [step, setStep] = useState<Step>(1)
  const [busy, setBusy] = useState(false)
  const [status, setStatus] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [warning, setWarning] = useState<string | null>(null)

  const [fileName, setFileName] = useState('')
  const [classLevel, setClassLevel] = useState('')
  const [subject, setSubject] = useState('')
  const [topic, setTopic] = useState('')
  const [wordCount, setWordCount] = useState(defaults.wordCount)
  const [sourceText, setSourceText] = useState('')
  const [curriculum, setCurriculum] = useState<CurriculumInfo>(emptyCurriculum())
  const [words, setWords] = useState<WordItem[]>([])
  const [exercises, setExercises] = useState<Exercise[]>([])
  const [savedId, setSavedId] = useState<string | null>(null)

  function clearMessages() {
    setError(null)
    setWarning(null)
    setStatus(null)
  }

  async function handleFile(file: File | null) {
    clearMessages()
    if (!file) return
    if (!isAllowedFile(file)) {
      setError('Lubatud on ainult PDF, TXT või DOCX failid.')
      return
    }
    setBusy(true)
    try {
      const text = await parseUploadedFile(file)
      setFileName(file.name)
      setSourceText(text)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Faili lugemine ebaõnnestus.')
      setFileName('')
      setSourceText('')
    } finally {
      setBusy(false)
    }
  }

  function canCreateWords() {
    return Boolean(
      sourceText.trim() &&
        classLevel.trim() &&
        subject.trim() &&
        topic.trim(),
    )
  }

  async function createWords() {
    clearMessages()
    if (!canCreateWords()) {
      setError('Lisa tekst ning klass, aine ja teema.')
      return
    }
    if (!fileName) setFileName('kleebitud-tekst.txt')
    setBusy(true)
    try {
      const result = await runCurriculumThenWords(
        {
          classLevel: classLevel.trim(),
          subject: subject.trim(),
          topic: topic.trim(),
          wordCount,
          sourceText,
        },
        setStatus,
      )
      setCurriculum(result.curriculum)
      setWords(result.words)
      if (result.warning) setWarning(result.warning)
      setStep(2)
    } catch (err) {
      setError(
        err instanceof GeminiError || err instanceof Error
          ? err.message
          : 'Sõnade loomine ebaõnnestus.',
      )
    } finally {
      setBusy(false)
      setStatus(null)
    }
  }

  async function generateExercises() {
    clearMessages()
    if (!words.some((w) => w.word.trim())) {
      setError('Lisa vähemalt üks sõna.')
      return
    }
    setBusy(true)
    setStatus('Loon ülesandeid…')
    try {
      const result = await runExercisesStep({
        classLevel: classLevel.trim(),
        subject: subject.trim(),
        topic: topic.trim(),
        sourceText,
        words: words.filter((w) => w.word.trim()),
        curriculum,
      })
      setWords(result.words)
      setExercises(result.exercises)
      setStep(3)
    } catch (err) {
      setError(
        err instanceof GeminiError || err instanceof Error
          ? err.message
          : 'Ülesannete genereerimine ebaõnnestus.',
      )
    } finally {
      setBusy(false)
      setStatus(null)
    }
  }

  function saveMaterial() {
    clearMessages()
    const item: MaterialSet = {
      id: createId(),
      createdAt: new Date().toISOString(),
      teacherId: MOCK_TEACHER.id,
      fileName: fileName || 'kleebitud-tekst.txt',
      classLevel: classLevel.trim(),
      subject: subject.trim(),
      topic: topic.trim(),
      sourceText,
      curriculum,
      words,
      exercises,
    }
    upsertMaterial(item)
    setSavedId(item.id)
    setStep(4)
  }

  function updateWord(id: string, patch: Partial<WordItem>) {
    setWords((list) =>
      list.map((w) => (w.id === id ? { ...w, ...patch } : w)),
    )
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold tracking-tight">Uus materjal</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          Lisa tekst, loo sõnad (õppekava kontroll käib taustal) ja proovi
          harjutusi.
        </p>
      </div>

      <div className="flex flex-wrap gap-2">
        {([1, 2, 3, 4] as Step[]).map((s) => (
          <Badge
            key={s}
            variant={s === step ? 'default' : 'secondary'}
            className={s === step ? 'bg-primary' : undefined}
          >
            {s}. {STEP_LABELS[s]}
          </Badge>
        ))}
      </div>

      {error && (
        <div className="rounded-xl border border-destructive/30 bg-destructive/5 px-4 py-3 text-sm text-destructive">
          {error}
        </div>
      )}
      {warning && (
        <div className="rounded-xl border border-brand-orange/30 bg-orange-50 px-4 py-3 text-sm text-foreground">
          {warning}
        </div>
      )}
      {busy && status && (
        <div className="flex items-center gap-2 rounded-xl border border-border bg-card px-4 py-3 text-sm text-muted-foreground">
          <Loader2 className="h-4 w-4 animate-spin" />
          {status}
        </div>
      )}

      {step === 1 && (
        <Card>
          <CardHeader>
            <CardTitle>Tekst ja metaandmed</CardTitle>
            <CardDescription>
              Kleebi või laadi tekst. „Loo sõnad” kontrollib õppekava taustal ja
              koostab seejärel sõnade nimekirja.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <label className="flex cursor-pointer flex-col items-center justify-center gap-2 rounded-2xl border border-dashed border-border bg-secondary/50 px-6 py-8 text-center hover:bg-secondary">
              <Upload className="h-6 w-6 text-muted-foreground" />
              <span className="text-sm font-medium">
                {fileName || 'Vali fail (pdf, txt, docx) — või kleebi allpool'}
              </span>
              <input
                type="file"
                accept=".pdf,.txt,.docx,application/pdf,text/plain,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
                className="hidden"
                onChange={(e) => handleFile(e.target.files?.[0] || null)}
              />
            </label>

            <div className="space-y-2">
              <Label htmlFor="pasteText">Tekst</Label>
              <Textarea
                id="pasteText"
                className="min-h-[200px]"
                placeholder="Kleebi õppetekst..."
                value={sourceText}
                onChange={(e) => {
                  setSourceText(e.target.value)
                  if (!fileName) setFileName('kleebitud-tekst.txt')
                }}
              />
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="classLevel">Klass</Label>
                <Input
                  id="classLevel"
                  placeholder="nt 6. klass"
                  value={classLevel}
                  onChange={(e) => setClassLevel(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="subject">Aine</Label>
                <Input
                  id="subject"
                  placeholder="nt loodusõpetus"
                  value={subject}
                  onChange={(e) => setSubject(e.target.value)}
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="topic">Teema</Label>
              <Input
                id="topic"
                placeholder="nt veeringe"
                value={topic}
                onChange={(e) => setTopic(e.target.value)}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="wordCount">Sõnade arv</Label>
              <Input
                id="wordCount"
                type="number"
                min={1}
                max={50}
                value={wordCount}
                onChange={(e) => setWordCount(Number(e.target.value) || 1)}
              />
            </div>

            <div className="flex justify-end">
              <Button disabled={!canCreateWords() || busy} onClick={createWords}>
                {busy && <Loader2 className="h-4 w-4 animate-spin" />}
                Loo sõnad
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {step === 2 && (
        <Card>
          <CardHeader>
            <CardTitle>Sõnade nimekiri</CardTitle>
            <CardDescription>
              Vaata nimekiri üle, seejärel loo interaktiivsed ülesanded.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-3">
              {words.map((w) => (
                <div
                  key={w.id}
                  className="space-y-2 rounded-xl border border-border bg-secondary/30 p-3"
                >
                  <div className="flex flex-wrap items-center gap-2">
                    {w.ekilexFound === true && (
                      <Badge variant="success">Ekilex</Badge>
                    )}
                    {w.ekilexFound === false && (
                      <Badge variant="outline">Pole Ekilexis</Badge>
                    )}
                  </div>
                  <div className="flex flex-col gap-2 sm:flex-row">
                    <Input
                      value={w.word}
                      onChange={(e) =>
                        updateWord(w.id, { word: e.target.value })
                      }
                      placeholder="Sõna"
                    />
                    <Input
                      value={w.definition || ''}
                      onChange={(e) =>
                        updateWord(w.id, { definition: e.target.value })
                      }
                      placeholder="Definitsioon"
                    />
                    <Button
                      variant="ghost"
                      size="icon"
                      aria-label="Eemalda"
                      onClick={() =>
                        setWords((list) => list.filter((x) => x.id !== w.id))
                      }
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
            <Button
              variant="dashed"
              onClick={() =>
                setWords((list) => [
                  ...list,
                  { id: createId(), word: '', note: '' },
                ])
              }
            >
              <Plus className="h-4 w-4" /> Lisa sõna
            </Button>
            <div className="flex flex-wrap justify-between gap-2">
              <div className="flex gap-2">
                <Button variant="secondary" onClick={() => setStep(1)}>
                  Tagasi
                </Button>
                <Button variant="outline" disabled={busy} onClick={createWords}>
                  {busy && <Loader2 className="h-4 w-4 animate-spin" />}
                  Genereeri uuesti
                </Button>
              </div>
              <Button
                disabled={busy || !words.some((w) => w.word.trim())}
                onClick={generateExercises}
              >
                {busy && <Loader2 className="h-4 w-4 animate-spin" />}
                Loo ülesanded
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {step === 3 && (
        <Card>
          <CardHeader>
            <CardTitle>Ülesanded</CardTitle>
            <CardDescription>
              Proovi harjutusi nagu õpilane — õigeid vastuseid ei näidata enne
              kontrolli.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <InteractiveExercises exercises={exercises} />
            <div className="flex flex-wrap justify-between gap-2">
              <div className="flex gap-2">
                <Button variant="secondary" onClick={() => setStep(2)}>
                  Tagasi
                </Button>
                <Button
                  variant="outline"
                  disabled={busy}
                  onClick={generateExercises}
                >
                  {busy && <Loader2 className="h-4 w-4 animate-spin" />}
                  Genereeri uuesti
                </Button>
              </div>
              <Button disabled={!exercises.length} onClick={saveMaterial}>
                Salvesta materjal
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {step === 4 && savedId && (
        <Card>
          <CardHeader className="flex-row items-start justify-between space-y-0">
            <div>
              <CardTitle>Salvestatud</CardTitle>
              <CardDescription>
                Materjal on salvestatud õpetaja {MOCK_TEACHER.name} alla.
              </CardDescription>
            </div>
            <Badge variant="success">Salvestatud</Badge>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-sm text-muted-foreground">
              {topic} · {classLevel} · {subject} · {exercises.length} ülesannet
            </p>
            <div className="flex flex-wrap gap-2">
              <Button onClick={() => navigate(`/salvestatud/${savedId}`)}>
                Ava harjutused
              </Button>
              <Button
                variant="secondary"
                onClick={() => {
                  setStep(1)
                  setSavedId(null)
                  setFileName('')
                  setSourceText('')
                  setClassLevel('')
                  setSubject('')
                  setTopic('')
                  setCurriculum(emptyCurriculum())
                  setWords([])
                  setExercises([])
                  clearMessages()
                }}
              >
                Loo uus materjal
              </Button>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
