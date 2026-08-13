import type { StratzMatch, StratzMatchPlayer } from '../stratz/types'
import { gameModeId, lobbyTypeId } from '../stratz/enums'

export interface MatchSummaryFields {
  matchId: number
  startTime: number | null
  duration: number | null
  gameMode: number | null
  lobbyType: number | null
  winningTeam: number | null
  radiantScore: number | null
  direScore: number | null
  parsed: boolean
  timelineJson: {
    networthLeads: number[]
    experienceLeads: number[]
    winRates: number[]
  } | null
  pickBansJson: unknown
  laneReportJson: unknown
  factsJson: {
    firstBloodTime: number | null
    towerStatusRadiant: number | null
    towerStatusDire: number | null
    barracksStatusRadiant: number | null
    barracksStatusDire: number | null
    clusterId: number | null
    gameVersionId: number | null
    numHumanPlayers: number | null
  } | null
}

export interface MatchPlayerRowFields {
  matchId: number
  steamAccountId: number
  playerSlot: number | null
  heroId: number | null
  kills: number | null
  deaths: number | null
  assists: number | null
  lastHits: number | null
  denies: number | null
  gpm: number | null
  xpm: number | null
  netWorth: number | null
  heroDamage: number | null
  towerDamage: number | null
  healing: number | null
  isVictory: boolean | null
  imp: number | null
  position: string | null
  level: number | null
  gold: number | null
  goldSpent: number | null
  itemsJson: {
    items: number[]
    backpack: number[]
    neutral: number
  } | null
  abilitiesJson: Array<{
    abilityId: number
    time: number
    level: number
    isTalent: boolean
  }> | null
  killEventsJson: Array<{
    time: number
    attacker: number
    target?: number | null
    byAbility?: number | null
    byItem?: number | null
    gold?: number | null
    xp?: number | null
    assist?: number[] | null
    isSolo?: boolean
    isGank?: boolean
  }> | null
}

function sum(values: number[] | undefined): number | null {
  if (!values?.length) return null
  return values.reduce((a, b) => a + b, 0)
}

const TIMELINE_SAMPLES = 40

function resample(values: number[] | undefined): number[] {
  if (!values?.length) return []
  if (values.length <= TIMELINE_SAMPLES) return values
  const step = values.length / TIMELINE_SAMPLES
  const out: number[] = []
  for (let i = 0; i < TIMELINE_SAMPLES; i++) {
    out.push(values[Math.min(values.length - 1, Math.floor(i * step))] ?? 0)
  }
  return out
}

function mapTimeline(m: StratzMatch) {
  const networth = resample(m.radiantNetworthLeads)
  const experience = resample(m.radiantExperienceLeads)
  const winRates = resample(m.winRates)
  if (!networth.length && !experience.length && !winRates.length) return null
  return {
    networthLeads: networth,
    experienceLeads: experience,
    winRates,
  }
}

export function mapMatchSummary(m: StratzMatch): MatchSummaryFields {
  return {
    matchId: m.id,
    startTime: m.startDateTime ?? null,
    duration: m.durationSeconds ?? null,
    gameMode: gameModeId(m.gameMode),
    lobbyType: lobbyTypeId(m.lobbyType),
    winningTeam: m.didRadiantWin == null ? null : m.didRadiantWin ? 0 : 1,
    radiantScore: sum(m.radiantKills),
    direScore: sum(m.direKills),
    parsed: Boolean(m.parsedDateTime),
    timelineJson: mapTimeline(m),
    pickBansJson: m.pickBans?.length ? m.pickBans : null,
    laneReportJson: m.laneReport ?? null,
    factsJson: {
      firstBloodTime: m.firstBloodTime ?? null,
      towerStatusRadiant: m.towerStatusRadiant ?? null,
      towerStatusDire: m.towerStatusDire ?? null,
      barracksStatusRadiant: m.barracksStatusRadiant ?? null,
      barracksStatusDire: m.barracksStatusDire ?? null,
      clusterId: m.clusterId ?? null,
      gameVersionId: m.gameVersionId ?? null,
      numHumanPlayers: m.numHumanPlayers ?? null,
    },
  }
}

