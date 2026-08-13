export interface AiSettings {
  baseURL: string
  apiKey: string
  model: string
}

const STORAGE_KEY = 'dota-ai-settings'

export function loadAiSettings(): AiSettings {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (raw) {
      const parsed = JSON.parse(raw) as Partial<AiSettings>
      return {
        baseURL: parsed.baseURL ?? '',
        apiKey: parsed.apiKey ?? '',
        model: parsed.model ?? '',
      }
    }
  } catch {
    // fall through
  }
  return { baseURL: '', apiKey: '', model: '' }
}

export function saveAiSettings(settings: AiSettings): void {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(settings))
}

export function hasAiSettings(): boolean {
  const s = loadAiSettings()
  return Boolean(s.baseURL.trim() && s.apiKey.trim() && s.model.trim())
}
