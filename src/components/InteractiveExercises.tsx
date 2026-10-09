import { useMemo, useState } from 'react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import type {
  ComprehensionExercise,
  Exercise,
  FillBlankExercise,
  MatchingExercise,
} from '@/lib/types'
import { cn, shuffle } from '@/lib/utils'

function isLegacy(
  ex: Exercise,
): ex is Extract<Exercise, { body: string }> {
  return 'body' in ex && typeof (ex as { body?: string }).body === 'string'
}

function MatchingPlayer({ exercise }: { exercise: MatchingExercise }) {
  const terms = useMemo(
    () =>
      exercise.pairs.map((p) => ({
        term_id: p.term_id,
        term: p.term || `Termin #${p.term_id}`,
      })),
    [exercise.pairs],
  )
  const definitions = useMemo(
    () =>
      shuffle(
        exercise.pairs.map((p) => ({
          term_id: p.term_id,
          definition: p.definition,
        })),
      ),
    [exercise.pairs],
  )

  const [selectedTermId, setSelectedTermId] = useState<number | null>(null)
  const [links, setLinks] = useState<Record<number, number>>({})
  const [checked, setChecked] = useState(false)

  function onSelectTerm(termId: number) {
    if (checked) return
    setSelectedTermId(termId)
  }

  function onSelectDefinition(defTermId: number) {
    if (checked || selectedTermId == null) return
    setLinks((prev) => {
      const next = { ...prev }
      // remove if this definition was linked elsewhere
      for (const [tid, did] of Object.entries(next)) {
        if (did === defTermId) delete next[Number(tid)]
      }
      next[selectedTermId] = defTermId
      return next
    })
    setSelectedTermId(null)
  }

  function reset() {
    setLinks({})
    setSelectedTermId(null)
    setChecked(false)
  }

  const score = terms.filter((t) => links[t.term_id] === t.term_id).length

  return (
    <div className="space-y-4 rounded-xl border border-border p-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex flex-wrap items-center gap-2">
          <Badge variant="secondary">Sobitamine</Badge>
          <p className="font-medium">{exercise.title}</p>
        </div>
        {checked && (
          <Badge variant="success">
            {score} / {terms.length} õiget
          </Badge>
        )}
      </div>
      <p className="text-sm text-muted-foreground">
        Klõpsa terminit, seejärel selle definitsiooni.
      </p>
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-2">
          <p className="text-xs font-medium uppercase text-muted-foreground">
            Terminid
          </p>
          {terms.map((t) => {
            const linked = links[t.term_id] != null
            const correct = checked && links[t.term_id] === t.term_id
            const wrong = checked && linked && links[t.term_id] !== t.term_id
            return (
              <button
                key={t.term_id}
                type="button"
                disabled={checked}
                onClick={() => onSelectTerm(t.term_id)}
                className={cn(
                  'w-full rounded-xl border px-3 py-2 text-left text-sm transition-colors',
                  selectedTermId === t.term_id && 'border-brand-orange bg-orange-50',
                  linked && !checked && 'border-primary/40 bg-secondary/50',
                  correct && 'border-green-600 bg-green-50',
                  wrong && 'border-destructive bg-destructive/5',
                  !linked &&
                    selectedTermId !== t.term_id &&
                    !checked &&
                    'border-border bg-card hover:bg-secondary/40',
                )}
              >
                {t.term}
              </button>
            )
          })}
        </div>
        <div className="space-y-2">
          <p className="text-xs font-medium uppercase text-muted-foreground">
            Definitsioonid
          </p>
          {definitions.map((d) => {
            const usedBy = Object.entries(links).find(
              ([, did]) => did === d.term_id,
            )
            const used = Boolean(usedBy)
            const correct =
              checked && usedBy && Number(usedBy[0]) === d.term_id
            const wrong =
              checked && usedBy && Number(usedBy[0]) !== d.term_id
            return (
              <button
                key={`${d.term_id}-${d.definition}`}
                type="button"
                disabled={checked || (used && selectedTermId == null)}
                onClick={() => onSelectDefinition(d.term_id)}
                className={cn(
                  'w-full rounded-xl border px-3 py-2 text-left text-sm transition-colors',
                  used && !checked && 'border-primary/40 bg-secondary/50',
                  correct && 'border-green-600 bg-green-50',
                  wrong && 'border-destructive bg-destructive/5',
                  !used &&
                    !checked &&
                    'border-border bg-card hover:bg-secondary/40',
                  selectedTermId != null &&
                    !used &&
                    'ring-1 ring-brand-orange/40',
                )}
              >
                {d.definition}
              </button>
            )
          })}
        </div>
      </div>
      <div className="flex flex-wrap gap-2">
        {!checked ? (
          <Button
            onClick={() => setChecked(true)}
            disabled={Object.keys(links).length < terms.length}
          >
            Kontrolli
          </Button>
        ) : (
          <Button variant="secondary" onClick={reset}>
            Proovi uuesti
          </Button>
        )}
      </div>
    </div>
  )
}

