import { useRef, useState } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import type { MatchAnalysis, MatchDetail } from '@dota/shared'
import { loadAiSettings } from '@/lib/ai-settings'
import { matchQueryKey } from './use-match'

export type StreamStatus = 'idle' | 'streaming' | 'done' | 'error'

export const ANALYSIS_TTL_MS = 3 * 60 * 1000

interface DoneEvent {
  analysis: MatchAnalysis
  cached: boolean
}

interface ErrorEvent {
  code: string
  message: string
  status: number
}

export function useStreamAnalyze(matchId: string) {
  const queryClient = useQueryClient()
  const [content, setContent] = useState('')
  const [status, setStatus] = useState<StreamStatus>('idle')
  const [error, setError] = useState('')
  const [currentType, setCurrentType] = useState<'full' | 'brief'>('full')
  const [errorCode, setErrorCode] = useState('')
  const activeRef = useRef(false)

  async function run(opts: { type: 'full' | 'brief'; force?: boolean }) {
    if (activeRef.current) return
    const settings = loadAiSettings()
    if (!settings.baseURL || !settings.apiKey || !settings.model) {
      setError('尚未配置 AI 服务，请先到设置页填写')
      setStatus('error')
      return
    }

    activeRef.current = true
    setCurrentType(opts.type)
    setContent('')
    setError('')
    setErrorCode('')
    setStatus('streaming')

    try {
      const res = await fetch(
        `/api/ai/${matchId}/analyze?type=${opts.type}${opts.force ? '&force=1' : ''}`,
        {
          method: 'POST',
          headers: { 'content-type': 'application/json' },
          body: JSON.stringify(settings),
        },
      )

      if (!res.ok) {
        const body = (await res.json().catch(() => null)) as { message?: string } | null
        throw new Error(body?.message ?? `HTTP ${res.status}`)
      }
      if (!res.body) {
        throw new Error('浏览器不支持流式响应')
      }

      const reader = res.body.getReader()
      const decoder = new TextDecoder()
      let buffer = ''
      let doneEvent: DoneEvent | null = null

      for (;;) {
        const { done, value } = await reader.read()
        if (done) break
        buffer += decoder.decode(value, { stream: true })
        let idx: number
        while ((idx = buffer.indexOf('\n\n')) >= 0) {
          const raw = buffer.slice(0, idx)
          buffer = buffer.slice(idx + 2)
          if (!raw.startsWith('data: ')) continue
          let evt: { type: string } & Record<string, unknown>
          try {
            evt = JSON.parse(raw.slice(6))
          } catch {
            continue
          }
          if (evt.type === 'delta') {
            setContent((prev) => prev + String(evt.content ?? ''))
          } else if (evt.type === 'done') {
            doneEvent = evt as unknown as DoneEvent
          } else if (evt.type === 'error') {
            const e = evt as unknown as ErrorEvent
            setErrorCode(e.code ?? '')
            throw new Error(e.message || '分析失败')
          }
        }
      }

      if (doneEvent) {
        setContent(doneEvent.analysis.text)
        const current = queryClient.getQueryData<MatchDetail>(matchQueryKey(matchId))
        if (current) {
          const isFull = opts.type === 'full'
          queryClient.setQueryData(matchQueryKey(matchId), {
            ...current,
            analysis: isFull ? doneEvent.analysis : current.analysis,
            brief: isFull ? current.brief : doneEvent.analysis,
            analysisFullStatus: isFull ? 'COMPLETED' : current.analysisFullStatus,
            analysisBriefStatus: isFull ? current.analysisBriefStatus : 'COMPLETED',
            analysisFullStartedAt: isFull ? null : current.analysisFullStartedAt,
            analysisBriefStartedAt: isFull ? current.analysisBriefStartedAt : null,
          })
        }
        setStatus('done')
      } else if (!error) {
        setError('连接中断，未收到完整结果，请重试')
        setStatus('error')
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err))
      setStatus('error')
    } finally {
      activeRef.current = false
    }
  }

  return {
    content,
    status,
    error,
    errorCode,
    run,
    streaming: status === 'streaming',
    currentType,
  }
}
