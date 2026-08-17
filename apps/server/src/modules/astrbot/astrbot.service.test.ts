import { describe, expect, it } from 'vitest'
import { loadEnv } from '../../config/env'
import { createDb } from '../../db'
import { matches } from '../../db/schema'
import {
  AstrbotConfigError,
  AstrbotMatchNotFoundError,
  AstrbotMatchNotReadyError,
  AstrbotNoAnalysisError,
  AstrbotSendError,
  sendMatchAnalysisToQq,
} from './astrbot.service'

function makeDeps(fetchImpl?: typeof fetch) {
  return {
    db: createDb(':memory:'),
    env: {
      ...loadEnv(),
      ASTRBOT_API_URL: 'http://127.0.0.1:6185',
      ASTRBOT_API_KEY: 'abk_test',
      ASTRBOT_QQ_GROUP_UMO: 'aiocqhttp_default:GroupMessage:685470084',
    },
    fetch:
      fetchImpl ??
      (async () =>
        new Response(JSON.stringify({ ok: true }), {
          status: 200,
          headers: { 'content-type': 'application/json' },
        })),
  }
}

async function seedMatch(
  deps: ReturnType<typeof makeDeps>,
  matchId: number,
  fields: Record<string, unknown> = {},
) {
  await deps.db.insert(matches).values({ matchId, status: 'COMPLETED', ...fields } as never)
}

describe('sendMatchAnalysisToQq', () => {
  it('throws AstrbotConfigError when API key is missing', async () => {
    const deps = makeDeps()
    deps.env.ASTRBOT_API_KEY = ''
    await expect(sendMatchAnalysisToQq(deps, 1)).rejects.toBeInstanceOf(AstrbotConfigError)
  })

  it('throws AstrbotMatchNotFoundError for unknown match', async () => {
    const deps = makeDeps()
    await expect(sendMatchAnalysisToQq(deps, 9999999999)).rejects.toBeInstanceOf(
      AstrbotMatchNotFoundError,
    )
  })

  it('throws AstrbotMatchNotReadyError when match is not completed', async () => {
    const deps = makeDeps()
    await deps.db.insert(matches).values({ matchId: 1, status: 'PENDING' } as never)
    await expect(sendMatchAnalysisToQq(deps, 1)).rejects.toBeInstanceOf(AstrbotMatchNotReadyError)
  })

  it('throws AstrbotNoAnalysisError when no analysis exists', async () => {
    const deps = makeDeps()
    await seedMatch(deps, 1)
    await expect(sendMatchAnalysisToQq(deps, 1)).rejects.toBeInstanceOf(AstrbotNoAnalysisError)
  })

  it('sends brief text and returns success', async () => {
    let captured: RequestInit | undefined
    const fetchImpl = (async (url: string | URL | Request, init?: RequestInit) => {
      captured = init
      expect(url.toString()).toBe('http://127.0.0.1:6185/api/v1/im/message')
      return new Response(JSON.stringify({ ok: true }), { status: 200 })
    }) as typeof fetch
    const deps = makeDeps(fetchImpl)
    await seedMatch(deps, 1, {
      analysisBriefJson: { text: 'brief text', model: 'm', baseURL: 'b', createdAt: 1 },
      analysisJson: { text: 'full text', model: 'm', baseURL: 'b', createdAt: 1 },
    })

    const result = await sendMatchAnalysisToQq(deps, 1)

    expect(result.matchId).toBe(1)
    expect(result.umo).toBe('aiocqhttp_default:GroupMessage:685470084')
    expect(typeof result.sentAt).toBe('number')
    expect(captured?.method).toBe('POST')
    expect(captured?.headers).toMatchObject({
      authorization: 'Bearer abk_test',
      'content-type': 'application/json',
    })
    expect(JSON.parse(String(captured?.body))).toEqual({
      umo: 'aiocqhttp_default:GroupMessage:685470084',
      message: 'brief text',
    })
  })

  it('falls back to full analysis when brief is unavailable', async () => {
    const fetchImpl = (async (_url: string | URL | Request, init?: RequestInit) => {
      const body = JSON.parse(String(init?.body)) as { message: string }
      expect(body.message).toBe('full text')
      return new Response(JSON.stringify({ ok: true }), { status: 200 })
    }) as typeof fetch
    const deps = makeDeps(fetchImpl)
    await seedMatch(deps, 1, {
      analysisJson: { text: 'full text', model: 'm', baseURL: 'b', createdAt: 1 },
    })
    await sendMatchAnalysisToQq(deps, 1)
  })

  it('throws AstrbotSendError when fetch fails', async () => {
    const deps = makeDeps(async () => {
      throw new Error('connection refused')
    })
    await seedMatch(deps, 1, {
      analysisBriefJson: { text: 'brief text', model: 'm', baseURL: 'b', createdAt: 1 },
    })
    await expect(sendMatchAnalysisToQq(deps, 1)).rejects.toBeInstanceOf(AstrbotSendError)
  })

  it('throws AstrbotSendError with upstream message on HTTP error', async () => {
    const fetchImpl = (async () =>
      new Response(JSON.stringify({ detail: 'Insufficient API key scope' }), {
        status: 403,
        headers: { 'content-type': 'application/json' },
      })) as typeof fetch
    const deps = makeDeps(fetchImpl)
    await seedMatch(deps, 1, {
      analysisBriefJson: { text: 'brief text', model: 'm', baseURL: 'b', createdAt: 1 },
    })
    await expect(sendMatchAnalysisToQq(deps, 1)).rejects.toMatchObject({
      message: expect.stringContaining('Insufficient API key scope'),
    })
  })
})
