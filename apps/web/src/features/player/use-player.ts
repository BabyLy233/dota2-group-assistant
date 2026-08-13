import { keepPreviousData, useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import type { MatchListResponse, Player } from '@dota/shared'
import { apiGet, apiPost } from '@/lib/api'

export const playerQueryKey = (steamId: string) => ['player', steamId] as const
export const playerMatchesQueryKey = (steamId: string) => ['player-matches', steamId] as const

export function usePlayer(steamId: string) {
  return useQuery({
    queryKey: playerQueryKey(steamId),
    queryFn: () => apiGet<Player>(`/api/players/${steamId}`),
    retry: false,
  })
}

export function usePlayerMatches(steamId: string, page: number, pageSize = 20) {
  return useQuery({
    queryKey: [...playerMatchesQueryKey(steamId), pageSize, page] as const,
    queryFn: () =>
      apiGet<MatchListResponse>(
        `/api/players/${steamId}/matches?page=${page}&pageSize=${pageSize}`,
      ),
    placeholderData: keepPreviousData,
    retry: false,
  })
}

export function useSyncPlayer(steamId: string) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: () => apiPost<Player>(`/api/players/${steamId}/sync`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: playerQueryKey(steamId) })
      queryClient.invalidateQueries({ queryKey: playerMatchesQueryKey(steamId) })
      queryClient.invalidateQueries({ queryKey: ['players'] })
    },
  })
}

export function useFavoritePlayer(steamId: string) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (favorite: boolean) =>
      apiPost<Player>(`/api/players/${steamId}/favorite`, {
        body: JSON.stringify({ favorite }),
      }),
    onSuccess: (player) => {
      queryClient.setQueryData(playerQueryKey(steamId), player)
      queryClient.invalidateQueries({ queryKey: ['players'] })
    },
  })
}

export function useSyncedPlayers() {
  return useQuery({
    queryKey: ['players'],
    queryFn: () => apiGet<{ items: Player[]; total: number }>('/api/players?limit=30'),
    retry: false,
  })
}
