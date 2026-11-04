import { LogOut, Menu } from 'lucide-react'
import { useAuth } from '../../features/auth/AuthProvider'
import { ThemeToggle } from './ThemeToggle'

export function Topbar({ onOpenMobileMenu }: { onOpenMobileMenu: () => void }) {
  const { user, signOut } = useAuth()

  return (
    <header className="flex h-16 shrink-0 items-center justify-between border-b border-border/60 px-5 sm:px-8 lg:px-12">
      <button
        onClick={onOpenMobileMenu}
        aria-label="Open menu"
        className="flex size-9 items-center justify-center rounded-md hover:bg-muted md:hidden"
      >
        <Menu className="size-5" />
      </button>
      <span className="hidden text-xs font-medium text-muted-foreground md:block">
        Your prep, on loop
      </span>
      <div className="flex items-center gap-2">
        <span className="hidden max-w-48 truncate text-xs text-muted-foreground sm:inline">
          {user?.email}
        </span>
        <ThemeToggle />
        <button
          onClick={() => void signOut()}
          aria-label="Sign out"
          title="Sign out"
          className="flex size-9 items-center justify-center rounded-md hover:bg-muted"
        >
          <LogOut className="size-4" />
        </button>
      </div>
    </header>
  )
}
