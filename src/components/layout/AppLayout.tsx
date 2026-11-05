import { LogOut } from 'lucide-react'
import { NavLink, Outlet } from 'react-router'
import { useAuth } from '@/auth/auth-context'
import { useMe } from '@/auth/useMe'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'

const NAV = [
  { to: '/', label: 'Dashboard', end: true },
  { to: '/invoices', label: 'Invoices' },
  { to: '/ai-draft', label: 'AI draft' },
  { to: '/customers', label: 'Customers' },
]

export function AppLayout() {
  const { session, signOut } = useAuth()
  const me = useMe()

  return (
    <div className="min-h-svh bg-muted/30">
      <header className="border-b bg-background">
        <div className="mx-auto flex h-14 max-w-6xl items-center gap-6 px-4">
          <span className="font-semibold">Invoicing</span>
          <nav className="flex gap-1 text-sm">
            {NAV.map((item) => (
              <NavLink
                key={item.to}
                to={item.to}
                end={item.end}
                className={({ isActive }) =>
                  cn(
                    'rounded-md px-3 py-1.5 text-muted-foreground hover:text-foreground',
                    isActive && 'bg-muted text-foreground',
                  )
                }
              >
                {item.label}
              </NavLink>
            ))}
          </nav>
          <div className="ml-auto flex items-center gap-3 text-sm">
            <span className="text-muted-foreground" title="Workspace">
              {session?.tenantSlug}
            </span>
            {me.data?.role && <Badge variant="secondary">{me.data.role}</Badge>}
            <Button variant="ghost" size="sm" onClick={() => signOut()}>
              <LogOut />
              Sign out
            </Button>
          </div>
        </div>
      </header>
      <main className="mx-auto max-w-6xl px-4 py-8">
        <Outlet />
      </main>
    </div>
  )
}
