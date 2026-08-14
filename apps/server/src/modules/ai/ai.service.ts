import { chat } from '@tanstack/ai'
import { openaiCompatibleText } from '@tanstack/ai-openai/compatible'
import { eq } from 'drizzle-orm'
import type { MatchAnalysis, MatchDetail, MatchPlayerDetail } from '@dota/shared'
import { HERO_NAMES_ZH } from '@dota/shared'
import type { Db } from '../../db'
import type { AppLogger } from '../../logger'
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

function buildMatchData(
  d: MatchDetail,
  heroes: Map<number, string>,
  items: Map<number, string>,
): string {
  const l: string[] = []
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

  return l.join('\n')
}

function buildFullPrompt(
  d: MatchDetail,
  heroes: Map<number, string>,
  items: Map<number, string>,
): string {
  const l: string[] = []
  l.push(
    '你是一名资深的 Dota 2 数据分析师。根据下面提供的比赛数据，写一份详细但精炼的中文战报（Markdown 格式），适合在网页中直接阅读。',
  )
  l.push(ZH_ONLY_SYSTEM)
  l.push(
    '输出必须使用以下结构，标题顺序不要改：\n' +
      '# Dota 2 战报：天辉 26 - 9 夜魇（标题按实际比分写）\n' +
      '## 一句话结论\n' +
      '## 阵容与 BP\n' +
      '## 对线期\n' +
      '## 比赛节奏与转折点\n' +
      '## 选手表现\n' +
      '| 位置 | 玩家 | 英雄 | K/D/A | GPM/XPM | IMP | 一句话点评 |\n' +
      '## 胜负关键\n' +
      '## 失败方改进建议',
  )
  l.push(
    '排版要求：\n' +
      '- 一级标题只用于战报标题，二级标题只用于上述小节；正文优先用短段落、列表和表格，不要写大段散文。\n' +
      '- 「一句话结论」必须用一句话直接概括胜负走向。\n' +
      '- 「选手表现」输出 10 行 Markdown 表格，列为「位置 | 玩家 | 英雄 | K/D/A | GPM/XPM | IMP | 一句话点评」，每行点评 8~15 字并给出明确评价。\n' +
      '- 用 **加粗** 突出胜负关键、转折点和最有价值/最拉胯的数据，不要通篇加粗。\n' +
      '- 全文控制在 1000 字左右，信息密度高；不要复述原始数据表，不要写开场白、客套语、自我介绍或结束语。',
  )
  l.push(buildMatchData(d, heroes, items))
  l.push('请直接按上面的结构和排版要求输出完整战报，不要输出“以下是分析”之类的前缀。')
  return l.join('\n')
}

function buildBriefPrompt(
  d: MatchDetail,
  heroes: Map<number, string>,
  items: Map<number, string>,
): string {
  return [
    '你是一名资深的 Dota 2 数据分析师。根据下面提供的比赛数据，写一份适合直接发 QQ 群的犀利中文简报（Markdown 格式）。',
    ZH_ONLY_SYSTEM,
    '比赛数据如下：',
    buildMatchData(d, heroes, items),
    '',
    '---',
    '',
    '现在写「QQ 群简报」，直接输出以下三个部分，总字数 150~250 字：',
    '**一句话总评**',
    '一句话点出本局结果和最重要反差，20~35 字。',
    '**选手点评**',
    '| 位置 | 玩家 | 英雄 | 一句点评 |',
    '10 行（天辉 5 人 + 夜魇 5 人），每行点评 10~15 字，必须包含关键数据或表现结论。',
    '**甩锅与邀功**',
    '- **背锅位**：玩家 + 数据依据；',
    '- **Carry 位**：玩家 + 数据依据。',
    '排版要求：',
    '- 不要输出代码块，不要写比赛过程总结、不要写阵容分析、不要写 BP 评价、不要写改进建议、不要任何开场白或结尾客套话。',
    '- 点评要犀利毒舌、点到为止，全中文；玩家名和英雄名除外。',
  ].join('\n')
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
  deps: { db: Db; stratz: StratzClient; logger?: AppLogger },
  matchId: number,
  config: AiConfig,
  type: AnalysisType = 'full',
  force = false,
): AsyncGenerator<AnalyzeStreamEvent> {
  const operationStartedAt = performance.now()
  deps.logger?.info({ matchId, type, force }, 'ai analysis started')

  const row = await deps.db.query.matches.findFirst({
    where: eq(matches.matchId, matchId),
  })
  if (!row) {
    deps.logger?.warn({ matchId, type }, 'ai analysis requested for missing match')
    throw new AiMatchNotFoundError(matchId)
  }
  if (row.status !== 'COMPLETED') {
    deps.logger?.warn(
      { matchId, type, status: row.status },
      'ai analysis requested for unparsed match',
    )
    throw new AiMatchNotReadyError(matchId, row.status)
  }

  const cached = type === 'brief' ? row.analysisBriefJson : row.analysisJson
  if (!force && cached) {
    deps.logger?.info({ matchId, type }, 'ai analysis served from cache')
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
      deps.logger?.warn({ matchId, type }, 'ai analysis already in progress')
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

    deps.logger?.info(
      {
        matchId,
        type,
        model: config.model,
        characters: analysis.text.length,
        durationMs: Math.round(performance.now() - operationStartedAt),
      },
      'ai analysis completed',
    )

    yield { kind: 'done', analysis, cached: false }
  } catch (err) {
    await deps.db
      .update(matches)
      .set({ [statusCol]: 'FAILED', [startedAtCol]: null })
      .where(eq(matches.matchId, matchId))
    deps.logger?.error(
      {
        err,
        matchId,
        type,
        model: config.model,
        durationMs: Math.round(performance.now() - operationStartedAt),
      },
      'ai analysis failed',
    )
    throw err
  }
}
