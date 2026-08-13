import { describe, expect, it } from 'vitest'
import { gameModeId, lobbyTypeId } from './enums'

describe('gameModeId', () => {
  it('maps enum strings to numeric ids', () => {
    expect(gameModeId('ALL_PICK_RANKED')).toBe(22)
    expect(gameModeId('ALL_PICK')).toBe(1)
    expect(gameModeId('TURBO')).toBe(23)
  })

  it('passes through numeric values', () => {
    expect(gameModeId(22)).toBe(22)
    expect(gameModeId(0)).toBe(0)
  })

  it('returns null for unknown/empty values', () => {
    expect(gameModeId('NOT_A_MODE')).toBeNull()
    expect(gameModeId(undefined)).toBeNull()
    expect(gameModeId('')).toBeNull()
  })
})

describe('lobbyTypeId', () => {
  it('maps enum strings to numeric ids', () => {
    expect(lobbyTypeId('UNRANKED')).toBe(0)
    expect(lobbyTypeId('RANKED')).toBe(7)
    expect(lobbyTypeId('SOLO_QUEUE')).toBe(6)
  })

  it('passes through numeric values', () => {
    expect(lobbyTypeId(7)).toBe(7)
  })

  it('returns null for unknown/empty values', () => {
    expect(lobbyTypeId('NOPE')).toBeNull()
    expect(lobbyTypeId(undefined)).toBeNull()
  })
})
