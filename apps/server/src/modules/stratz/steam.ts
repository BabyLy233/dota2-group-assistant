const STEAM64_OFFSET = 76561197960265728n
const STEAM_ID_PATTERN = /^\d{17}$/
const MAX_ACCOUNT_ID = 0xffffffffn

export function normalizeSteamId(value: string): string {
  const normalized = value.trim()
  if (!/^\d+$/.test(normalized)) {
    throw new Error(`Invalid Steam ID: ${value}`)
  }

  const number = BigInt(normalized)
  if (normalized.length === 17) {
    const accountId = number - STEAM64_OFFSET
    if (accountId < 0n || accountId > MAX_ACCOUNT_ID) {
      throw new Error(`Steam ID out of range: ${value}`)
    }
    return number.toString()
  }

  if (number > MAX_ACCOUNT_ID) {
    throw new Error(`Account ID out of range: ${value}`)
  }
  return (STEAM64_OFFSET + number).toString()
}

export function steamIdToAccountId(steamId: string): number {
  if (!STEAM_ID_PATTERN.test(steamId)) {
    throw new Error(`Invalid Steam ID: ${steamId}`)
  }
  const accountId = BigInt(steamId) - STEAM64_OFFSET
  if (accountId < 0n || accountId > MAX_ACCOUNT_ID) {
    throw new Error(`Steam ID out of range: ${steamId}`)
  }
  return Number(accountId)
}

export function accountIdToSteamId(accountId: number): string {
  return (STEAM64_OFFSET + BigInt(accountId)).toString()
}
