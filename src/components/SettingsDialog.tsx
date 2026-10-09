import { useEffect, useState } from 'react'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  DEFAULT_GEMINI_MODEL,
  DEFAULT_SETTINGS,
  loadSettings,
  saveSettings,
} from '@/lib/storage'
import type { AppSettings } from '@/lib/types'

type SettingsDialogProps = {
  open: boolean
  onOpenChange: (open: boolean) => void
  onSaved?: (settings: AppSettings) => void
}

export function SettingsDialog({
  open,
  onOpenChange,
  onSaved,
}: SettingsDialogProps) {
  const [form, setForm] = useState<AppSettings>(loadSettings())

  useEffect(() => {
    if (open) setForm(loadSettings())
  }, [open])

  function handleSave() {
    const next: AppSettings = {
      ...form,
      wordCount: Math.min(50, Math.max(1, Number(form.wordCount) || 13)),
      geminiApiKey: form.geminiApiKey.trim(),
      ekilexApiKey: form.ekilexApiKey.trim(),
      oppekavaUrl:
        form.oppekavaUrl.trim() || DEFAULT_SETTINGS.oppekavaUrl,
      geminiModel: form.geminiModel.trim() || DEFAULT_GEMINI_MODEL,
    }
    saveSettings(next)
    onSaved?.(next)
    onOpenChange(false)
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Seaded</DialogTitle>
          <DialogDescription>
            Võtmed salvestatakse sellesse brauserisse (localStorage). See on
            ajutine demo — ära kasuta tootmisvõtmeid. Praegu toetatud AI:
            Google Gemini (Claude/ChatGPT ei ole veel ühendatud).
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="geminiApiKey">Gemini API võti (peamine / varu)</Label>
            <Input
              id="geminiApiKey"
              type="password"
              autoComplete="off"
              placeholder="AIza..."
              value={form.geminiApiKey}
              onChange={(e) =>
                setForm((s) => ({ ...s, geminiApiKey: e.target.value }))
              }
            />
            <p className="text-xs text-muted-foreground">
              Kohalikult võib võti olla ka failis <code>.env</code> (
              <code>VITE_GEMINI_API_KEY</code>). Ära commit’i .env faili.
            </p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="ekilexApiKey">Ekilex API võti</Label>
            <Input
              id="ekilexApiKey"
              type="password"
              autoComplete="off"
              placeholder="Ekilex kasutajaprofiilist"
              value={form.ekilexApiKey}
              onChange={(e) =>
                setForm((s) => ({ ...s, ekilexApiKey: e.target.value }))
              }
            />
            <p className="text-xs text-muted-foreground">
              Vajalik sõnade kontrolliks / definitsioonideks. Võti:{' '}
              <a
                className="text-brand-link underline"
                href="https://ekilex.ee/userprofile"
                target="_blank"
                rel="noreferrer"
              >
                ekilex.ee/userprofile
              </a>
              . API:{' '}
              <a
                className="text-brand-link underline"
                href="https://ekilex.ee/swagger-ui/index.html"
                target="_blank"
                rel="noreferrer"
              >
                Swagger
              </a>
              .
            </p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="geminiModel">Gemini mudel</Label>
            <Input
              id="geminiModel"
              value={form.geminiModel}
              onChange={(e) =>
                setForm((s) => ({ ...s, geminiModel: e.target.value }))
              }
            />
            <p className="text-xs text-muted-foreground">
              Vaikimisi {DEFAULT_GEMINI_MODEL} (Google’i praegune stabiilne
              Flash uute projektide jaoks).
            </p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="wordCount">Vaikimisi sõnade arv</Label>
            <Input
              id="wordCount"
              type="number"
              min={1}
              max={50}
              value={form.wordCount}
              onChange={(e) =>
                setForm((s) => ({
                  ...s,
                  wordCount: Number(e.target.value),
                }))
              }
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="oppekavaUrl">Õppekava URL</Label>
            <Input
              id="oppekavaUrl"
              type="url"
              value={form.oppekavaUrl}
              onChange={(e) =>
                setForm((s) => ({ ...s, oppekavaUrl: e.target.value }))
              }
            />
            <p className="text-xs text-muted-foreground">
              Vaikimisi OKMV Põhikool. Kui brauser ei saa lehte CORS-i tõttu
              lugeda, saadetakse Gemini’le URL + klass/aine/teema.
            </p>
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <Button variant="secondary" onClick={() => onOpenChange(false)}>
              Tühista
            </Button>
            <Button onClick={handleSave}>Salvesta</Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
