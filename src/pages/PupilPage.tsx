import { useMemo, useState } from 'react'
import { Loader2 } from 'lucide-react'
import { InteractiveExercises } from '@/components/InteractiveExercises'
import { SelectableText } from '@/components/SelectableText'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { PUPIL_SAMPLE } from '@/data/pupilSample'
import { GeminiError } from '@/lib/gemini'
import { runPupilHarjuta } from '@/lib/pipeline'
import {
  tokenizeReadingText,
  uniqueWordsFromSelection,
} from '@/lib/tokenizeText'
import type { Exercise } from '@/lib/types'

export function PupilPage() {
  const { paragraphs, tokens, displayText } = useMemo(
    () => tokenizeReadingText(PUPIL_SAMPLE.sourceText),
    [],
  )

  const [selected, setSelected] = useState<Set<number>>(() => new Set())
  const [busy, setBusy] = useState(false)
  const [status, setStatus] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [warning, setWarning] = useState<string | null>(null)
  const [exercises, setExercises] = useState<Exercise[] | null>(null)

  const selectedCount = selected.size
  const showingExercises = Boolean(exercises?.length)

  function toggleToken(index: number) {
    if (busy || showingExercises) return
    setSelected((prev) => {
      const next = new Set(prev)
      if (next.has(index)) next.delete(index)
      else next.add(index)
      return next
    })
  }

  function clearSelection() {
    setSelected(new Set())
  }

  function backToText() {
    setExercises(null)
    setError(null)
    setWarning(null)
    setStatus(null)
  }

  async function handleHarjuta() {
    setError(null)
    setWarning(null)
    const words = uniqueWordsFromSelection(tokens, selected)
    if (!words.length) {
      setError('Vali vähemalt üks sõna.')
      return
    }

    setBusy(true)
    try {
      const result = await runPupilHarjuta(
        {
          classLevel: PUPIL_SAMPLE.classLevel,
          subject: PUPIL_SAMPLE.subject,
          topic: PUPIL_SAMPLE.topic,
          sourceText: displayText,
          selectedWords: words,
        },
        setStatus,
      )
      setExercises(result.exercises)
      if (result.warning) setWarning(result.warning)
    } catch (err) {
      setError(
        err instanceof GeminiError || err instanceof Error
          ? err.message
          : 'Harjutuste loomine ebaõnnestus.',
      )
    } finally {
      setBusy(false)
      setStatus(null)
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold tracking-tight">Õpilasele</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          Klõpsa tekstis sõnu, mida soovid harjutada, ja vajuta Harjuta.
        </p>
        <div className="mt-3 flex flex-wrap gap-2">
          <Badge variant="secondary">{PUPIL_SAMPLE.classLevel}. klass</Badge>
          <Badge variant="secondary">{PUPIL_SAMPLE.subject}</Badge>
          <Badge variant="secondary">{PUPIL_SAMPLE.topic}</Badge>
        </div>
      </div>

      {error && (
        <div className="rounded-md border border-destructive/40 bg-destructive/10 px-3 py-2 text-sm text-destructive">
          {error}
        </div>
      )}
      {warning && (
        <div className="rounded-md border border-amber-300 bg-amber-50 px-3 py-2 text-sm text-amber-900">
          {warning}
        </div>
      )}
      {(busy || status) && (
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Loader2 className="h-4 w-4 animate-spin" />
          <span>{status || 'Töötlen…'}</span>
        </div>
      )}

      {showingExercises ? (
        <div className="space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <h3 className="text-lg font-semibold">Harjutused</h3>
            <Button type="button" variant="outline" onClick={backToText}>
              Tagasi teksti juurde
            </Button>
          </div>
          <InteractiveExercises exercises={exercises!} />
        </div>
      ) : (
        <>
          <SelectableText
            paragraphs={paragraphs}
            selectedIndices={selected}
            onToggle={toggleToken}
            disabled={busy}
          />

          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-sm text-muted-foreground">
                Valitud: {selectedCount}
              </span>
              {selectedCount > 0 && (
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={clearSelection}
                  disabled={busy}
                >
                  Tühjenda valik
                </Button>
              )}
            </div>
            <Button
              type="button"
              onClick={handleHarjuta}
              disabled={busy || selectedCount < 1}
            >
              {busy ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Harjutan…
                </>
              ) : (
                'Harjuta'
              )}
            </Button>
          </div>
        </>
      )}
    </div>
  )
}
