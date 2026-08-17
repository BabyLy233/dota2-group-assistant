import { and, eq } from 'drizzle-orm'
import type { Player } from '@dota/shared'
import type { Db } from '../../db'
import { playerBindings, players } from '../../db/schema'
import { normalizeSteamId, steamIdToAccountId } from '../stratz'

export class BindingInvalidSteamIdError extends Error {}
export class BindingPlayerNotFoundError extends Error {}
export class BindingConflictError extends Error {}

export interface PlayerBinding {
  platform: string
  userId: string
  player: Player
}

async function findBinding(
  db: Db,
  platform: string,
  userId: string,
): Promise<PlayerBinding | null> {
  const rows = await db
    .select({ binding: playerBindings, player: players })
    .from(playerBindings)
    .innerJoin(players, eq(playerBindings.steamAccountId, players.steamAccountId))
    .where(and(eq(playerBindings.platform, platform), eq(playerBindings.userId, userId)))
    .limit(1)

  const row = rows[0]
  if (!row) return null

  return {
    platform: row.binding.platform,
    userId: row.binding.userId,
    player: mapPlayer(row.player),
  }
}

function mapPlayer(row: typeof players.$inferSelect): Player {
  return {
    steamId: row.steamId,
    accountId: row.steamAccountId,
    name: row.name,
    avatar: row.avatar ?? '',
    profileUrl: row.profileUrl ?? '',
    favorite: row.favorite,
  }
}

export async function getPlayerBinding(
  db: Db,
  platform: string,
  userId: string,
): Promise<PlayerBinding | null> {
  return findBinding(db, platform, userId)
}

export async function bindPlayer(
  db: Db,
  platform: string,
  userId: string,
  inputSteamId: string,
): Promise<PlayerBinding> {
  let steamId: string
  try {
    steamId = normalizeSteamId(inputSteamId)
  } catch (err) {
    throw new BindingInvalidSteamIdError(err instanceof Error ? err.message : String(err))
  }
  const steamAccountId = steamIdToAccountId(steamId)
  const playerRow = await db.query.players.findFirst({
    where: eq(players.steamAccountId, steamAccountId),
  })
  if (!playerRow) {
    throw new BindingPlayerNotFoundError('该 Steam 账号还没有同步到 Dota 2 助手')
  }

  const claimedRows = await db
    .select({ platform: playerBindings.platform, userId: playerBindings.userId })
    .from(playerBindings)
    .where(eq(playerBindings.steamAccountId, steamAccountId))
    .limit(1)
  const claimed = claimedRows[0]
  if (claimed && (claimed.platform !== platform || claimed.userId !== userId)) {
    throw new BindingConflictError('该 Steam 账号已经被其他用户绑定')
  }

  await db
    .insert(playerBindings)
    .values({ platform, userId, steamAccountId })
    .onConflictDoUpdate({
      target: [playerBindings.platform, playerBindings.userId],
      set: { steamAccountId, updatedAt: new Date() },
    })

  return {
    platform,
    userId,
    player: mapPlayer(playerRow),
  }
}

export async function unbindPlayer(
  db: Db,
  platform: string,
  userId: string,
): Promise<PlayerBinding | null> {
  const binding = await findBinding(db, platform, userId)
  if (!binding) return null

  await db
    .delete(playerBindings)
    .where(and(eq(playerBindings.platform, platform), eq(playerBindings.userId, userId)))
  return binding
}
