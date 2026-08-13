const GAME_MODE_IDS: Record<string, number> = {
  NONE: 0,
  ALL_PICK: 1,
  CAPTAINS_MODE: 2,
  RANDOM_DRAFT: 3,
  SINGLE_DRAFT: 4,
  ALL_RANDOM: 5,
  INTRO: 6,
  THE_DIRETIDE: 7,
  REVERSE_CAPTAINS_MODE: 8,
  THE_GREEVILING: 9,
  TUTORIAL: 10,
  MID_ONLY: 11,
  LEAST_PLAYED: 12,
  NEW_PLAYER_POOL: 13,
  COMPENDIUM_MATCHMAKING: 14,
  CUSTOM: 15,
  CAPTAINS_DRAFT: 16,
  BALANCED_DRAFT: 17,
  ABILITY_DRAFT: 18,
  EVENT: 19,
  ALL_RANDOM_DEATH_MATCH: 20,
  SOLO_MID: 21,
  ALL_PICK_RANKED: 22,
  TURBO: 23,
  MUTATION: 24,
}

const LOBBY_TYPE_IDS: Record<string, number> = {
  UNRANKED: 0,
  PRACTICE: 1,
  TOURNAMENT: 2,
  TUTORIAL: 3,
  COOP_VS_BOTS: 4,
  TEAM_MATCH: 5,
  SOLO_QUEUE: 6,
  RANKED: 7,
  SOLO_MID: 8,
  BATTLE_CUP: 9,
  EVENT: 10,
  DIRE_TIDE: 11,
}

export function gameModeId(value: number | string | undefined): number | null {
  if (typeof value === 'number') return value
  if (!value) return null
  return GAME_MODE_IDS[value] ?? null
}

export function lobbyTypeId(value: number | string | undefined): number | null {
  if (typeof value === 'number') return value
  if (!value) return null
  return LOBBY_TYPE_IDS[value] ?? null
}
