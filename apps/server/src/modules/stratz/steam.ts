const STEAM64_OFFSET = 76561197960265728n
const STEAM_ID_PATTERN = /^\d{17}$/

export function steamIdToAccountId(steamId: string): number {
  if (!STEAM_ID_PATTERN.test(steamId)) {
    throw new Error(`Invalid Steam ID: ${steamId}`)
  }
  const accountId = BigInt(steamId) - STEAM64_OFFSET
  if (accountId < 0n || accountId > 0xffffffffn) {
    throw new Error(`Steam ID out of range: ${steamId}`)
  }
  return Number(accountId)
}

export function accountIdToSteamId(accountId: number): string {
  return (STEAM64_OFFSET + BigInt(accountId)).toString()
}
