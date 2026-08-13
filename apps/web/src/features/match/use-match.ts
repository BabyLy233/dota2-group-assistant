import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import type { MatchDetail } from '@dota/shared'
import { apiGet, apiPost } from '@/lib/api'

export const matchQueryKey = (matchId: string) => ['match', matchId] as const

export function useMatch(matchId: string) {
  return useQuery({
    queryKey: matchQueryKey(matchId),
    queryFn: () => apiGet<MatchDetail>(`/api/matches/${matchId}`),
    retry: false,
  })
}

export function useSyncMatch(matchId: string) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: () => apiPost<MatchDetail>(`/api/matches/${matchId}/sync`),
    onSuccess: (detail) => {
      queryClient.setQueryData(matchQueryKey(matchId), detail)
    },
  })
}
