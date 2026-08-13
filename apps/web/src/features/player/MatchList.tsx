import { Link } from '@tanstack/react-router'
import type { MatchListItem } from '@dota/shared'
import { useConstants } from '@/lib/use-constants'
import { formatDateTime, formatDuration, formatNumber } from '@/lib/format'
import { MatchStatusBadge } from '@/features/match/MatchStatusBadge'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'

export function MatchList({ items, backTo }: { items: MatchListItem[]; backTo?: string }) {
  const { data: constants } = useConstants()

  return (
    <div className='overflow-x-auto rounded-xl border border-border'>
      <Table>
        <TableHeader>
          <TableRow className='hover:bg-transparent'>
            <TableHead>时间</TableHead>
            <TableHead>英雄</TableHead>
            <TableHead>结果</TableHead>
            <TableHead>K/D/A</TableHead>
            <TableHead className='text-right'>GPM</TableHead>
            <TableHead className='text-right'>XPM</TableHead>
            <TableHead>时长</TableHead>
            <TableHead>状态</TableHead>
            <TableHead className='text-right'>IMP</TableHead>
            <TableHead className='text-right'>Match ID</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {items.map((m) => (
            <TableRow key={m.matchId} className='transition hover:bg-muted/50'>
              <TableCell className='whitespace-nowrap text-muted-foreground'>
                {formatDateTime(m.startTime)}
              </TableCell>
              <TableCell className='font-medium'>
                {m.heroId != null ? (constants?.heroes[m.heroId] ?? `英雄 ${m.heroId}`) : '-'}
              </TableCell>
              <TableCell>
                {m.isVictory == null ? (
                  <span className='text-muted-foreground/50'>-</span>
                ) : (
                  <span className={m.isVictory ? 'text-emerald-500' : 'text-red-500'}>
                    {m.isVictory ? '胜' : '负'}
                  </span>
                )}
              </TableCell>
              <TableCell className='whitespace-nowrap tabular-nums'>
                <span className='text-emerald-500'>{m.kills ?? '-'}</span>/
                <span className='text-red-500'>{m.deaths ?? '-'}</span>/
                <span className='text-sky-500'>{m.assists ?? '-'}</span>
              </TableCell>
              <TableCell className='text-right tabular-nums text-muted-foreground'>
                {formatNumber(m.gpm)}
              </TableCell>
              <TableCell className='text-right tabular-nums text-muted-foreground'>
                {formatNumber(m.xpm)}
              </TableCell>
              <TableCell className='text-muted-foreground'>{formatDuration(m.duration)}</TableCell>
              <TableCell>
                <MatchStatusBadge status={m.status} />
              </TableCell>
              <TableCell
                className={`text-right font-medium tabular-nums ${
                  m.imp == null
                    ? 'text-muted-foreground/50'
                    : m.imp >= 0
                      ? 'text-emerald-500'
                      : 'text-red-500'
                }`}
              >
                {m.imp ?? '-'}
              </TableCell>
              <TableCell className='text-right'>
                <Link
                  to='/matches/$matchId'
                  params={{ matchId: String(m.matchId) }}
                  search={{ from: backTo ?? undefined }}
                  className='font-mono text-primary hover:underline'
                >
                  {m.matchId}
                </Link>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  )
}
