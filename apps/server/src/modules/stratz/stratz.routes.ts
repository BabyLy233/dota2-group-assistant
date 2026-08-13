import { Hono } from 'hono'
import type { StratzClient } from '../stratz'

export function stratzRoutes(stratz: StratzClient): Hono {
  const app = new Hono()

  app.get('/quota', (c) => {
    return c.json(stratz.getQuota())
  })

  return app
}
