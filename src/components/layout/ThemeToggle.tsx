import { Moon, Sun } from 'lucide-react'
import { useDarkMode } from '../../hooks/useDarkMode'

export function ThemeToggle() {
  const { dark, toggle } = useDarkMode()
  return (
    <button
      type="button"
      onClick={toggle}
      aria-label={dark ? 'Switch to light mode' : 'Switch to dark mode'}
      title={dark ? 'Light mode' : 'Dark mode'}
      className="flex size-9 items-center justify-center rounded-md hover:bg-muted"
    >
      {dark ? <Sun className="size-4" /> : <Moon className="size-4" />}
    </button>
  )
}
