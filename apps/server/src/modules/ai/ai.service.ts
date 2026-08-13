import { chat } from '@tanstack/ai'
import { openaiCompatibleText } from '@tanstack/ai-openai/compatible'
import { eq } from 'drizzle-orm'
import type { MatchAnalysis, MatchDetail, MatchPlayerDetail } from '@dota/shared'
import { HERO_NAMES_ZH } from '@dota/shared'
import type { Db } from '../../db'
import { matches } from '../../db/schema'
import type { StratzClient } from '../stratz'
import { getMatchDetail } from '../match/match.service'

export interface AiConfig {
  baseURL: string
  apiKey: string
  model: string
}

export type AnalysisType = 'full' | 'brief'

export class AiMatchNotFoundError extends Error {
  constructor(matchId: number) {
    super(`Match not found: ${matchId}`)
    this.name = 'AiMatchNotFoundError'
  }
}

export class AiMatchNotReadyError extends Error {
  constructor(matchId: number, status: string) {
    super(`Match ${matchId} is not ready for analysis (status: ${status})`)
    this.name = 'AiMatchNotReadyError'
  }
}

export class AiInProgressError extends Error {
  constructor() {
    super('该比赛正在分析中，请稍候')
    this.name = 'AiInProgressError'
  }
}

export class AiProviderError extends Error {
  constructor(message: string) {
    super(message)
    this.name = 'AiProviderError'
  }
}

const TIMELINE_SAMPLES = 8

const PROCESSING_TTL_MS = 3 * 60 * 1000

function sample(values: number[] | undefined): number[] {
  if (!values?.length) return []
  if (values.length <= TIMELINE_SAMPLES) return values
  const step = values.length / TIMELINE_SAMPLES
  const out: number[] = []
  for (let i = 0; i < TIMELINE_SAMPLES; i++) {
    out.push(values[Math.min(values.length - 1, Math.floor(i * step))] ?? 0)
  }
  return out
}

function fmtDuration(seconds: number | null): string {
  if (seconds == null) return '?'
  return `${Math.floor(seconds / 60)}分${seconds % 60}秒`
}

function positionLabel(position: string | null): string {
  if (!position) return '-'
  const m = /POSITION_([1-5])/.exec(position)
  return m?.[1] ? `${m[1]}号位` : position
}

interface PickBanItem {
  isPick?: boolean
  heroId?: number | null
  bannedHeroId?: number | null
  isRadiant?: boolean | null
  wasBannedSuccessfully?: boolean
}

function heroName(heroId: number | null | undefined, heroes: Map<number, string>): string {
  if (heroId == null) return '?'
  const en = heroes.get(heroId)
  if (!en) return `英雄${heroId}`
  return HERO_NAMES_ZH[en] ?? en
}

const ZH_ONLY_SYSTEM =
  '所有输出内容必须使用简体中文，不要夹杂英文（玩家名称、英雄中文名、必要的数值单位缩写如 GPM/XPM/IMP 除外）。'

