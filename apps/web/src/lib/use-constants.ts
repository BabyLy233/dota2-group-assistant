import { useQuery } from '@tanstack/react-query'
import { apiGet } from './api'
import { HERO_NAMES_ZH } from '@dota/shared'

export interface ConstantsData {
  heroes: Record<number, string>
  gameModes: Record<number, string>
  lobbyTypes: Record<number, string>
  items: Record<number, { name: string; icon: string }>
}

interface ConstantsResponse {
  heroes: Array<{ id: number; name: string }>
  gameModes: Array<{ id: number; name: string }>
  lobbyTypes: Array<{ id: number; name: string }>
  items: Array<{ id: number; name: string; shortName: string }>
}

function toMap(items: Array<{ id: number; name: string }>): Record<number, string> {
  return Object.fromEntries(items.map((x) => [x.id, x.name]))
}

export const ITEM_ICON_BASE = 'https://cdn.stratz.com/images/dota2/items'

export function useConstants() {
  return useQuery({
    queryKey: ['constants'],
    queryFn: async (): Promise<ConstantsData> => {
      const data = await apiGet<ConstantsResponse>('/api/constants')
      const heroesEn = toMap(data.heroes)
      const heroes: Record<number, string> = {}
      for (const [id, nameEn] of Object.entries(heroesEn)) {
        heroes[Number(id)] = HERO_NAMES_ZH[nameEn] ?? nameEn
      }
      const items: Record<number, { name: string; icon: string }> = {}
      for (const it of data.items) {
        items[it.id] = { name: it.name, icon: `${ITEM_ICON_BASE}/${it.shortName}.png` }
      }
      return {
        heroes,
        gameModes: toMap(data.gameModes),
        lobbyTypes: toMap(data.lobbyTypes),
        items,
      }
    },
    staleTime: 24 * 60 * 60 * 1000,
  })
}
