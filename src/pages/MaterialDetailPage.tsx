import { Link, useNavigate, useParams } from 'react-router-dom'
import { InteractiveExercises } from '@/components/InteractiveExercises'
import { Button } from '@/components/ui/button'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import { deleteMaterial, getMaterial } from '@/lib/storage'

export function MaterialDetailPage() {
  const { id } = useParams()
  const navigate = useNavigate()
  const item = id ? getMaterial(id) : undefined

  if (!item) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Materjali ei leitud</CardTitle>
          <CardDescription>
            See kirje puudub localStorage’ist või on kustutatud.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Button asChild>
            <Link to="/salvestatud">Tagasi nimekirja</Link>
          </Button>
        </CardContent>
      </Card>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">
            {item.topic || item.fileName}
          </h2>
          <p className="mt-1 text-sm text-muted-foreground">
            {item.classLevel} · {item.subject}
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="secondary" asChild>
            <Link to="/salvestatud">Tagasi</Link>
          </Button>
          <Button
            variant="destructive"
            onClick={() => {
              if (!confirm('Kustuta see materjal?')) return
              deleteMaterial(item.id)
              navigate('/salvestatud')
            }}
          >
            Kustuta
          </Button>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Harjutused</CardTitle>
          <CardDescription>
            Interaktiivne demo — õigeid vastuseid ei näidata enne kontrolli.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <InteractiveExercises exercises={item.exercises} />
        </CardContent>
      </Card>
    </div>
  )
}
