import { Hono } from 'hono'
import type { Db } from '../../db'
import type { StratzClient } from '../stratz'
import {
  AiInProgressError,
  AiMatchNotFoundError,
  AiMatchNotReadyError,
  AiProviderError,
  streamAnalyze,
  type AiConfig,
  type AnalysisType,
} from './ai.service'

export interface AiModuleDeps {
  db: Db
  stratz: StratzClient
}

const encoder = new TextEncoder()

export function aiRoutes(deps: AiModuleDeps): Hono {
  const app = new Hono()

  app.post('/:matchId/analyze', async (c) => {
    const matchId = Number(c.req.param('matchId'))
    if (!Number.isInteger(matchId) || matchId <= 0) {
      return c.json({ error: 'invalid_match_id' }, 400)
    }
    const force = c.req.query('force') === '1'
    const typeParam = c.req.query('type')
    const type: AnalysisType = typeParam === 'brief' ? 'brief' : 'full'
    const body = (await c.req.json().catch(() => ({}))) as Partial<AiConfig>
    const { baseURL, apiKey, model } = body
    if (!baseURL?.trim() || !apiKey?.trim() || !model?.trim()) {
      return c.json(
        { error: 'missing_ai_config', message: '请先设置 API URL、API Key 和模型名称' },
        400,
      )
    }

    c.header('content-type', 'text/event-stream')
    c.header('cache-control', 'no-cache')
    c.header('connection', 'keep-alive')

    const bodyStream = new ReadableStream<Uint8Array>({
      async start(controller) {
        const send = (obj: unknown) => {
          controller.enqueue(encoder.encode(`data: ${JSON.stringify(obj)}\n\n`))
        }
        try {
          for await (const evt of streamAnalyze(
            deps,
            matchId,
            { baseURL, apiKey, model },
            type,
            force,
          )) {
            if (evt.kind === 'delta') {
              send({ type: 'delta', content: evt.content })
            } else {
              send({ type: 'done', analysis: evt.analysis, cached: evt.cached })
            }
          }
        } catch (err) {
          if (err instanceof AiMatchNotFoundError) {
            send({ type: 'error', code: 'match_not_found', message: err.message, status: 404 })
          } else if (err instanceof AiMatchNotReadyError) {
            send({ type: 'error', code: 'match_not_ready', message: err.message, status: 409 })
          } else if (err instanceof AiInProgressError) {
            send({
              type: 'error',
              code: 'analysis_in_progress',
              message: err.message,
              status: 409,
            })
          } else if (err instanceof AiProviderError) {
            send({ type: 'error', code: 'ai_provider_error', message: err.message, status: 502 })
          } else {
            send({
              type: 'error',
              code: 'internal_error',
              message: err instanceof Error ? err.message : String(err),
              status: 500,
            })
          }
        }
        controller.close()
      },
    })

    return c.body(bodyStream)
  })

  return app
}
