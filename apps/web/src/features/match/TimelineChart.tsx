interface TimelineChartProps {
  values: number[]
  label: string
  midline?: number
}

const W = 520
const H = 110
const PAD = 4

interface Segment {
  points: string
  above: boolean
}

function buildSegments(
  values: number[],
  midline: number,
  x: (i: number) => number,
  y: (v: number) => number,
): Segment[] {
  const segs: Segment[] = []
  let cur: { pts: string[]; above: boolean } | null = null

  for (let i = 0; i < values.length; i++) {
    const v = values[i] ?? midline
    const above = v >= midline
    const pt = `${x(i).toFixed(1)},${y(v).toFixed(1)}`
    if (i === 0) {
      cur = { pts: [pt], above }
      continue
    }
    const prev = values[i - 1] ?? midline
    const prevAbove = prev >= midline
    if (prevAbove === above) {
      cur!.pts.push(pt)
      continue
    }
    const t = (midline - prev) / (v - prev || 1)
    const ix = (x(i - 1) + (x(i) - x(i - 1)) * Math.min(1, Math.max(0, t))).toFixed(1)
    const iy = y(midline).toFixed(1)
    cur!.pts.push(`${ix},${iy}`)
    segs.push({ points: cur!.pts.join(' '), above: cur!.above })
    cur = { pts: [`${ix},${iy}`, pt], above }
  }
  if (cur) segs.push({ points: cur.pts.join(' '), above: cur.above })
  return segs
}

export function TimelineChart({ values, label, midline = 0 }: TimelineChartProps) {
  if (values.length < 2) return null

  const min = Math.min(midline, ...values)
  const max = Math.max(midline, ...values)
  const span = max - min || 1
  const n = values.length

  const x = (i: number) => PAD + (i / (n - 1)) * (W - PAD * 2)
  const y = (v: number) => PAD + ((max - v) / span) * (H - PAD * 2)
  const midY = y(midline)
  const segs = buildSegments(values, midline, x, y)

  const last = values[n - 1] ?? midline
  const leader = last > midline ? '天辉' : '夜魇'

  return (
    <div className='min-w-0'>
      <div className='mb-1 flex items-baseline justify-between text-xs'>
        <span className='text-muted-foreground'>{label}</span>
        <span
          className={`font-medium tabular-nums ${
            last > midline ? 'text-emerald-500' : 'text-red-500'
          }`}
        >
          {leader} 领先
        </span>
      </div>
      <svg viewBox={`0 0 ${W} ${H}`} className='h-24 w-full'>
        <line
          x1={PAD}
          x2={W - PAD}
          y1={midY}
          y2={midY}
          stroke='currentColor'
          className='text-border'
          strokeDasharray='3 3'
        />
        {segs
          .filter((s) => s.above)
          .map((s, i) => (
            <polyline
              key={`a-${i}`}
              points={s.points}
              fill='none'
              stroke='currentColor'
              className='text-emerald-500'
              strokeWidth={1.5}
              strokeLinecap='round'
              strokeLinejoin='round'
            />
          ))}
        {segs
          .filter((s) => !s.above)
          .map((s, i) => (
            <polyline
              key={`b-${i}`}
              points={s.points}
              fill='none'
              stroke='currentColor'
              className='text-red-500'
              strokeWidth={1.5}
              strokeLinecap='round'
              strokeLinejoin='round'
            />
          ))}
      </svg>
    </div>
  )
}
