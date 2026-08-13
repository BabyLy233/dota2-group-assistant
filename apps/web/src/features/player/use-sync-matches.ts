import { useRef, useState } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { apiPost } from '@/lib/api'
import { playerMatchesQueryKey } from './use-player'

export interface SyncProgress {
  total: number
  done: number
  failed: string[]
}

export function useSyncMatches(steamId: string) {
  const queryClient = useQueryClient()
  const [running, setRunning] = useState(false)
  const [progress, setProgress] = useState<SyncProgress | null>(null)
  const runningRef = useRef(false)

  async function run(matchIds: string[]) {
    if (runningRef.current || matchIds.length === 0) return
    runningRef.current = true
    setRunning(true)
    setProgress({ total: matchIds.length, done: 0, failed: [] })

    for (const id of matchIds) {
      try {
        await apiPost<unknown>(`/api/matches/${id}/sync`)
      } catch {
        setProgress((p) => (p ? { ...p, failed: [...p.failed, id] } : p))
      }
      setProgress((p) => (p ? { ...p, done: p.done + 1 } : p))
    }

    runningRef.current = false
    setRunning(false)
    queryClient.invalidateQueries({ queryKey: playerMatchesQueryKey(steamId) })
  }

  return { running, progress, run }
}
