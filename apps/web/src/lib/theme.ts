export type ThemePreference = 'light' | 'dark' | 'system'

const STORAGE_KEY = 'dota-theme'

const darkQuery = () => window.matchMedia('(prefers-color-scheme: dark)')

export function getThemePref(): ThemePreference {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (raw === 'light' || raw === 'dark' || raw === 'system') return raw
  } catch {
    // fall through
  }
  return 'system'
}

export function applyTheme(pref: ThemePreference): void {
  const dark = pref === 'dark' || (pref === 'system' && darkQuery().matches)
  document.documentElement.classList.toggle('dark', dark)
}

export function setThemePref(pref: ThemePreference): void {
  localStorage.setItem(STORAGE_KEY, pref)
  applyTheme(pref)
}

export function watchSystemTheme(onChange: () => void): () => void {
  const mql = darkQuery()
  mql.addEventListener('change', onChange)
  return () => mql.removeEventListener('change', onChange)
}
