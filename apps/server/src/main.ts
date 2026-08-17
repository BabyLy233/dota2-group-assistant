import { randomUUID } from 'node:crypto'
import { serve } from '@hono/node-server'
import { Hono } from 'hono'
import { cors } from 'hono/cors'
import { sql } from 'drizzle-orm'
import { loadEnv, type Env } from './config/env'
import { createDb } from './db'
import { createLogger, type AppLogger } from './logger'
import { playerRoutes } from './modules/player/player.routes'
import { matchRoutes } from './modules/match/match.routes'
import { constantsRoutes } from './modules/constants/constants.routes'
import { aiRoutes } from './modules/ai/ai.routes'
import { stratzRoutes } from './modules/stratz/stratz.routes'
import { StratzClient } from './modules/stratz'
import { bindingRoutes } from './modules/binding/binding.routes'

type AppVariables = {
  requestId: string
  requestStart: number
}

type AppEnv = {
  Variables: AppVariables
}

function createApp(env: Env, logger: AppLogger) {
  const db = createDb(env.DATABASE_PATH)
  const stratz = new StratzClient({ apiKey: env.STRATZ_API_KEY, logger })

  const app = new Hono<AppEnv>()

  app.use('*', async (c, next) => {
    const requestId = c.req.header('x-request-id') ?? randomUUID()
    const requestStart = performance.now()
    c.set('requestId', requestId)
    c.set('requestStart', requestStart)
    c.header('x-request-id', requestId)

    await next()

    logger.info(
      {
        requestId,
        method: c.req.method,
        path: c.req.path,
        status: c.res.status,
        durationMs: Math.round(performance.now() - requestStart),
      },
      'http request completed',
    )
  })

  app.onError((err, c) => {
    const requestId = c.get('requestId')
    const requestStart = c.get('requestStart')
    logger.error(
      {
        err,
        requestId,
        method: c.req.method,
        path: c.req.path,
        durationMs: Math.round(performance.now() - requestStart),
      },
      'unhandled request error',
    )
    c.header('x-request-id', requestId)
    return c.json(
      {
        error: 'internal_error',
        message: err instanceof Error ? err.message : String(err),
      },
      500,
    )
  })

  app.use('/api/*', cors())

  app.get('/api/health', (c) => {
    db.run(sql`select 1`)
    return c.json({ ok: true, db: 'ok' })
  })

  app.route('/api/players', playerRoutes({ db, env, stratz, logger }))
  app.route('/api/bindings', bindingRoutes({ db }))
  app.route('/api/matches', matchRoutes({ db, env, stratz, logger }))
  app.route('/api/constants', constantsRoutes({ stratz, logger }))
  app.route('/api/ai', aiRoutes({ db, stratz, logger }))
  app.route('/api/stratz', stratzRoutes(stratz))

  return app
}

const env = loadEnv()
const logger = createLogger(env.LOG_LEVEL)
const app = createApp(env, logger)

serve({ fetch: app.fetch, port: env.PORT }, (info) => {
  logger.info({ port: info.port }, 'server listening')
})
