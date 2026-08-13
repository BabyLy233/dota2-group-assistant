import { count, desc, eq } from 'drizzle-orm'
import type { MatchListItem, MatchListResponse, Player } from '@dota/shared'
import type { Db } from '../../db'
import { matchPlayers, matches, players } from '../../db/schema'
import type { StratzClient } from '../stratz'
import { steamIdToAccountId } from '../stratz'
import { mapMatchPlayerSummaryRow, mapMatchSummaryBase } from '../match/mapper'

export interface PlayerServiceDeps {
  db: Db
  stratz: StratzClient
}

export async function syncPlayer(
  { db, stratz }: PlayerServiceDeps,
  steamId: string,
): Promise<Player> {
  const accountId = steamIdToAccountId(steamId)
  const player = await stratz.getPlayer(steamId)
  await db
    .insert(players)
    .values({
      steamAccountId: accountId,
      steamId,
      name: player.name,
      avatar: player.avatar,
      profileUrl: player.profileUrl,
    })
    .onConflictDoUpdate({
      target: players.steamAccountId,
      set: {
        steamId,
        name: player.name,
        avatar: player.avatar,
        profileUrl: player.profileUrl,
        updatedAt: new Date(),
      },
    })

  const matchList = await stratz.getPlayerMatches(steamId, { take: 100 })

  for (const m of matchList) {
    const summary = mapMatchSummaryBase(m)
    await db
      .insert(matches)
      .values({ ...summary, status: 'PENDING' })
      .onConflictDoUpdate({
        target: matches.matchId,
        set: summary,
      })

    for (const p of m.players ?? []) {
      const row = mapMatchPlayerSummaryRow(m.id, p)
      await db
        .insert(matchPlayers)
        .values(row)
        .onConflictDoUpdate({
          target: [matchPlayers.matchId, matchPlayers.steamAccountId],
          set: { ...row, matchId: undefined, steamAccountId: undefined },
        })
    }
  }

  return (await getPlayer(db, steamId))!
}

export async function getPlayer(db: Db, steamId: string): Promise<Player | null> {
  const row = await db.query.players.findFirst({
    where: eq(players.steamId, steamId),
  })
  if (!row) return null
  return {
    steamId: row.steamId,
    accountId: row.steamAccountId,
    name: row.name,
    avatar: row.avatar ?? '',
    profileUrl: row.profileUrl ?? '',
    favorite: row.favorite,
  }
}

export async function setPlayerFavorite(
  db: Db,
  steamId: string,
  favorite: boolean,
): Promise<Player | null> {
  const player = await getPlayer(db, steamId)
  if (!player) return null
  await db.update(players).set({ favorite }).where(eq(players.steamId, steamId))
  return { ...player, favorite }
}

export interface PlayerListResponse {
  items: Player[]
  total: number
}

export async function listPlayers(db: Db, limit: number): Promise<PlayerListResponse> {
  const rows = await db.select().from(players).orderBy(desc(players.updatedAt)).limit(limit)

  return {
    items: rows.map((row) => ({
      steamId: row.steamId,
      accountId: row.steamAccountId,
      name: row.name,
      avatar: row.avatar ?? '',
      profileUrl: row.profileUrl ?? '',
      favorite: row.favorite,
    })),
    total: rows.length,
  }
}

export async function listPlayerMatches(
  db: Db,
  steamId: string,
  page: number,
  pageSize: number,
): Promise<MatchListResponse> {
  const accountId = steamIdToAccountId(steamId)
  const where = eq(matchPlayers.steamAccountId, accountId)

  const totalRows = await db.select({ value: count() }).from(matchPlayers).where(where)
  const total = totalRows[0]?.value ?? 0

  const rows = await db
    .select({ m: matches, mp: matchPlayers })
    .from(matchPlayers)
    .innerJoin(matches, eq(matchPlayers.matchId, matches.matchId))
    .where(where)
    .orderBy(desc(matches.startTime), desc(matches.matchId))
    .limit(pageSize)
    .offset((page - 1) * pageSize)

  const items: MatchListItem[] = rows.map(({ m, mp }) => ({
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
    heroId: mp.heroId,
    kills: mp.kills,
    deaths: mp.deaths,
    assists: mp.assists,
    gpm: mp.gpm,
    xpm: mp.xpm,
    netWorth: mp.netWorth,
    isVictory: mp.isVictory,
    imp: mp.imp,
  }))

  return { items, total, page, pageSize }
}
