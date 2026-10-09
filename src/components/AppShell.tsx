import { useState } from 'react'
import { NavLink, Outlet } from 'react-router-dom'
import { Settings } from 'lucide-react'
import { SettingsDialog } from '@/components/SettingsDialog'
import { Button } from '@/components/ui/button'
import { MOCK_TEACHER } from '@/lib/teacher'
import { cn } from '@/lib/utils'

const LANGS = ['ET', 'RU', 'EN'] as const

export function AppShell() {
  const [settingsOpen, setSettingsOpen] = useState(false)

  return (
    <div className="min-h-screen">
      <header className="mx-auto w-full max-w-3xl px-5 pt-8 pb-2">
        <div className="flex items-start justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold tracking-tight">Keelerada</h1>
            <p className="text-sm text-muted-foreground">{MOCK_TEACHER.name}</p>
          </div>
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
              {LANGS.map((lang) => (
                <button
                  key={lang}
                  type="button"
                  className={cn(
                    'rounded-md px-1 py-0.5 transition-colors',
                    lang === 'ET'
                      ? 'text-foreground'
                      : 'cursor-default opacity-50',
                  )}
                  aria-current={lang === 'ET' ? 'true' : undefined}
                  title={
                    lang === 'ET'
                      ? 'Eesti'
                      : 'PoC toetab praegu ainult eesti keelt'
                  }
                  disabled={lang !== 'ET'}
                >
                  {lang}
                </button>
              ))}
            </div>
            <Button
              variant="ghost"
              size="icon"
              aria-label="Seaded"
              onClick={() => setSettingsOpen(true)}
            >
              <Settings className="h-5 w-5 text-muted-foreground" />
            </Button>
          </div>
        </div>

        <nav className="mt-6 flex gap-6 border-b border-border">
          <NavLink
            to="/"
            end
            className={({ isActive }) =>
              cn(
                'pb-2 text-sm font-medium transition-colors',
                isActive
                  ? 'border-b-2 border-brand-orange text-foreground'
                  : 'text-muted-foreground hover:text-foreground',
              )
            }
          >
            Uus materjal
          </NavLink>
          <NavLink
            to="/salvestatud"
            className={({ isActive }) =>
              cn(
                'pb-2 text-sm font-medium transition-colors',
                isActive
                  ? 'border-b-2 border-brand-orange text-foreground'
                  : 'text-muted-foreground hover:text-foreground',
              )
            }
          >
            Salvestatud
          </NavLink>
        </nav>
      </header>

      <main className="mx-auto w-full max-w-3xl px-5 py-6">
        <Outlet />
      </main>

      <SettingsDialog open={settingsOpen} onOpenChange={setSettingsOpen} />
    </div>
  )
}
