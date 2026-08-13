export const MATCH_STATUSES = ['PENDING', 'PROCESSING', 'COMPLETED', 'FAILED'] as const

export type MatchStatus = (typeof MATCH_STATUSES)[number]

export interface MatchSummary {
  matchId: number
  startTime: number | null
  duration: number | null
  gameMode: number | null
  lobbyType: number | null
  winningTeam: number | null
  radiantScore: number | null
  direScore: number | null
  parsed: boolean
  status: MatchStatus
}

export interface MatchPlayerSummary {
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
}

export interface MatchPlayerDetail extends MatchPlayerSummary {
  name: string | null
  avatar: string | null
  position: string | null
  level: number | null
  gold: number | null
  goldSpent: number | null
  items: number[]
  neutralItem: number | null
  killEvents: Array<{
    time: number
    attacker: number
    target: number | null
    byAbility: number | null
    byItem: number | null
    gold: number | null
    xp: number | null
    assist: number[] | null
    isSolo: boolean | null
    isGank: boolean | null
  }>
}

export interface MatchTimeline {
  networthLeads: number[]
  experienceLeads: number[]
  winRates: number[]
}

export interface MatchAnalysis {
  text: string
  model: string
  baseURL: string
  createdAt: number
}

export type MatchAnalysisStatus = 'NONE' | 'PROCESSING' | 'COMPLETED' | 'FAILED'

export interface MatchFacts {
  firstBloodTime: number | null
  towerStatusRadiant: number | null
  towerStatusDire: number | null
  barracksStatusRadiant: number | null
  barracksStatusDire: number | null
  clusterId: number | null
  gameVersionId: number | null
  numHumanPlayers: number | null
}

export interface MatchDetail {
  matchId: number
  startTime: number | null
  duration: number | null
  gameMode: number | null
  lobbyType: number | null
  winningTeam: number | null
  radiantScore: number | null
  direScore: number | null
  parsed: boolean
  status: MatchStatus
  rawData: unknown
  timeline: MatchTimeline | null
  pickBans: unknown
  laneReport: unknown
  facts: MatchFacts | null
  analysis: MatchAnalysis | null
  brief: MatchAnalysis | null
  analysisFullStatus: MatchAnalysisStatus
  analysisBriefStatus: MatchAnalysisStatus
  analysisFullStartedAt: number | null
  analysisBriefStartedAt: number | null
  players: MatchPlayerDetail[]
}

export interface MatchListItem {
  matchId: number
  startTime: number | null
  duration: number | null
  gameMode: number | null
  lobbyType: number | null
  winningTeam: number | null
  radiantScore: number | null
  direScore: number | null
  parsed: boolean
  status: MatchStatus
  heroId: number | null
  kills: number | null
  deaths: number | null
  assists: number | null
  gpm: number | null
  xpm: number | null
  netWorth: number | null
  isVictory: boolean | null
  imp: number | null
}

export interface MatchListResponse {
  items: MatchListItem[]
  total: number
  page: number
  pageSize: number
}
