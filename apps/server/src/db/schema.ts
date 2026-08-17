import { sql } from 'drizzle-orm'
import { integer, sqliteTable, text, primaryKey, index, uniqueIndex } from 'drizzle-orm/sqlite-core'
import { MATCH_STATUSES } from '@dota/shared'

export const players = sqliteTable('players', {
  steamAccountId: integer('steam_account_id').primaryKey(),
  steamId: text('steam_id').notNull().unique(),
  name: text('name').notNull(),
  avatar: text('avatar'),
  profileUrl: text('profile_url'),
  favorite: integer('favorite', { mode: 'boolean' }).notNull().default(false),
  createdAt: integer('created_at', { mode: 'timestamp' })
    .notNull()
    .default(sql`(unixepoch())`),
  updatedAt: integer('updated_at', { mode: 'timestamp' })
    .notNull()
    .default(sql`(unixepoch())`),
})

export const playerBindings = sqliteTable(
  'player_bindings',
  {
    platform: text('platform').notNull(),
    userId: text('user_id').notNull(),
    steamAccountId: integer('steam_account_id')
      .notNull()
      .references(() => players.steamAccountId, { onDelete: 'cascade' }),
    createdAt: integer('created_at', { mode: 'timestamp' })
      .notNull()
      .default(sql`(unixepoch())`),
    updatedAt: integer('updated_at', { mode: 'timestamp' })
      .notNull()
      .default(sql`(unixepoch())`),
  },
  (t) => [
    primaryKey({ columns: [t.platform, t.userId] }),
    uniqueIndex('player_bindings_steam_unique').on(t.steamAccountId),
    index('player_bindings_user_idx').on(t.userId),
  ],
)

export const matches = sqliteTable('matches', {
  matchId: integer('match_id').primaryKey(),
  startTime: integer('start_time'),
  duration: integer('duration'),
  gameMode: integer('game_mode'),
  lobbyType: integer('lobby_type'),
  winningTeam: integer('winning_team'),
  radiantScore: integer('radiant_score'),
  direScore: integer('dire_score'),
  parsed: integer('parsed', { mode: 'boolean' }).notNull().default(false),
  status: text('status', { enum: MATCH_STATUSES }).notNull().default('PENDING'),
  lastFetchAt: integer('last_fetch_at', { mode: 'timestamp' }),
  fetchAttempts: integer('fetch_attempts').notNull().default(0),
  errorMessage: text('error_message'),
  rawData: text('raw_data', { mode: 'json' }).$type<unknown>(),
  timelineJson: text('timeline_json', { mode: 'json' }).$type<{
    networthLeads: number[]
    experienceLeads: number[]
    winRates: number[]
  } | null>(),
  pickBansJson: text('pick_bans_json', { mode: 'json' }).$type<unknown>(),
  laneReportJson: text('lane_report_json', { mode: 'json' }).$type<unknown>(),
  factsJson: text('facts_json', { mode: 'json' }).$type<{
    firstBloodTime: number | null
    towerStatusRadiant: number | null
    towerStatusDire: number | null
    barracksStatusRadiant: number | null
    barracksStatusDire: number | null
    clusterId: number | null
    gameVersionId: number | null
    numHumanPlayers: number | null
  } | null>(),
  analysisJson: text('analysis_json', { mode: 'json' }).$type<{
    text: string
    model: string
    baseURL: string
    createdAt: number
  } | null>(),
  analysisStatus: text('analysis_status', { enum: ['NONE', 'PROCESSING', 'COMPLETED', 'FAILED'] })
    .notNull()
    .default('NONE'),
  analysisStartedAt: integer('analysis_started_at', { mode: 'timestamp' }),
  analysisFullStatus: text('analysis_full_status', {
    enum: ['NONE', 'PROCESSING', 'COMPLETED', 'FAILED'],
  })
    .notNull()
    .default('NONE'),
  analysisBriefStatus: text('analysis_brief_status', {
    enum: ['NONE', 'PROCESSING', 'COMPLETED', 'FAILED'],
  })
    .notNull()
    .default('NONE'),
  analysisFullStartedAt: integer('analysis_full_started_at', { mode: 'timestamp' }),
  analysisBriefStartedAt: integer('analysis_brief_started_at', { mode: 'timestamp' }),
  analysisBriefJson: text('analysis_brief_json', { mode: 'json' }).$type<{
    text: string
    model: string
    baseURL: string
    createdAt: number
  } | null>(),
  createdAt: integer('created_at', { mode: 'timestamp' })
    .notNull()
    .default(sql`(unixepoch())`),
  updatedAt: integer('updated_at', { mode: 'timestamp' })
    .notNull()
    .default(sql`(unixepoch())`),
})

export const matchPlayers = sqliteTable(
  'match_players',
  {
    matchId: integer('match_id')
      .notNull()
      .references(() => matches.matchId, { onDelete: 'cascade' }),
    steamAccountId: integer('steam_account_id').notNull(),
    playerSlot: integer('player_slot'),
    heroId: integer('hero_id'),
    kills: integer('kills'),
    deaths: integer('deaths'),
    assists: integer('assists'),
    lastHits: integer('last_hits'),
    denies: integer('denies'),
    gpm: integer('gpm'),
    xpm: integer('xpm'),
    netWorth: integer('net_worth'),
    heroDamage: integer('hero_damage'),
    towerDamage: integer('tower_damage'),
    healing: integer('healing'),
    isVictory: integer('is_victory', { mode: 'boolean' }),
    imp: integer('imp'),
    position: text('position'),
    level: integer('level'),
    gold: integer('gold'),
    goldSpent: integer('gold_spent'),
    itemsJson: text('items_json', { mode: 'json' }).$type<{
      items: number[]
      backpack: number[]
      neutral: number
    } | null>(),
    abilitiesJson: text('abilities_json', { mode: 'json' }).$type<Array<{
      abilityId: number
      time: number
      level: number
      isTalent: boolean
    }> | null>(),
    killEventsJson: text('kill_events_json', { mode: 'json' }).$type<Array<{
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
    }> | null>(),
  },
  (t) => [
    primaryKey({ columns: [t.matchId, t.steamAccountId] }),
    index('match_players_steam_idx').on(t.steamAccountId),
  ],
)