function buildFullPrompt(
  d: MatchDetail,
  heroes: Map<number, string>,
  items: Map<number, string>,
): string {
  const l: string[] = []
  l.push(
    '你是一名资深的 Dota 2 数据分析师。根据下面提供的比赛数据，写一份详细的中文战报分析（Markdown 格式），' +
      '包括：1) 阵容分析与 BP 评价 2) 对线期表现 3) 比赛节奏与转折点 4) 各位置选手表现点评 5) 胜负关键原因 6) 给失败方的改进建议。',
  )
  l.push(ZH_ONLY_SYSTEM)
  l.push(
    '直接输出分析正文，严禁任何开场白、客套语、自我介绍或结束语（如"好的，""以下是""希望有帮助"等）。',
  )

  const winner =
    d.winningTeam == null ? '未知' : d.winningTeam === 0 ? 'Radiant（天辉）' : 'Dire（夜魇）'
  l.push(
    `【比赛信息】MatchID: ${d.matchId} | 时长: ${fmtDuration(d.duration)} | 模式: ${d.gameMode ?? '?'} | 房型: ${d.lobbyType ?? '?'} | 比分: ${d.radiantScore ?? '-'}:${d.direScore ?? '-'} | 胜方: ${winner} | 一血时间: ${d.facts?.firstBloodTime ?? '-'}秒 | 游戏版本: ${d.facts?.gameVersionId ?? '-'}`,
  )

  const pickBans = (d.pickBans as PickBanItem[] | null) ?? []
  const picks = pickBans.filter((p) => p.isPick && p.heroId != null)
  const bans = pickBans.filter((p) => !p.isPick && p.bannedHeroId != null)
  if (picks.length) {
    const radiant = picks.filter((p) => p.isRadiant).map((p) => heroName(p.heroId, heroes))
    const dire = picks.filter((p) => !p.isRadiant).map((p) => heroName(p.heroId, heroes))
    l.push(`【BP】选人 天辉: ${radiant.join('、')} | 夜魇: ${dire.join('、')}`)
  }
  if (bans.length) {
    l.push(`【BP】禁用: ${bans.map((b) => heroName(b.bannedHeroId, heroes)).join('、')}`)
  }

  if (d.timeline?.networthLeads.length) {
    l.push(`【经济领先曲线】(每分钟, 正值=天辉领先): ${d.timeline.networthLeads.join(',')}`)
    l.push(`【经验领先曲线】: ${sample(d.timeline.experienceLeads).join(',')}`)
    l.push(`【胜率曲线】(每分钟, >0.5=天辉占优): ${d.timeline.winRates.join(',')}`)
  }

  const playerByHero = new Map<number, MatchPlayerDetail>()
  for (const p of d.players) {
    if (p.heroId != null) playerByHero.set(p.heroId, p)
  }

  l.push(
    '【玩家数据】(阵营/玩家/英雄/位置/击杀-死亡-助攻/补刀/反补/GPM/XPM/净收入/英雄伤害/治疗/IMP/装备):',
  )
  for (const p of [...d.players].sort((a, b) => (a.playerSlot ?? 0) - (b.playerSlot ?? 0))) {
    const side = (p.playerSlot ?? 0) < 5 ? '天辉' : '夜魇'
    const hName = heroName(p.heroId, heroes)
    const equip = p.items
      .map((id) => items.get(id) ?? `物品${id}`)
      .filter(Boolean)
      .join(',')
    l.push(
      `${side} | ${p.name ?? `玩家${p.steamAccountId}`} | ${hName} | ${positionLabel(p.position)} | ${p.kills ?? '-'}-${p.deaths ?? '-'}-${p.assists ?? '-'} | 补${p.lastHits ?? '-'}反${p.denies ?? '-'} | ${p.gpm ?? '-'}GPM ${p.xpm ?? '-'}XPM | 净${p.netWorth ?? '-'} | 伤${p.heroDamage ?? '-'} 治${p.healing ?? '-'} | IMP ${p.imp ?? '-'} | 装备: ${equip || '-'}`,
    )
  }

  const kills: Array<{
    time: number
    attacker: number
    target: number | null
    assist: number[] | null
    isSolo: boolean | null
    isGank: boolean | null
  }> = []
  for (const p of d.players) {
    for (const k of p.killEvents) {
      kills.push({
        time: k.time,
        attacker: k.attacker,
        target: k.target,
        assist: k.assist,
        isSolo: k.isSolo,
        isGank: k.isGank,
      })
    }
  }
  kills.sort((a, b) => a.time - b.time)
  if (kills.length) {
    l.push('【击杀时间线】(时间/击杀者→目标/助攻/标记):')
    for (const k of kills) {
      const a = playerByHero.get(k.attacker)
      const t =
        k.target != null ? (playerByHero.get(k.target)?.name ?? heroName(k.target, heroes)) : '?'
      const tags = [
        k.isSolo ? '单杀' : '',
        k.isGank ? 'Gank' : '',
        k.assist?.length ? `${k.assist.length}助攻` : '',
      ]
        .filter(Boolean)
        .join('+')
      const attackerName = a
        ? `${a.name}（${heroName(k.attacker, heroes)}）`
        : heroName(k.attacker, heroes)
      l.push(
        `- ${Math.floor(k.time / 60)}:${String(k.time % 60).padStart(2, '0')} ${attackerName} 击杀 ${t}${tags ? ` [${tags}]` : ''}`,
      )
    }
  }

  l.push(
    '请输出完整的分析报告，要求：结构清晰、数据引用准确、语言精炼有洞察力，不要复述原始数据表。',
  )
  return l.join('\n')
}

