// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { applyTheme, getThemePref, setThemePref } from './theme'

function stubMatchMedia(matches: boolean) {
  Object.defineProperty(window, 'matchMedia', {
    writable: true,
    value: vi.fn().mockReturnValue({
      matches,
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
    }),
  })
}

beforeEach(() => {
  localStorage.clear()
  document.documentElement.className = ''
})

afterEach(() => {
  vi.restoreAllMocks()
})

describe('theme', () => {
  it('defaults to system preference', () => {
    expect(getThemePref()).toBe('system')
  })

  it('applies dark class for dark preference', () => {
    setThemePref('dark')
    expect(document.documentElement.classList.contains('dark')).toBe(true)
  })

  it('removes dark class for light preference', () => {
    setThemePref('dark')
    setThemePref('light')
    expect(document.documentElement.classList.contains('dark')).toBe(false)
  })

  it('follows system in system mode', () => {
    stubMatchMedia(true)
    setThemePref('system')
    expect(document.documentElement.classList.contains('dark')).toBe(true)

    stubMatchMedia(false)
    applyTheme('system')
    expect(document.documentElement.classList.contains('dark')).toBe(false)
  })

  it('persists preference in localStorage', () => {
    setThemePref('light')
    expect(localStorage.getItem('dota-theme')).toBe('light')
    expect(getThemePref()).toBe('light')
  })
})
