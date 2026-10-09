import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import { deleteMaterial, loadMaterials } from '@/lib/storage'
import { MOCK_TEACHER } from '@/lib/teacher'
import type { MaterialSet } from '@/lib/types'

function formatDate(iso: string) {
  try {
    return new Intl.DateTimeFormat('et-EE', {
      dateStyle: 'medium',
      timeStyle: 'short',
    }).format(new Date(iso))
  } catch {
    return iso
  }
}

export function LibraryPage() {
  const [items, setItems] = useState<MaterialSet[]>(() => loadMaterials())

  const teacherItems = useMemo(
    () => items.filter((m) => m.teacherId === MOCK_TEACHER.id),
    [items],
  )

  function handleDelete(id: string) {
    if (!confirm('Kustuta see materjal?')) return
    setItems(deleteMaterial(id))
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold tracking-tight">Salvestatud</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          Õpetaja {MOCK_TEACHER.name} materjalid selles brauseris.
        </p>
      </div>

      {!teacherItems.length && (
        <Card>
          <CardHeader>
            <CardTitle>Materjale pole veel</CardTitle>
            <CardDescription>
              Loo esimene komplekt vaates „Uus materjal”.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button asChild>
              <Link to="/">Uus materjal</Link>
            </Button>
          </CardContent>
        </Card>
      )}

      <div className="space-y-3">
        {teacherItems.map((item) => (
          <Card key={item.id}>
            <CardHeader className="flex-row items-start justify-between gap-3 space-y-0">
              <div>
                <CardTitle className="text-base">{item.topic || item.fileName}</CardTitle>
                <CardDescription>
                  {item.classLevel} · {item.subject} · {formatDate(item.createdAt)}
                </CardDescription>
              </div>
              <Badge variant="success">
                {item.words.length} sõna · {item.exercises.length} ülesannet
              </Badge>
            </CardHeader>
            <CardContent className="flex flex-wrap gap-2">
              <Button asChild>
                <Link to={`/salvestatud/${item.id}`}>Ava</Link>
              </Button>
              <Button variant="secondary" onClick={() => handleDelete(item.id)}>
                Kustuta
              </Button>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  )
}
