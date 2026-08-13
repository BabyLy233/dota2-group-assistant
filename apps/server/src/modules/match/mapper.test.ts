import { describe, expect, it } from 'vitest'
import {
  mapMatchPlayerRow,
  mapMatchPlayerSummaryRow,
  mapMatchSummary,
  mapMatchSummaryBase,
} from './mapper'
import type { StratzMatch, StratzMatchPlayer } from '../stratz/types'

function baseMatch(overrides: Partial<StratzMatch> = {}): StratzMatch {
  return {
    id: 8942127448,
    startDateTime: 1786547304,
    durationSeconds: 2252,
    gameMode: 'ALL_PICK_RANKED',
    lobbyType: 'UNRANKED',
    radiantKills: [10, 16],
    direKills: [5, 4],
    didRadiantWin: true,
    parsedDateTime: 1786547600,
    ...overrides,
  }
}

function basePlayer(overrides: Partial<StratzMatchPlayer> = {}): StratzMatchPlayer {
  return {
    steamAccountId: 179193775,
    playerSlot: 7,
    heroId: 126,
    kills: 5,
    deaths: 8,
    assists: 12,
    numLastHits: 200,
    numDenies: 10,
    goldPerMinute: 480,
    networth: 12000,
    experiencePerMinute: 520,
    heroDamage: 25000,
    towerDamage: 3000,
    heroHealing: 3200,
    isVictory: false,
    ...overrides,
  }
}

describe('mapMatchSummary', () => {
  it('maps core fields and enum strings to numeric ids', () => {
    const s = mapMatchSummary(baseMatch())
    expect(s.matchId).toBe(8942127448)
    expect(s.gameMode).toBe(22)
    expect(s.lobbyType).toBe(0)
    expect(s.winningTeam).toBe(0)
    expect(s.radiantScore).toBe(26)
    expect(s.direScore).toBe(9)
    expect(s.parsed).toBe(true)
    expect(s.factsJson).toMatchObject({
      firstBloodTime: null,
      towerStatusRadiant: null,
      gameVersionId: null,
    })
  })

  it('maps timeline data with resampling', () => {
    const leads = Array.from({ length: 80 }, (_, i) => i * 10 - 400)
    const s = mapMatchSummary(
      baseMatch({
        radiantNetworthLeads: leads,
        radiantExperienceLeads: [1, 2, 3],
        winRates: undefined,
      }),
    )
    expect(s.timelineJson?.networthLeads).toHaveLength(40)
    expect(s.timelineJson?.networthLeads[0]).toBe(leads[0])
    expect(s.timelineJson?.experienceLeads).toEqual([1, 2, 3])
    expect(s.timelineJson?.winRates).toEqual([])
  })

  it('returns null timeline when no data', () => {
    const s = mapMatchSummary(baseMatch())
    expect(s.timelineJson).toBeNull()
  })

  it('stores pickBans and laneReport only when present', () => {
    const picks = [{ isPick: true, heroId: 69, isRadiant: true }]
    const s = mapMatchSummary(baseMatch({ pickBans: picks }))
    expect(s.pickBansJson).toEqual(picks)

    const empty = mapMatchSummary(baseMatch())
    expect(empty.pickBansJson).toBeNull()
    expect(empty.laneReportJson).toBeNull()
  })
})

describe('mapMatchSummaryBase', () => {
  it('never contains extended analysis fields (would wipe detail data)', () => {
    const s = mapMatchSummaryBase(
      baseMatch({
        radiantNetworthLeads: [1, 2, 3],
        pickBans: [{ isPick: true, heroId: 1 }],
        firstBloodTime: 42,
      }),
    )
    expect(s).not.toHaveProperty('timelineJson')
    expect(s).not.toHaveProperty('pickBansJson')
    expect(s).not.toHaveProperty('laneReportJson')
    expect(s).not.toHaveProperty('factsJson')
  })
})

describe('mapMatchPlayerRow', () => {
  it('maps all fields including extended stats', () => {
    const row = mapMatchPlayerRow(
      8942127448,
      basePlayer({
        imp: 13,
        position: 'POSITION_3',
        level: 21,
        gold: 1651,
        goldSpent: 17870,
        item0Id: 116,
        item1Id: 50,
        neutral0Id: 2190,
        abilities: [
          { abilityId: 5341, time: 93, level: 1, isTalent: false },
          { abilityId: 5342, time: 120, level: 2, isTalent: true },
        ],
        playbackData: {
          killEvents: [
            {
              time: 260,
              attacker: 69,
              target: 14,
              byAbility: 5340,
              gold: 149,
              xp: 217,
              assist: null,
              isSolo: false,
              isGank: false,
            },
          ],
        },
      }),
    )
    expect(row.imp).toBe(13)
    expect(row.position).toBe('POSITION_3')
    expect(row.level).toBe(21)
    expect(row.gold).toBe(1651)
    expect(row.goldSpent).toBe(17870)
    expect(row.itemsJson).toEqual({ items: [116, 50], backpack: [], neutral: 2190 })
    expect(row.abilitiesJson).toEqual([
      { abilityId: 5341, time: 93, level: 1, isTalent: false },
      { abilityId: 5342, time: 120, level: 2, isTalent: true },
    ])
    expect(row.killEventsJson?.[0]).toMatchObject({
      time: 260,
      attacker: 69,
      target: 14,
      byAbility: 5340,
      assist: null,
      isSolo: false,
    })
  })

  it('handles missing optional fields gracefully', () => {
    const row = mapMatchPlayerRow(1, basePlayer())
    expect(row.imp).toBeNull()
    expect(row.itemsJson).toBeNull()
    expect(row.abilitiesJson).toBeNull()
    expect(row.killEventsJson).toBeNull()
  })

  it('filters empty item slots', () => {
    const row = mapMatchPlayerRow(
      1,
      basePlayer({ item0Id: 116, item1Id: undefined, item2Id: 0, neutral0Id: undefined }),
    )
    expect(row.itemsJson?.items).toEqual([116])
    expect(row.itemsJson?.neutral).toBe(-1)
  })
})

describe('mapMatchPlayerSummaryRow', () => {
  it('never contains extended fields (would wipe detail data on player sync)', () => {
    const row = mapMatchPlayerSummaryRow(
      8942127448,
      basePlayer({
        imp: 13,
        position: 'POSITION_3',
        level: 21,
        gold: 1651,
        goldSpent: 17870,
        item0Id: 116,
        abilities: [{ abilityId: 5341, time: 93, level: 1, isTalent: false }],
        playbackData: { killEvents: [{ time: 1, attacker: 2 }] },
      }),
    )
    expect(row).not.toHaveProperty('imp')
    expect(row).not.toHaveProperty('position')
    expect(row).not.toHaveProperty('level')
    expect(row).not.toHaveProperty('itemsJson')
    expect(row).not.toHaveProperty('abilitiesJson')
    expect(row).not.toHaveProperty('killEventsJson')
    expect(row.heroId).toBe(126)
    expect(row.kills).toBe(5)
  })
})
