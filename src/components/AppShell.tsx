import { useState } from 'react'
import { NavLink, Outlet, useLocation } from 'react-router-dom'
import { Settings } from 'lucide-react'
import { SettingsDialog } from '@/components/SettingsDialog'
import { Button } from '@/components/ui/button'
import { MOCK_TEACHER } from '@/lib/teacher'
import { cn } from '@/lib/utils'

const LANGS = ['ET', 'RU', 'EN'] as const

export function AppShell() {
  const [settingsOpen, setSettingsOpen] = useState(false)
  const location = useLocation()
  const isTeacher = location.pathname.startsWith('/opetajale')
  const isPupil = location.pathname.startsWith('/opilasele')

  return (
    <div className="min-h-screen">
      <header className="mx-auto w-full max-w-3xl px-5 pt-8 pb-2">
        <div className="grid grid-cols-[1fr_auto_1fr] items-center gap-3">
          <div className="min-w-0">
            <h1 className="text-2xl font-bold tracking-tight">Keelerada</h1>
            <p className="text-sm text-muted-foreground">
              {isPupil ? 'Õpilane' : MOCK_TEACHER.name}
            </p>
          </div>

          <nav
            className="inline-flex rounded-lg border border-border bg-secondary/70 p-1 shadow-sm"
            aria-label="Tööriist"
          >
            <NavLink
              to="/opetajale"
              className={() =>
                cn(
                  'rounded-md px-3.5 py-1.5 text-sm font-semibold transition-colors',
                  isTeacher
                    ? 'bg-brand-orange text-white shadow-sm'
                    : 'text-muted-foreground hover:text-foreground',
                )
              }
            >
              Õpetajale
            </NavLink>
            <NavLink
              to="/opilasele"
              className={({ isActive }) =>
                cn(
                  'rounded-md px-3.5 py-1.5 text-sm font-semibold transition-colors',
                  isActive
                    ? 'bg-brand-orange text-white shadow-sm'
                    : 'text-muted-foreground hover:text-foreground',
                )
              }
            >
              Õpilasele
            </NavLink>
          </nav>

          <div className="flex items-center justify-end gap-3">
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

        {isTeacher && (
          <nav className="mt-5 flex gap-6 border-b border-border">
            <NavLink
              to="/opetajale"
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
              to="/opetajale/salvestatud"
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
        )}
      </header>

      <main className="mx-auto w-full max-w-3xl px-5 py-6">
        <Outlet />
      </main>

      <SettingsDialog open={settingsOpen} onOpenChange={setSettingsOpen} />
    </div>
  )
}
