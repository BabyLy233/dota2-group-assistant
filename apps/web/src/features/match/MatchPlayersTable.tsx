import type { MatchPlayerDetail } from '@dota/shared'
import { useConstants } from '@/lib/use-constants'
import { formatNumber } from '@/lib/format'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'

function positionLabel(pos: string | null): string {
  if (!pos) return '-'
  const m = /POSITION_([1-5])/.exec(pos)
  return m?.[1] ?? pos
}

export function MatchPlayersTable({ players }: { players: MatchPlayerDetail[] }) {
  const { data: constants } = useConstants()
  const sorted = [...players].sort((a, b) => (a.playerSlot ?? 0) - (b.playerSlot ?? 0))

  return (
    <div className='overflow-x-auto rounded-xl border border-border'>
      <Table>
        <TableHeader>
          <TableRow className='hover:bg-transparent'>
            <TableHead>阵营</TableHead>
            <TableHead>英雄</TableHead>
            <TableHead>玩家</TableHead>
            <TableHead>位置</TableHead>
            <TableHead className='text-right'>K/D/A</TableHead>
            <TableHead className='text-right'>GPM</TableHead>
            <TableHead className='text-right'>XPM</TableHead>
            <TableHead className='text-right'>净收入</TableHead>
            <TableHead className='text-right'>伤害</TableHead>
            <TableHead className='text-right'>IMP</TableHead>
            <TableHead>装备</TableHead>
            <TableHead>结果</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {sorted.map((p, i) => {
            const isRadiant = (p.playerSlot ?? 0) < 5
            const itemIds = [...p.items, ...(p.neutralItem != null ? [p.neutralItem] : [])].filter(
              (id) => id > 0,
            )
            return (
              <TableRow key={p.steamAccountId} className={isRadiant ? '' : 'bg-muted/30'}>
                <TableCell className='w-20'>
                  {i === 0 || i === 5 ? (
                    <span
                      className={`text-xs font-bold tracking-wide ${
                        isRadiant ? 'text-emerald-500' : 'text-red-500'
                      }`}
                    >
                      {isRadiant ? '天辉' : '夜魇'}
                    </span>
                  ) : null}
                </TableCell>
                <TableCell className='font-medium'>
                  {p.heroId != null ? (constants?.heroes[p.heroId] ?? `英雄 ${p.heroId}`) : '-'}
                </TableCell>
                <TableCell>
                  <span className='inline-flex items-center gap-2'>
                    <Avatar size='sm'>
                      {p.avatar ? <AvatarImage src={p.avatar} alt='' /> : null}
                      <AvatarFallback>?</AvatarFallback>
                    </Avatar>
                    <span className='max-w-40 truncate'>
                      {p.name ?? `玩家 ${p.steamAccountId}`}
                    </span>
                  </span>
                </TableCell>
                <TableCell className='tabular-nums text-muted-foreground'>
                  {positionLabel(p.position)}
                </TableCell>
                <TableCell className='whitespace-nowrap tabular-nums'>
                  <span className='text-emerald-500'>{p.kills ?? '-'}</span>/
                  <span className='text-red-500'>{p.deaths ?? '-'}</span>/
                  <span className='text-sky-500'>{p.assists ?? '-'}</span>
                </TableCell>
                <TableCell className='text-right tabular-nums text-muted-foreground'>
                  {formatNumber(p.gpm)}
                </TableCell>
                <TableCell className='text-right tabular-nums text-muted-foreground'>
                  {formatNumber(p.xpm)}
                </TableCell>
                <TableCell className='text-right tabular-nums text-muted-foreground'>
                  {formatNumber(p.netWorth)}
                </TableCell>
                <TableCell className='text-right tabular-nums text-muted-foreground'>
                  {formatNumber(p.heroDamage)}
                </TableCell>
                <TableCell
                  className={`text-right font-semibold tabular-nums ${
                    p.imp == null
                      ? 'text-muted-foreground'
                      : p.imp >= 0
                        ? 'text-emerald-500'
                        : 'text-red-500'
                  }`}
                >
                  {p.imp ?? '-'}
                </TableCell>
                <TableCell>
                  <span className='flex items-center gap-0.5'>
                    {itemIds.length ? (
                      itemIds.slice(0, 8).map((id) => {
                        const item = constants?.items[id]
                        return (
                          <img
                            key={id}
                            src={item?.icon ?? ''}
                            alt={item?.name ?? `Item ${id}`}
                            title={item?.name ?? `Item ${id}`}
                            className='h-6 w-6 rounded border border-border bg-neutral-900'
                            loading='lazy'
                          />
                        )
                      })
                    ) : (
                      <span className='text-muted-foreground/50'>-</span>
                    )}
                  </span>
                </TableCell>
                <TableCell>
                  {p.isVictory == null ? (
                    <span className='text-muted-foreground/50'>-</span>
                  ) : (
                    <span className={p.isVictory ? 'text-emerald-500' : 'text-red-500'}>
                      {p.isVictory ? '胜' : '负'}
                    </span>
                  )}
                </TableCell>
              </TableRow>
            )
          })}
        </TableBody>
      </Table>
    </div>
  )
}
