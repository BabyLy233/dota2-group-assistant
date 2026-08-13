export interface StratzPlayerInfo {
  steamId: string
  accountId: number
  name: string
  avatar: string
  profileUrl: string
}

export interface StratzSteamAccount {
  id?: number | string
  name?: string
  avatar?: string
  profileUri?: string
}

export interface StratzPlayer {
  steamAccountId: number
  names?: Array<{ name?: string }>
  steamAccount?: StratzSteamAccount
}

export interface StratzMatchPlayer {
  steamAccountId: number
  playerSlot?: number
  heroId?: number
  kills?: number
  deaths?: number
  assists?: number
  numLastHits?: number
  numDenies?: number
  goldPerMinute?: number
  networth?: number
  experiencePerMinute?: number
  heroDamage?: number
  towerDamage?: number
  heroHealing?: number
  isVictory?: boolean
  imp?: number
  position?: string
  level?: number
  gold?: number
  goldSpent?: number
  item0Id?: number
  item1Id?: number
  item2Id?: number
  item3Id?: number
  item4Id?: number
  item5Id?: number
  neutral0Id?: number
  abilities?: Array<{
    abilityId?: number
    time?: number
    level?: number
    isTalent?: boolean
  }>
  playbackData?: {
    killEvents?: Array<{
      time?: number
      attacker?: number
      target?: number
      byAbility?: number
      byItem?: number
      gold?: number
      xp?: number
      assist?: number[] | null
      isSolo?: boolean
      isGank?: boolean
    }>
  }
  steamAccount?: StratzSteamAccount
}

export interface StratzMatch {
  id: number
  startDateTime?: number
  durationSeconds?: number
  gameMode?: number | string
  lobbyType?: number | string
  radiantKills?: number[]
  direKills?: number[]
  didRadiantWin?: boolean
  parsedDateTime?: number
  firstBloodTime?: number
  towerStatusRadiant?: number
  towerStatusDire?: number
  barracksStatusRadiant?: number
  barracksStatusDire?: number
  clusterId?: number
  gameVersionId?: number
  numHumanPlayers?: number
  radiantNetworthLeads?: number[]
  radiantExperienceLeads?: number[]
  winRates?: number[]
  pickBans?: Array<{
    isPick?: boolean
    heroId?: number | null
    bannedHeroId?: number | null
    order?: number | null
    isRadiant?: boolean | null
    wasBannedSuccessfully?: boolean
  }>
  laneReport?: unknown
  players?: StratzMatchPlayer[]
}

export interface StratzMatchGroupRequest {
  take?: number
  skip?: number
}

export interface GetPlayerResponse {
  player: StratzPlayer | null
}

export interface GetPlayerMatchesResponse {
  player: {
    matches: StratzMatch[] | null
  } | null
}

export interface GetMatchResponse {
  match: StratzMatch | null
}
