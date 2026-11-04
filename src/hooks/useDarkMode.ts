import { useCallback, useEffect, useState } from 'react'

const KEY = 'loop:theme'

function initial(): boolean {
  try {
    const saved = localStorage.getItem(KEY)
    if (saved === 'dark') return true
    if (saved === 'light') return false
  } catch {
    /* private window; fall through to the system preference */
  }
  try {
    return window.matchMedia('(prefers-color-scheme: dark)').matches
  } catch {
    return false
  }
}

export function useDarkMode() {
  const [dark, setDark] = useState<boolean>(initial)

  useEffect(() => {
    const root = document.documentElement
    root.classList.toggle('dark', dark)
    root.style.colorScheme = dark ? 'dark' : 'light'
    try {
      localStorage.setItem(KEY, dark ? 'dark' : 'light')
    } catch {
      /* preference just won't survive a reload */
    }
  }, [dark])

  return { dark, toggle: useCallback(() => setDark((d) => !d), []) }
}
