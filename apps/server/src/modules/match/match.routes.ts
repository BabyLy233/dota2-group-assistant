import { Hono } from 'hono'
import type { Env } from '../../config/env'
import type { Db } from '../../db'
import type { AppLogger } from '../../logger'
import type { StratzClient } from '../stratz'
import {
  AstrbotConfigError,
  AstrbotMatchNotFoundError,
  AstrbotMatchNotReadyError,
  AstrbotNoAnalysisError,
  AstrbotSendError,
  sendMatchAnalysisToQq,
} from '../astrbot/astrbot.service'
import { getMatchDetail, syncMatch } from './match.service'

export interface ModuleDeps {
  db: Db
  env: Env
  stratz: StratzClient
  logger?: AppLogger
  fetch?: typeof fetch
}

const MATCH_ID_PATTERN = /^\d{1,10}$/

export function matchRoutes(deps: ModuleDeps): Hono {
  const app = new Hono()

  app.get('/:matchId', async (c) => {
    const matchId = Number(c.req.param('matchId'))
    if (!MATCH_ID_PATTERN.test(c.req.param('matchId'))) {
      return c.json({ error: 'invalid_match_id' }, 400)
    }
    const detail = await getMatchDetail(deps.db, matchId)
    if (!detail) {
      return c.json({ error: 'match_not_found' }, 404)
    }
    return c.json(detail)
  })

  app.post('/:matchId/sync', async (c) => {
    const matchId = Number(c.req.param('matchId'))
    if (!MATCH_ID_PATTERN.test(c.req.param('matchId'))) {
      return c.json({ error: 'invalid_match_id' }, 400)
    }
    try {
      const detail = await syncMatch(
        { db: deps.db, stratz: deps.stratz, logger: deps.logger },
        matchId,
      )
      return c.json(detail)
    } catch (err) {
      return c.json(
        {
          error: 'sync_failed',
          message: err instanceof Error ? err.message : String(err),
        },
        502,
      )
    }
  })

  app.post('/:matchId/send-to-qq', async (c) => {
    const matchId = Number(c.req.param('matchId'))
    if (!MATCH_ID_PATTERN.test(c.req.param('matchId'))) {
      return c.json({ error: 'invalid_match_id', message: '无效的比赛 ID' }, 400)
    }
    try {
      const result = await sendMatchAnalysisToQq(
        { db: deps.db, env: deps.env, fetch: deps.fetch },
        matchId,
      )
      return c.json({ ok: true, ...result })
    } catch (err) {
      if (err instanceof AstrbotConfigError) {
        return c.json({ error: 'astrbot_not_configured', message: err.message }, 400)
      }
      if (err instanceof AstrbotMatchNotFoundError) {
        return c.json({ error: 'match_not_found', message: err.message }, 404)
      }
      if (err instanceof AstrbotMatchNotReadyError) {
        return c.json({ error: 'match_not_ready', message: err.message }, 409)
      }
      if (err instanceof AstrbotNoAnalysisError) {
        return c.json({ error: 'no_analysis', message: err.message }, 422)
      }
      if (err instanceof AstrbotSendError) {
        return c.json({ error: 'astrbot_send_failed', message: err.message }, 502)
      }
      throw err
    }
  })

  return app
}
