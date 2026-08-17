import type { Env } from '../../config/env'
import type { Db } from '../../db'
import { getMatchDetail } from '../match/match.service'

export class AstrbotConfigError extends Error {}
export class AstrbotMatchNotFoundError extends Error {}
export class AstrbotMatchNotReadyError extends Error {}
export class AstrbotNoAnalysisError extends Error {}
export class AstrbotSendError extends Error {}

export interface AstrbotServiceDeps {
  db: Db
  env: Env
  fetch?: typeof fetch
}

export async function sendMatchAnalysisToQq(
  deps: AstrbotServiceDeps,
  matchId: number,
): Promise<{ matchId: number; umo: string; sentAt: number }> {
  const { env, db } = deps
  const apiKey = env.ASTRBOT_API_KEY?.trim()
  const umo = env.ASTRBOT_QQ_GROUP_UMO
  if (!apiKey) {
    throw new AstrbotConfigError('未配置 ASTRBOT_API_KEY，无法发送 QQ 群消息')
  }
  if (!umo.trim()) {
    throw new AstrbotConfigError('未配置 ASTRBOT_QQ_GROUP_UMO，无法发送 QQ 群消息')
  }

  const detail = await getMatchDetail(db, matchId)
  if (!detail) {
    throw new AstrbotMatchNotFoundError('未找到该比赛')
  }
  if (detail.status !== 'COMPLETED') {
    throw new AstrbotMatchNotReadyError('比赛尚未解析完成，无法发送战报')
  }

  const text = detail.brief?.text?.trim() || detail.analysis?.text?.trim()
  if (!text) {
    throw new AstrbotNoAnalysisError('该比赛还没有可发送的 AI 分析，请先生成分析')
  }

  const fetchFn = deps.fetch ?? fetch
  const controller = new AbortController()
  const timeout = setTimeout(() => controller.abort(), 15_000)
  let response: Response
  try {
    response = await fetchFn(`${env.ASTRBOT_API_URL}/api/v1/im/message`, {
      method: 'POST',
      headers: {
        authorization: `Bearer ${apiKey}`,
        'content-type': 'application/json',
      },
      body: JSON.stringify({ umo, message: text }),
      signal: controller.signal,
    })
  } catch (err) {
    throw new AstrbotSendError(
      `AstrBot 请求失败：${err instanceof Error ? err.message : String(err)}`,
    )
  } finally {
    clearTimeout(timeout)
  }

  if (!response.ok) {
    let detailMessage = ''
    try {
      const body = (await response.json()) as { message?: string; detail?: string }
      detailMessage = body.message ?? body.detail ?? ''
    } catch {
      // non-JSON error body
    }
    throw new AstrbotSendError(
      `AstrBot 返回 ${response.status}${detailMessage ? `：${detailMessage}` : ''}`,
    )
  }

  return { matchId, umo, sentAt: Date.now() }
}
