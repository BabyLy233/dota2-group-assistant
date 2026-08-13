import { describe, expect, it } from 'vitest'
import { Hono } from 'hono'
import { aiRoutes } from './ai.routes'
import { constantsRoutes } from '../constants/constants.routes'
import { createDb } from '../../db'

function fakeStratz() {
  return {
    getConstants: async () => ({
      heroes: [
        { id: 1, displayName: 'Anti-Mage' },
        { id: 74, displayName: 'Invoker' },
      ],
      gameModes: [{ id: 22, name: 'All Pick' }],
      lobbyTypes: [{ id: 0, name: 'Unranked' }],
      items: [{ id: 116, displayName: 'Black King Bar', shortName: 'black_king_bar' }],
    }),
  }
}

describe('aiRoutes', () => {
  it('returns 400 when AI config is missing', async () => {
    const app = new Hono().route(
      '/',
      aiRoutes({ db: createDb(':memory:'), stratz: fakeStratz() as never }),
    )
    const res = await app.request('/1/analyze', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({}),
    })
    expect(res.status).toBe(400)
    const body = (await res.json()) as { error: string }
    expect(body.error).toBe('missing_ai_config')
  })

  it('returns 400 for invalid match id', async () => {
    const app = new Hono().route(
      '/',
      aiRoutes({ db: createDb(':memory:'), stratz: fakeStratz() as never }),
    )
    const res = await app.request('/abc/analyze', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ baseURL: 'http://x', apiKey: 'k', model: 'm' }),
    })
    expect(res.status).toBe(400)
  })
})

describe('constantsRoutes', () => {
  it('maps heroes and includes items with shortName', async () => {
    const app = new Hono().route('/', constantsRoutes({ stratz: fakeStratz() as never }))
    const res = await app.request('/')
    expect(res.status).toBe(200)
    const body = (await res.json()) as {
      heroes: Array<{ id: number; name: string }>
      items: Array<{ id: number; name: string; shortName: string }>
    }
    expect(body.heroes[0]).toEqual({ id: 1, name: 'Anti-Mage' })
    expect(body.items[0]).toEqual({
      id: 116,
      name: 'Black King Bar',
      shortName: 'black_king_bar',
    })
  })

  it('returns 502 when STRATZ fails', async () => {
    const failing = { getConstants: async () => Promise.reject(new Error('boom')) }
    const app = new Hono().route('/', constantsRoutes({ stratz: failing as never }))
    const res = await app.request('/')
    expect(res.status).toBe(502)
  })
})
