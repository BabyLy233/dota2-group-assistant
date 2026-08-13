import { Hono } from 'hono'
import type { StratzClient } from '../stratz'

export interface ConstantsDeps {
  stratz: StratzClient
}

export function constantsRoutes(deps: ConstantsDeps): Hono {
  const app = new Hono()

  app.get('/', async (c) => {
    try {
      const data = await deps.stratz.getConstants()
      return c.json({
        heroes: data.heroes.map((h) => ({ id: h.id, name: h.displayName })),
        gameModes: data.gameModes,
        lobbyTypes: data.lobbyTypes,
        items: data.items.map((i) => ({
          id: i.id,
          name: i.displayName,
          shortName: i.shortName,
        })),
      })
    } catch (err) {
      return c.json(
        {
          error: 'constants_fetch_failed',
          message: err instanceof Error ? err.message : String(err),
        },
        502,
      )
    }
  })

  return app
}
