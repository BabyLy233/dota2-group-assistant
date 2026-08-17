import { Hono } from 'hono'
import type { Db } from '../../db'
import {
  bindPlayer,
  BindingConflictError,
  BindingInvalidSteamIdError,
  BindingPlayerNotFoundError,
  getPlayerBinding,
  unbindPlayer,
} from './binding.service'

export interface ModuleDeps {
  db: Db
}

const SUPPORTED_PLATFORMS = new Set(['qq_official'])

function isSupportedPlatform(platform: string): boolean {
  return SUPPORTED_PLATFORMS.has(platform)
}

export function bindingRoutes(deps: ModuleDeps): Hono {
  const app = new Hono()

  app.post('/', async (c) => {
    const body = (await c.req.json().catch(() => ({}))) as {
      platform?: unknown
      userId?: unknown
      steamId?: unknown
    }
    if (
      typeof body.platform !== 'string' ||
      !isSupportedPlatform(body.platform) ||
      typeof body.userId !== 'string' ||
      !body.userId.trim() ||
      typeof body.steamId !== 'string' ||
      !body.steamId.trim()
    ) {
      return c.json({ error: 'invalid_binding_body' }, 400)
    }

    try {
      return c.json(await bindPlayer(deps.db, body.platform, body.userId.trim(), body.steamId))
    } catch (err) {
      if (err instanceof BindingPlayerNotFoundError) {
        return c.json({ error: 'player_not_found', message: err.message }, 404)
      }
      if (err instanceof BindingConflictError) {
        return c.json({ error: 'binding_conflict', message: err.message }, 409)
      }
      if (err instanceof BindingInvalidSteamIdError) {
        return c.json({ error: 'invalid_steam_id', message: err.message }, 400)
      }
      throw err
    }
  })

  app.get('/:platform/:userId', async (c) => {
    const platform = c.req.param('platform')
    const userId = c.req.param('userId').trim()
    if (!isSupportedPlatform(platform) || !userId) {
      return c.json({ error: 'invalid_binding_target' }, 400)
    }

    const binding = await getPlayerBinding(deps.db, platform, userId)
    if (!binding) return c.json({ error: 'binding_not_found' }, 404)
    return c.json(binding)
  })

  app.delete('/:platform/:userId', async (c) => {
    const platform = c.req.param('platform')
    const userId = c.req.param('userId').trim()
    if (!isSupportedPlatform(platform) || !userId) {
      return c.json({ error: 'invalid_binding_target' }, 400)
    }

    const binding = await unbindPlayer(deps.db, platform, userId)
    if (!binding) return c.json({ error: 'binding_not_found' }, 404)
    return c.json(binding)
  })

  return app
}
