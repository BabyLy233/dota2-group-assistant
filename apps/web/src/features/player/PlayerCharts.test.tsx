import { describe, expect, it } from 'vitest'
import { renderToString } from 'react-dom/server'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import type { MatchListItem } from '@dota/shared'
import { PlayerCharts, kdaRatio } from './PlayerCharts'

function fakeItems(n: number): MatchListItem[] {
  return Array.from({ length: n }, (_, i) => ({
    matchId: 8942000000 + i,
    startTime: 1786500000 + i * 3600,
    duration: 2400,
    gameMode: 22,
    lobbyType: 0,
    winningTeam: i % 2,
    radiantScore: 20 + i,
    direScore: 15,
    parsed: true,
    status: 'COMPLETED' as const,
    heroId: 74,
    kills: 5,
    deaths: 4,
    assists: 8,
    gpm: 480 + i,
    xpm: 520,
    netWorth: 12000,
    isVictory: i % 2 === 0,
    imp: i % 3 === 0 ? 10 : -5,
  }))
}

function render(items: MatchListItem[]) {
  const client = new QueryClient()
  return renderToString(
    <QueryClientProvider client={client}>
      <PlayerCharts items={items} />
    </QueryClientProvider>,
  )
}

describe('PlayerCharts', () => {
  it('renders nothing for fewer than 2 matches', () => {
    expect(render(fakeItems(1))).toBe('')
  })

  it('renders charts with match data', () => {
    const html = render(fakeItems(20))
    expect(html).toContain('胜率走势')
    expect(html).toContain('GPM / XPM 趋势')
    expect(html).toContain('KDA 比率走势')
    expect(html).toContain('表现分走势')
  })

  it('computes win rate in the header', () => {
    const html = render(fakeItems(20)).replace(/<!-- -->/g, '')
    expect(html).toContain('10 胜 10 负')
    expect(html).toContain('50%')
  })
})

describe('kdaRatio', () => {
  it('computes (kills + assists) / deaths', () => {
    expect(kdaRatio(5, 4, 8)).toBeCloseTo(3.25)
    expect(kdaRatio(1, 6, 0)).toBeCloseTo(0.1667, 3)
  })

  it('returns kills + assists when deaths is zero', () => {
    expect(kdaRatio(5, 0, 8)).toBe(13)
    expect(kdaRatio(2, 0, 0)).toBe(2)
  })
})
