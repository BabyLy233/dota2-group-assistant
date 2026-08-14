import { eq } from 'drizzle-orm'
import type { MatchDetail, MatchPlayerDetail } from '@dota/shared'
import type { Db } from '../../db'
import type { AppLogger } from '../../logger'
import { matchPlayers, matches, players } from '../../db/schema'
import type { StratzClient } from '../stratz'
import { accountIdToSteamId } from '../stratz'
import { mapMatchPlayerRow, mapMatchSummary } from './mapper'

export interface MatchServiceDeps {
  db: Db
  stratz: StratzClient
  logger?: AppLogger
}

export async function syncMatch(
  { db, stratz, logger }: MatchServiceDeps,
  matchId: number,
): Promise<MatchDetail> {
  const existing = await db.query.matches.findFirst({
    where: eq(matches.matchId, matchId),
  })
  if (!existing) {
    await db.insert(matches).values({ matchId, status: 'PENDING' })
  }
  const attempts = (existing?.fetchAttempts ?? 0) + 1
  const startedAt = performance.now()
  logger?.info({ matchId, attempts }, 'match sync started')

  try {
    const m = await stratz.getMatch(matchId)
    const isParsed = Boolean(m.parsedDateTime)

    await db
      .update(matches)
      .set({
        ...mapMatchSummary(m),
        parsed: isParsed,
        status: isParsed ? 'COMPLETED' : 'PROCESSING',
        rawData: m,
        lastFetchAt: new Date(),
        fetchAttempts: attempts,
        errorMessage: null,
      })
      .where(eq(matches.matchId, matchId))

    for (const p of m.players ?? []) {
      const row = mapMatchPlayerRow(matchId, p)
      await db
        .insert(matchPlayers)
        .values(row)
        .onConflictDoUpdate({
          target: [matchPlayers.matchId, matchPlayers.steamAccountId],
          set: { ...row, matchId: undefined, steamAccountId: undefined },
        })

      if (p.steamAccount) {
        const steamId = accountIdToSteamId(p.steamAccountId)
        await db
          .insert(players)
          .values({
            steamAccountId: p.steamAccountId,
            steamId,
            name: p.steamAccount.name ?? `player_${p.steamAccountId}`,
            avatar: p.steamAccount.avatar ?? '',
            profileUrl: p.steamAccount.profileUri ?? '',
          })
          .onConflictDoUpdate({
            target: players.steamAccountId,
            set: {
              steamId,
              name: p.steamAccount.name ?? `player_${p.steamAccountId}`,
              avatar: p.steamAccount.avatar ?? '',
              profileUrl: p.steamAccount.profileUri ?? '',
              updatedAt: new Date(),
            },
          })
      }
    }

    const result = (await getMatchDetail(db, matchId))!
    logger?.info(
      {
        matchId,
        attempts,
        parsed: isParsed,
        playerCount: m.players?.length ?? 0,
        durationMs: Math.round(performance.now() - startedAt),
      },
      'match sync completed',
    )
    return result
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err)
    await db
      .update(matches)
      .set({
        status: 'FAILED',
        errorMessage: message.slice(0, 500),
        lastFetchAt: new Date(),
        fetchAttempts: attempts,
      })
      .where(eq(matches.matchId, matchId))
    logger?.error(
      {
        err,
        matchId,
        attempts,
        durationMs: Math.round(performance.now() - startedAt),
      },
      'match sync failed',
    )
    throw err
  }
}

export async function getMatchDetail(db: Db, matchId: number): Promise<MatchDetail | null> {
  const m = await db.query.matches.findFirst({
    where: eq(matches.matchId, matchId),
  })
  if (!m) return null

  const rows = await db
    .select({ mp: matchPlayers, player: players })
    .from(matchPlayers)
    .leftJoin(players, eq(matchPlayers.steamAccountId, players.steamAccountId))
    .where(eq(matchPlayers.matchId, matchId))

  const items: MatchPlayerDetail[] = rows.map(({ mp, player }) => ({
    matchId: mp.matchId,
    steamAccountId: mp.steamAccountId,
    playerSlot: mp.playerSlot,
    heroId: mp.heroId,
    kills: mp.kills,
    deaths: mp.deaths,
    assists: mp.assists,
    lastHits: mp.lastHits,
    denies: mp.denies,
    gpm: mp.gpm,
    xpm: mp.xpm,
    netWorth: mp.netWorth,
    heroDamage: mp.heroDamage,
    towerDamage: mp.towerDamage,
    healing: mp.healing,
    isVictory: mp.isVictory,
    imp: mp.imp,
    name: player?.name ?? null,
    avatar: player?.avatar ?? null,
    steamId: player?.steamId ?? null,
    position: mp.position,
    level: mp.level,
    gold: mp.gold,
    goldSpent: mp.goldSpent,
    items: mp.itemsJson?.items ?? [],
    neutralItem: mp.itemsJson?.neutral ?? null,
    killEvents:
      mp.killEventsJson?.map((k: Record<string, unknown>) => ({
        time: Number(k.time ?? 0),
        attacker: Number(k.attacker ?? 0),
        target: k.target == null ? null : Number(k.target),
        byAbility: k.byAbility == null ? null : Number(k.byAbility),
        byItem: k.byItem == null ? null : Number(k.byItem),
        gold: k.gold == null ? null : Number(k.gold),
        xp: k.xp == null ? null : Number(k.xp),
        assist: Array.isArray(k.assist) ? k.assist.map((a: unknown) => Number(a)) : null,
        isSolo: k.isSolo == null ? null : Boolean(k.isSolo),
        isGank: k.isGank == null ? null : Boolean(k.isGank),
      })) ?? [],
  }))

  return {
    matchId: m.matchId,
    startTime: m.startTime,
    duration: m.duration,
    gameMode: m.gameMode,
    lobbyType: m.lobbyType,
    winningTeam: m.winningTeam,
    radiantScore: m.radiantScore,
    direScore: m.direScore,
    parsed: m.parsed,
    status: m.status,
    rawData: m.rawData ?? null,
    timeline: m.timelineJson ?? null,
    pickBans: m.pickBansJson ?? null,
    laneReport: m.laneReportJson ?? null,
    facts: m.factsJson ?? null,
    analysis: m.analysisJson ?? null,
    brief: m.analysisBriefJson ?? null,
    analysisFullStatus: m.analysisFullStatus ?? 'NONE',
    analysisBriefStatus: m.analysisBriefStatus ?? 'NONE',
    analysisFullStartedAt: m.analysisFullStartedAt ? m.analysisFullStartedAt.getTime() : null,
    analysisBriefStartedAt: m.analysisBriefStartedAt ? m.analysisBriefStartedAt.getTime() : null,
    players: items,
  }
}