function buildBriefPrompt(
  d: MatchDetail,
  heroes: Map<number, string>,
  items: Map<number, string>,
): string {
  const full = buildFullPrompt(d, heroes, items)
  return (
    full +
    '\n\n---\n\n' +
    '现在请写一份「QQ 群简报」，只包含以下两部分，总字数 250~350 字：\n' +
    '一、各位置选手表现点评表：Markdown 表格，10 行（天辉 5 人 + 夜魇 5 人），列格式为「位置 | 玩家 | 英雄 | 一句点评」。每行点评必须控制在 15 字以内，犀利毒舌、点到为止，全中文。\n' +
    '二、《甩锅与邀功》两句话：\n' +
    '  - 背锅位：点名玩家 + 一句数据依据；\n' +
    '  - Carry 位：点名玩家 + 一句数据依据。\n' +
    '严禁：不要写比赛过程总结、不要写阵容分析、不要写 BP 评价、不要写改进建议、不要任何开场白或结尾客套话——直接输出表格和甩锅邀功两部分即可。\n' +
    ZH_ONLY_SYSTEM
  )
}

export function buildPrompt(
  type: AnalysisType,
  d: MatchDetail,
  heroes: Map<number, string>,
  items: Map<number, string>,
): string {
  return type === 'brief' ? buildBriefPrompt(d, heroes, items) : buildFullPrompt(d, heroes, items)
}

export interface AnalyzeResult {
  analysis: MatchAnalysis
  cached: boolean
}

export type AnalyzeStreamEvent =
  | { kind: 'delta'; content: string }
  | { kind: 'done'; analysis: MatchAnalysis; cached: boolean }

export async function* streamAnalyze(
  deps: { db: Db; stratz: StratzClient },
  matchId: number,
  config: AiConfig,
  type: AnalysisType = 'full',
  force = false,
): AsyncGenerator<AnalyzeStreamEvent> {
  const row = await deps.db.query.matches.findFirst({
    where: eq(matches.matchId, matchId),
  })
  if (!row) throw new AiMatchNotFoundError(matchId)
  if (row.status !== 'COMPLETED') {
    throw new AiMatchNotReadyError(matchId, row.status)
  }

  const cached = type === 'brief' ? row.analysisBriefJson : row.analysisJson
  if (!force && cached) {
    yield { kind: 'done', analysis: cached, cached: true }
    return
  }

  const statusCol = type === 'brief' ? 'analysisBriefStatus' : 'analysisFullStatus'
  const startedAtCol = type === 'brief' ? 'analysisBriefStartedAt' : 'analysisFullStartedAt'
  const status = row[statusCol]
  const startedAt = row[startedAtCol] ? new Date(row[startedAtCol]).getTime() : 0
  if (status === 'PROCESSING') {
    const stuck = startedAt === 0 || Date.now() - startedAt > PROCESSING_TTL_MS
    if (!force && !stuck) {
      throw new AiInProgressError()
    }
  }

  await deps.db
    .update(matches)
    .set({ [statusCol]: 'PROCESSING', [startedAtCol]: new Date() })
    .where(eq(matches.matchId, matchId))

  try {
    const detail = (await getMatchDetail(deps.db, matchId))!
    const constants = await deps.stratz.getConstants()
    const heroes = new Map(constants.heroes.map((h) => [h.id, h.displayName]))
    const items = new Map(constants.items.map((i) => [i.id, i.displayName]))
    const prompt = buildPrompt(type, detail, heroes, items)

    let full = ''
    try {
      const stream = chat({
        adapter: openaiCompatibleText(config.model, {
          baseURL: config.baseURL,
          apiKey: config.apiKey,
        }),
        messages: [{ role: 'user', content: prompt }],
      })
      for await (const chunk of stream) {
        if (
          (chunk as { type?: string }).type === 'TEXT_MESSAGE_CONTENT' &&
          (chunk as { delta?: string }).delta
        ) {
          full += (chunk as { delta: string }).delta
          yield { kind: 'delta', content: (chunk as { delta: string }).delta }
        }
      }
    } catch (err) {
      throw new AiProviderError(err instanceof Error ? err.message : String(err))
    }
    if (!full.trim()) {
      throw new AiProviderError('模型返回了空内容，请检查 API 配置或稍后重试')
    }

    const analysis: MatchAnalysis = {
      text: full.trim(),
      model: config.model,
      baseURL: config.baseURL,
      createdAt: Date.now(),
    }
    await deps.db
      .update(matches)
      .set({
        [statusCol]: 'COMPLETED',
        [startedAtCol]: null,
        ...(type === 'brief' ? { analysisBriefJson: analysis } : { analysisJson: analysis }),
      })
      .where(eq(matches.matchId, matchId))

    yield { kind: 'done', analysis, cached: false }
  } catch (err) {
    await deps.db
      .update(matches)
      .set({ [statusCol]: 'FAILED', [startedAtCol]: null })
      .where(eq(matches.matchId, matchId))
    throw err
  }
}
