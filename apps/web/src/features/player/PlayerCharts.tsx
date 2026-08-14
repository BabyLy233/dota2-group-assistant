import type { MatchListItem } from '@dota/shared'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import {
  ChartContainer,
  ChartLegend,
  ChartLegendContent,
  ChartTooltip,
  ChartTooltipContent,
} from '@/components/ui/chart'
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Line,
  LineChart,
  ReferenceLine,
  XAxis,
  YAxis,
} from 'recharts'

const WIN_COLOR = '#10b981'
const LOSS_COLOR = '#ef4444'
const GPM_COLOR = '#10b981'
const XPM_COLOR = '#38bdf8'
const IMP_COLOR = '#a78bfa'
const KDA_REFERENCE_COLOR = '#94a3b8'
const KDA_DISPLAY_CAP = 10
const KDA_BASELINE_FLOOR = 2

interface Row {
  index: number
  result: number
  winRate: number
  gpm: number
  xpm: number
  imp: number
  kills: number
  deaths: number
  assists: number
  kda: number
  kdaDisplay: number
  aboveAverage: boolean
}

export function kdaRatio(kills: number, deaths: number, assists: number): number {
  if (deaths <= 0) return kills + assists
  return (kills + assists) / deaths
}

export function capKda(kda: number): number {
  return Math.min(kda, KDA_DISPLAY_CAP)
}

export function kdaBaselineValue(values: number[]): number {
  if (!values.length) return KDA_BASELINE_FLOOR
  const average = values.reduce((sum, value) => sum + value, 0) / values.length
  return Math.max(average, KDA_BASELINE_FLOOR)
}

function KdaDot({ cx, cy, payload }: { cx?: number; cy?: number; payload?: Row }) {
  if (cx == null || cy == null) return null
  return <circle cx={cx} cy={cy} r={2.5} fill={payload?.aboveAverage ? WIN_COLOR : LOSS_COLOR} />
}

function KdaTooltip({
  active,
  payload,
  baseline,
}: {
  active?: boolean
  payload?: Array<{ payload: Row }>
  baseline: number
}) {
  if (!active || !payload?.length) return null
  const r = payload[0]?.payload
  if (!r) return null
  return (
    <div className='rounded-md border border-border bg-card px-3 py-2 text-xs shadow-md'>
      <p className='font-medium'>
        第 {r.index} 场 · KDA {r.kills}/{r.deaths}/{r.assists}
      </p>
      <p className='mt-0.5 text-muted-foreground'>
        比率 {r.kda.toFixed(1)} · {r.aboveAverage ? '高于' : '低于'}平均 {baseline.toFixed(1)}
      </p>
    </div>
  )
}