export function mapMatchSummaryBase(
  m: StratzMatch,
): Pick<
  MatchSummaryFields,
  | 'matchId'
  | 'startTime'
  | 'duration'
  | 'gameMode'
  | 'lobbyType'
  | 'winningTeam'
  | 'radiantScore'
  | 'direScore'
  | 'parsed'
> {
  return {
    matchId: m.id,
    startTime: m.startDateTime ?? null,
    duration: m.durationSeconds ?? null,
    gameMode: gameModeId(m.gameMode),
    lobbyType: lobbyTypeId(m.lobbyType),
    winningTeam: m.didRadiantWin == null ? null : m.didRadiantWin ? 0 : 1,
    radiantScore: sum(m.radiantKills),
    direScore: sum(m.direKills),
    parsed: Boolean(m.parsedDateTime),
  }
}

export function mapMatchPlayerRow(matchId: number, p: StratzMatchPlayer): MatchPlayerRowFields {
  return {
    matchId,
    steamAccountId: p.steamAccountId,
    playerSlot: p.playerSlot ?? null,
    heroId: p.heroId ?? null,
    kills: p.kills ?? null,
    deaths: p.deaths ?? null,
    assists: p.assists ?? null,
    lastHits: p.numLastHits ?? null,
    denies: p.numDenies ?? null,
    gpm: p.goldPerMinute ?? null,
    xpm: p.experiencePerMinute ?? null,
    netWorth: p.networth ?? null,
    heroDamage: p.heroDamage ?? null,
    towerDamage: p.towerDamage ?? null,
    healing: p.heroHealing ?? null,
    isVictory: p.isVictory ?? null,
    imp: p.imp ?? null,
    position: p.position ?? null,
    level: p.level ?? null,
    gold: p.gold ?? null,
    goldSpent: p.goldSpent ?? null,
    itemsJson: mapItems(p),
    abilitiesJson: p.abilities?.length
      ? p.abilities.map((a) => ({
          abilityId: a.abilityId ?? 0,
          time: a.time ?? 0,
          level: a.level ?? 0,
          isTalent: a.isTalent ?? false,
        }))
      : null,
    killEventsJson: p.playbackData?.killEvents?.length
      ? p.playbackData.killEvents.map((k) => ({
          time: k.time ?? 0,
          attacker: k.attacker ?? 0,
          target: k.target ?? null,
          byAbility: k.byAbility ?? null,
          byItem: k.byItem ?? null,
          gold: k.gold ?? null,
          xp: k.xp ?? null,
          assist: k.assist ?? null,
          isSolo: k.isSolo ?? false,
          isGank: k.isGank ?? false,
        }))
      : null,
  }
}

export function mapMatchPlayerSummaryRow(
  matchId: number,
  p: StratzMatchPlayer,
): Pick<
  MatchPlayerRowFields,
  | 'matchId'
  | 'steamAccountId'
  | 'playerSlot'
  | 'heroId'
  | 'kills'
  | 'deaths'
  | 'assists'
  | 'lastHits'
  | 'denies'
  | 'gpm'
  | 'xpm'
  | 'netWorth'
  | 'heroDamage'
  | 'towerDamage'
  | 'healing'
  | 'isVictory'
> {
  return {
    matchId,
    steamAccountId: p.steamAccountId,
    playerSlot: p.playerSlot ?? null,
    heroId: p.heroId ?? null,
    kills: p.kills ?? null,
    deaths: p.deaths ?? null,
    assists: p.assists ?? null,
    lastHits: p.numLastHits ?? null,
    denies: p.numDenies ?? null,
    gpm: p.goldPerMinute ?? null,
    xpm: p.experiencePerMinute ?? null,
    netWorth: p.networth ?? null,
    heroDamage: p.heroDamage ?? null,
    towerDamage: p.towerDamage ?? null,
    healing: p.heroHealing ?? null,
    isVictory: p.isVictory ?? null,
  }
}

function mapItems(p: StratzMatchPlayer) {
  const items = [p.item0Id, p.item1Id, p.item2Id, p.item3Id, p.item4Id, p.item5Id]
    .map((v) => v ?? -1)
    .filter((v) => v > 0)
  if (!items.length && p.neutral0Id == null) return null
  return {
    items,
    backpack: [],
    neutral: p.neutral0Id ?? -1,
  }
}
