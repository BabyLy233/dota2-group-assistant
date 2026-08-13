import { Hono } from 'hono'
import type { Env } from '../../config/env'
import type { Db } from '../../db'
import type { StratzClient } from '../stratz'
import {
  getPlayer,
  listPlayerMatches,
  listPlayers,
  setPlayerFavorite,
  syncPlayer,
} from './player.service'

export interface ModuleDeps {
  db: Db
  env: Env
  stratz: StratzClient
}

const STEAM_ID_PATTERN = /^\d{17}$/

export function playerRoutes(deps: ModuleDeps): Hono {
  const app = new Hono()

  app.get('/', async (c) => {
    const limit = Math.min(Math.max(1, Math.trunc(Number(c.req.query('limit') ?? 20)) || 20), 50)
    return c.json(await listPlayers(deps.db, limit))
  })

  app.get('/:steamId', async (c) => {
    const steamId = c.req.param('steamId')
    if (!STEAM_ID_PATTERN.test(steamId)) {
      return c.json({ error: 'invalid_steam_id' }, 400)
    }
    const player = await getPlayer(deps.db, steamId)
    if (!player) {
      return c.json({ error: 'player_not_found' }, 404)
    }
    return c.json(player)
  })

  app.get('/:steamId/matches', async (c) => {
    const steamId = c.req.param('steamId')
    if (!STEAM_ID_PATTERN.test(steamId)) {
      return c.json({ error: 'invalid_steam_id' }, 400)
    }
    const page = Math.max(1, Math.trunc(Number(c.req.query('page') ?? 1)) || 1)
    const pageSize = Math.min(
      Math.max(1, Math.trunc(Number(c.req.query('pageSize') ?? 20)) || 20),
      100,
    )
    return c.json(await listPlayerMatches(deps.db, steamId, page, pageSize))
  })

  app.post('/:steamId/sync', async (c) => {
    const steamId = c.req.param('steamId')
    if (!STEAM_ID_PATTERN.test(steamId)) {
      return c.json({ error: 'invalid_steam_id' }, 400)
    }
    try {
      const player = await syncPlayer({ db: deps.db, stratz: deps.stratz }, steamId)
      return c.json(player)
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

  app.post('/:steamId/favorite', async (c) => {
    const steamId = c.req.param('steamId')
    if (!STEAM_ID_PATTERN.test(steamId)) {
      return c.json({ error: 'invalid_steam_id' }, 400)
    }
    const body = (await c.req.json().catch(() => ({}))) as { favorite?: unknown }
    if (typeof body.favorite !== 'boolean') {
      return c.json({ error: 'invalid_body', message: 'favorite 必须是布尔值' }, 400)
    }
    const player = await setPlayerFavorite(deps.db, steamId, body.favorite)
    if (!player) {
      return c.json({ error: 'player_not_found' }, 404)
    }
    return c.json(player)
  })

  return app
}
