import { useEffect, useState } from 'react'
import { Button } from '@/components/ui/button'
import {
  applyTheme,
  getThemePref,
  setThemePref,
  watchSystemTheme,
  type ThemePreference,
} from '@/lib/theme'

const LABELS: Record<ThemePreference, string> = {
  light: '☀️ 浅色',
  dark: '🌙 深色',
  system: '🖥 跟随系统',
}

const NEXT: Record<ThemePreference, ThemePreference> = {
  light: 'dark',
  dark: 'system',
  system: 'light',
}

export function ThemeToggle() {
  const [pref, setPref] = useState<ThemePreference>(getThemePref)

  useEffect(() => {
    applyTheme(pref)
  }, [pref])

  useEffect(() => {
    const off = watchSystemTheme(() => {
      const current = getThemePref()
      if (current === 'system') applyTheme(current)
    })
    return off
  }, [])

  return (
    <Button
      variant='ghost'
      size='sm'
      title='切换主题（浅色 / 深色 / 跟随系统）'
      onClick={() => {
        const next = NEXT[pref]
        setThemePref(next)
        setPref(next)
      }}
    >
      {LABELS[pref]}
    </Button>
  )
}
