import { Hono } from 'hono'
import type { Env } from '../../config/env'
import type { Db } from '../../db'
import type { StratzClient } from '../stratz'
import { getMatchDetail, syncMatch } from './match.service'

export interface ModuleDeps {
  db: Db
  env: Env
  stratz: StratzClient
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
      const detail = await syncMatch({ db: deps.db, stratz: deps.stratz }, matchId)
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

  return app
}