export function PlayerCharts({ items }: { items: MatchListItem[] }) {
  if (items.length < 2) return null

  const ordered = [...items].reverse()
  const rawKdaValues = ordered.map((m) => kdaRatio(m.kills ?? 0, m.deaths ?? 0, m.assists ?? 0))
  const kdaDisplayValues = rawKdaValues.map(capKda)
  const kdaBaseline = kdaBaselineValue(kdaDisplayValues)
  let wins = 0
  const rows: Row[] = ordered.map((m, i) => {
    const result = m.isVictory == null ? 0 : m.isVictory ? 1 : -1
    if (result === 1) wins++
    const decided = ordered.slice(0, i + 1).filter((x) => x.isVictory != null).length
    const kda = rawKdaValues[i] ?? 0
    const kdaDisplay = kdaDisplayValues[i] ?? 0
    return {
      index: i + 1,
      result,
      winRate: decided ? Math.round((wins / decided) * 100) : 0,
      gpm: m.gpm ?? 0,
      xpm: m.xpm ?? 0,
      imp: m.imp ?? 0,
      kills: m.kills ?? 0,
      deaths: m.deaths ?? 0,
      assists: m.assists ?? 0,
      kda,
      kdaDisplay,
      aboveAverage: kdaDisplay >= kdaBaseline,
    }
  })

  const decidedCount = ordered.filter((m) => m.isVictory != null).length
  const totalWins = ordered.filter((m) => m.isVictory === true).length
  const winRate = decidedCount ? Math.round((totalWins / decidedCount) * 100) : 0
  const maxKda = Math.max(kdaBaseline, ...rows.map((r) => r.kdaDisplay))

  return (
    <div className='grid gap-4 sm:grid-cols-2'>
      <Card>
        <CardHeader className='pb-2'>
          <CardTitle className='text-sm font-medium'>
            胜率走势 · {totalWins} 胜 {decidedCount - totalWins} 负 · {winRate}%
          </CardTitle>
        </CardHeader>
        <CardContent>
          <ChartContainer
            config={{ winRate: { label: '累计胜率', color: WIN_COLOR } }}
            className='h-36 w-full'
          >
            <LineChart data={rows} margin={{ top: 4, right: 4 }}>
              <CartesianGrid vertical={false} strokeDasharray='3 3' />
              <XAxis
                dataKey='index'
                tickLine={false}
                axisLine={false}
                tickMargin={6}
                tick={{ fontSize: 11 }}
              />
              <YAxis hide domain={[0, 100]} />
              <ReferenceLine y={50} stroke='#888' strokeDasharray='3 3' />
              <ChartTooltip content={<ChartTooltipContent formatter={(v) => `${Number(v)}%`} />} />
              <Line
                type='monotone'
                dataKey='winRate'
                stroke={WIN_COLOR}
                strokeWidth={2}
                dot={{ r: 2.5, fill: WIN_COLOR }}
              />
            </LineChart>
          </ChartContainer>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className='pb-2'>
          <CardTitle className='text-sm font-medium'>GPM / XPM 趋势</CardTitle>
        </CardHeader>
        <CardContent>
          <ChartContainer
            config={{
              gpm: { label: 'GPM', color: GPM_COLOR },
              xpm: { label: 'XPM', color: XPM_COLOR },
            }}
            className='h-36 w-full'
          >
            <LineChart data={rows} margin={{ top: 4, right: 4 }}>
              <CartesianGrid vertical={false} strokeDasharray='3 3' />
              <XAxis
                dataKey='index'
                tickLine={false}
                axisLine={false}
                tickMargin={6}
                tick={{ fontSize: 11 }}
              />
              <YAxis hide domain={['dataMin - 50', 'dataMax + 50']} />
              <ChartTooltip content={<ChartTooltipContent />} />
              <ChartLegend content={<ChartLegendContent />} />
              <Line type='monotone' dataKey='gpm' stroke={GPM_COLOR} strokeWidth={2} dot={false} />
              <Line type='monotone' dataKey='xpm' stroke={XPM_COLOR} strokeWidth={2} dot={false} />
            </LineChart>
          </ChartContainer>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className='pb-2'>
          <CardTitle className='text-sm font-medium'>KDA 比率走势</CardTitle>
        </CardHeader>
        <CardContent>
          <ChartContainer
            config={{ kda: { label: 'KDA 比率', color: KDA_REFERENCE_COLOR } }}
            className='h-36 w-full'
          >
            <LineChart data={rows} margin={{ top: 4, right: 4 }}>
              <CartesianGrid vertical={false} strokeDasharray='3 3' />
              <XAxis
                dataKey='index'
                tickLine={false}
                axisLine={false}
                tickMargin={6}
                tick={{ fontSize: 11 }}
              />
              <YAxis hide domain={[0, Math.ceil(maxKda + 0.5)]} />
              <ReferenceLine
                y={kdaBaseline}
                stroke={KDA_REFERENCE_COLOR}
                strokeDasharray='4 4'
                label={{
                  value: `均值 ${kdaBaseline.toFixed(1)}`,
                  position: 'insideTopRight',
                  fontSize: 10,
                  fill: KDA_REFERENCE_COLOR,
                }}
              />
              <ChartTooltip content={<KdaTooltip baseline={kdaBaseline} />} />
              <Line
                type='monotone'
                dataKey='kdaDisplay'
                stroke={KDA_REFERENCE_COLOR}
                strokeWidth={2}
                dot={<KdaDot />}
              />
            </LineChart>
          </ChartContainer>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className='pb-2'>
          <CardTitle className='text-sm font-medium'>表现分走势</CardTitle>
        </CardHeader>
        <CardContent>
          <ChartContainer
            config={{ imp: { label: 'IMP', color: IMP_COLOR } }}
            className='h-36 w-full'
          >
            <BarChart data={rows} barCategoryGap='20%'>
              <CartesianGrid vertical={false} strokeDasharray='3 3' />
              <XAxis
                dataKey='index'
                tickLine={false}
                axisLine={false}
                tickMargin={6}
                tick={{ fontSize: 11 }}
              />
              <YAxis hide />
              <ChartTooltip content={<ChartTooltipContent />} />
              <Bar dataKey='imp' radius={[2, 2, 0, 0]} maxBarSize={18}>
                {rows.map((r, i) => (
                  <Cell key={i} fill={r.imp >= 0 ? WIN_COLOR : LOSS_COLOR} />
                ))}
              </Bar>
            </BarChart>
          </ChartContainer>
        </CardContent>
      </Card>
    </div>
  )
}
