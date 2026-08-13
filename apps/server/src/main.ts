import { serve } from '@hono/node-server'
import { Hono } from 'hono'
import { cors } from 'hono/cors'
import { sql } from 'drizzle-orm'
import { loadEnv } from './config/env'
import { createDb } from './db'
import { playerRoutes } from './modules/player/player.routes'
import { matchRoutes } from './modules/match/match.routes'
import { constantsRoutes } from './modules/constants/constants.routes'
import { aiRoutes } from './modules/ai/ai.routes'
import { stratzRoutes } from './modules/stratz/stratz.routes'
import { StratzClient } from './modules/stratz'

function createApp() {
  const env = loadEnv()
  const db = createDb(env.DATABASE_PATH)
  const stratz = new StratzClient({ apiKey: env.STRATZ_API_KEY })

  const app = new Hono()

  app.use('/api/*', cors())

  app.get('/api/health', (c) => {
    db.run(sql`select 1`)
    return c.json({ ok: true, db: 'ok' })
  })

  app.route('/api/players', playerRoutes({ db, env, stratz }))
  app.route('/api/matches', matchRoutes({ db, env, stratz }))
  app.route('/api/constants', constantsRoutes({ stratz }))
  app.route('/api/ai', aiRoutes({ db, stratz }))
  app.route('/api/stratz', stratzRoutes(stratz))

  return app
}

const env = loadEnv()
const app = createApp()

serve({ fetch: app.fetch, port: env.PORT }, (info) => {
  console.log(`[server] listening on http://localhost:${info.port}`)
})