function ChoicePlayer({
  title,
  badge,
  items,
}: {
  title: string
  badge: string
  items: Array<{
    key: string
    prompt: string
    options: string[]
    correct: string
  }>
}) {
  const [answers, setAnswers] = useState<Record<string, string>>({})
  const [checked, setChecked] = useState(false)

  const score = items.filter((q) => answers[q.key] === q.correct).length

  function reset() {
    setAnswers({})
    setChecked(false)
  }

  return (
    <div className="space-y-4 rounded-xl border border-border p-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex flex-wrap items-center gap-2">
          <Badge variant="secondary">{badge}</Badge>
          <p className="font-medium">{title}</p>
        </div>
        {checked && (
          <Badge variant="success">
            {score} / {items.length} õiget
          </Badge>
        )}
      </div>
      <ol className="list-decimal space-y-4 pl-5 text-sm">
        {items.map((q) => {
          const selected = answers[q.key]
          const isCorrect = checked && selected === q.correct
          const isWrong = checked && selected && selected !== q.correct
          return (
            <li key={q.key} className="space-y-2">
              <p className="font-medium text-foreground">{q.prompt}</p>
              <div className="flex flex-col gap-2">
                {q.options.map((opt) => {
                  const active = selected === opt
                  return (
                    <button
                      key={opt}
                      type="button"
                      disabled={checked}
                      onClick={() =>
                        setAnswers((prev) => ({ ...prev, [q.key]: opt }))
                      }
                      className={cn(
                        'rounded-full border px-4 py-2 text-left transition-colors',
                        active && !checked && 'border-primary bg-primary text-primary-foreground',
                        !active && !checked && 'border-border bg-card hover:bg-secondary',
                        checked &&
                          active &&
                          isCorrect &&
                          'border-green-600 bg-green-50 text-foreground',
                        checked &&
                          active &&
                          isWrong &&
                          'border-destructive bg-destructive/5 text-foreground',
                        checked &&
                          !active &&
                          'border-border bg-card opacity-60',
                      )}
                    >
                      {opt}
                    </button>
                  )
                })}
              </div>
              {checked && !selected && (
                <p className="text-xs text-muted-foreground">Vastamata</p>
              )}
            </li>
          )
        })}
      </ol>
      <div className="flex flex-wrap gap-2">
        {!checked ? (
          <Button
            onClick={() => setChecked(true)}
            disabled={Object.keys(answers).length === 0}
          >
            Kontrolli
          </Button>
        ) : (
          <Button variant="secondary" onClick={reset}>
            Proovi uuesti
          </Button>
        )}
      </div>
    </div>
  )
}

function FillBlankPlayer({ exercise }: { exercise: FillBlankExercise }) {
  return (
    <ChoicePlayer
      title={exercise.title}
      badge="Lünktekst"
      items={exercise.questions.map((q, i) => ({
        key: `${exercise.id}-fb-${i}`,
        prompt: q.sentence,
        options: q.options,
        correct: q.correct_answer,
      }))}
    />
  )
}

function ComprehensionPlayer({
  exercise,
}: {
  exercise: ComprehensionExercise
}) {
  return (
    <ChoicePlayer
      title={exercise.title}
      badge="Sisu"
      items={exercise.questions.map((q, i) => ({
        key: `${exercise.id}-co-${i}`,
        prompt: q.question,
        options: q.options,
        correct: q.correct_answer,
      }))}
    />
  )
}

export function InteractiveExercises({ exercises }: { exercises: Exercise[] }) {
  return (
    <div className="space-y-4">
      {exercises.map((ex) => {
        if (isLegacy(ex)) {
          return (
            <div
              key={ex.id}
              className="space-y-2 rounded-xl border border-border p-4 text-sm"
            >
              <p className="font-medium">{ex.title}</p>
              <p className="whitespace-pre-wrap text-muted-foreground">
                {ex.body}
              </p>
            </div>
          )
        }
        if (ex.type === 'matching') {
          return <MatchingPlayer key={ex.id} exercise={ex} />
        }
        if (ex.type === 'fill_blank') {
          return <FillBlankPlayer key={ex.id} exercise={ex} />
        }
        return <ComprehensionPlayer key={ex.id} exercise={ex} />
      })}
    </div>
  )
}
