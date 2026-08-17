import { describe, expect, it } from 'vitest'
import { Hono } from 'hono'
import { loadEnv } from '../../config/env'
import { createDb } from '../../db'
import { matches } from '../../db/schema'
import { matchRoutes } from '../match/match.routes'

function fakeStratz() {
  return { getConstants: async () => ({ heroes: [], gameModes: [], lobbyTypes: [], items: [] }) }
}

function makeEnv() {
  return {
    ...loadEnv(),
    ASTRBOT_API_URL: 'http://127.0.0.1:6185',
    ASTRBOT_API_KEY: 'abk_test',
    ASTRBOT_QQ_GROUP_UMO: 'aiocqhttp_default:GroupMessage:685470084',
  }
}

describe('matchRoutes send-to-qq', () => {
  it('returns 400 for invalid match id', async () => {
    const app = new Hono().route(
      '/',
      matchRoutes({
        db: createDb(':memory:'),
        env: makeEnv(),
        stratz: fakeStratz() as never,
      }),
    )
    const res = await app.request('/abc/send-to-qq', { method: 'POST' })
    expect(res.status).toBe(400)
  })

  it('returns 200 after sending to QQ', async () => {
    const db = createDb(':memory:')
    await db.insert(matches).values({
      matchId: 1,
      status: 'COMPLETED',
      analysisBriefJson: { text: 'brief', model: 'm', baseURL: 'b', createdAt: 1 },
    } as never)
    const fetchImpl = (async () => new Response(JSON.stringify({ ok: true }), { status: 200 })) as
      | typeof fetch
      | undefined
    const app = new Hono().route(
      '/',
      matchRoutes({
        db,
        env: makeEnv(),
        stratz: fakeStratz() as never,
        fetch: fetchImpl,
      }),
    )
    const res = await app.request('/1/send-to-qq', { method: 'POST' })
    expect(res.status).toBe(200)
    const body = (await res.json()) as { ok: boolean; matchId: number }
    expect(body.ok).toBe(true)
    expect(body.matchId).toBe(1)
  })

  it('returns 502 with a meaningful message when AstrBot rejects the request', async () => {
    const db = createDb(':memory:')
    await db.insert(matches).values({
      matchId: 1,
      status: 'COMPLETED',
      analysisBriefJson: { text: 'brief', model: 'm', baseURL: 'b', createdAt: 1 },
    } as never)
    const fetchImpl = (async () =>
      new Response(JSON.stringify({ detail: 'Insufficient API key scope' }), {
        status: 403,
      })) as typeof fetch
    const app = new Hono().route(
      '/',
      matchRoutes({
        db,
        env: makeEnv(),
        stratz: fakeStratz() as never,
        fetch: fetchImpl,
      }),
    )
    const res = await app.request('/1/send-to-qq', { method: 'POST' })
    expect(res.status).toBe(502)
    const body = (await res.json()) as { error: string; message: string }
    expect(body.error).toBe('astrbot_send_failed')
    expect(body.message).toContain('Insufficient API key scope')
  })
})
