import { describe, expect, it } from 'vitest'
import { accountIdToSteamId, steamIdToAccountId } from './steam'

describe('steamIdToAccountId', () => {
  it('converts a known steam64 to accountId', () => {
    expect(steamIdToAccountId('76561198139459503')).toBe(179193775)
  })

  it('roundtrips with accountIdToSteamId', () => {
    const steamId = '76561198139459503'
    expect(accountIdToSteamId(steamIdToAccountId(steamId))).toBe(steamId)
  })

  it('rejects non-17-digit input', () => {
    expect(() => steamIdToAccountId('179193775')).toThrow()
    expect(() => steamIdToAccountId('7656119813945950')).toThrow()
    expect(() => steamIdToAccountId('abc')).toThrow()
    expect(() => steamIdToAccountId('')).toThrow()
  })
})

describe('accountIdToSteamId', () => {
  it('converts accountId to the standard steam64 offset', () => {
    expect(accountIdToSteamId(179193775)).toBe('76561198139459503')
    expect(accountIdToSteamId(0)).toBe('76561197960265728')
    expect(accountIdToSteamId(100003171)).toBe('76561198060268899')
  })
})
