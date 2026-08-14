import type { UseMutationResult } from '@tanstack/react-query'
import type { MatchDetail } from '@dota/shared'
import { useConstants } from '@/lib/use-constants'
import { formatDateTime, formatDuration } from '@/lib/format'
import { MatchStatusBadge } from './MatchStatusBadge'
import { TimelineChart } from './TimelineChart'
import { Button } from '@/components/ui/button'
import { Card, CardAction, CardContent, CardHeader } from '@/components/ui/card'
import { Separator } from '@/components/ui/separator'

interface MatchOverviewProps {
  detail: MatchDetail
  syncMutation: UseMutationResult<MatchDetail, Error, void, unknown>
}

export function MatchOverview({ detail, syncMutation }: MatchOverviewProps) {
  const { data: constants } = useConstants()
  const radiantWon = detail.winningTeam === 0
  const gameMode = detail.gameMode != null ? constants?.gameModes[detail.gameMode] : undefined
  const lobbyType = detail.lobbyType != null ? constants?.lobbyTypes[detail.lobbyType] : undefined
  const timeline = detail.timeline
  const hasCharts =
    (timeline?.networthLeads.length ?? 0) > 1 || (timeline?.winRates.length ?? 0) > 1

  const fmt = (s: number | null) => {
    if (s == null) return '-'
    const m = Math.floor(s / 60)
    const sec = s % 60
    return `${m}:${String(sec).padStart(2, '0')}`
  }

  return (
    <Card>
      <CardHeader>
        <div className='flex flex-wrap items-center gap-x-6 gap-y-2'>
          <div className='text-3xl font-bold tabular-nums'>
            <span className={radiantWon ? 'text-emerald-500' : 'text-foreground'}>
              {detail.radiantScore ?? '-'}
            </span>
            <span className='mx-2 text-muted-foreground'>:</span>
            <span className={!radiantWon ? 'text-emerald-500' : 'text-foreground'}>
              {detail.direScore ?? '-'}
            </span>
          </div>
          <div className='flex items-center gap-3'>
            <MatchStatusBadge status={detail.status} />
            <span className='text-sm text-muted-foreground'>
              {detail.winningTeam == null ? '未知' : radiantWon ? '天辉胜利' : '夜魇胜利'}
            </span>
          </div>
        </div>
        <CardAction>
          <Button onClick={() => syncMutation.mutate()} disabled={syncMutation.isPending}>
            {syncMutation.isPending ? '同步中…' : '重新同步'}
          </Button>
        </CardAction>
      </CardHeader>
      <CardContent>
        {syncMutation.isError && (
          <p className='mb-4 text-sm text-destructive'>同步失败：{syncMutation.error.message}</p>
        )}
        <dl className='grid grid-cols-2 gap-x-8 gap-y-4 text-sm sm:grid-cols-4'>
          <div>
            <dt className='text-muted-foreground'>比赛时长</dt>
            <dd className='mt-1 font-medium'>{formatDuration(detail.duration)}</dd>
          </div>
          <div>
            <dt className='text-muted-foreground'>游戏模式</dt>
            <dd className='mt-1 font-medium'>{gameMode ?? '-'}</dd>
          </div>
          <div>
            <dt className='text-muted-foreground'>房型</dt>
            <dd className='mt-1 font-medium'>{lobbyType ?? '-'}</dd>
          </div>
          <div>
            <dt className='text-muted-foreground'>开始时间</dt>
            <dd className='mt-1 font-medium'>{formatDateTime(detail.startTime)}</dd>
          </div>
        </dl>
        <dl className='mt-4 grid grid-cols-2 gap-x-8 gap-y-4 border-t border-border pt-4 text-sm sm:grid-cols-4'>
          <div>
            <dt className='text-muted-foreground'>一血时间</dt>
            <dd className='mt-1 font-medium'>{fmt(detail.facts?.firstBloodTime ?? null)}</dd>
          </div>
          <div>
            <dt className='text-muted-foreground'>服务器</dt>
            <dd className='mt-1 font-medium tabular-nums'>{detail.facts?.clusterId ?? '-'}</dd>
          </div>
          <div>
            <dt className='text-muted-foreground'>游戏版本</dt>
            <dd className='mt-1 font-medium tabular-nums'>{detail.facts?.gameVersionId ?? '-'}</dd>
          </div>
          <div>
            <dt className='text-muted-foreground'>参与玩家</dt>
            <dd className='mt-1 font-medium tabular-nums'>
              {detail.facts?.numHumanPlayers ?? '-'}
            </dd>
          </div>
        </dl>

        {hasCharts && (
          <>
            <Separator className='my-5' />
            <div className='grid gap-6 sm:grid-cols-2'>
              {(timeline?.networthLeads.length ?? 0) > 1 && (
                <TimelineChart values={timeline?.networthLeads ?? []} label='经济领先' />
              )}
              {(timeline?.winRates.length ?? 0) > 1 && (
                <TimelineChart values={timeline?.winRates ?? []} label='胜率' midline={0.5} />
              )}
            </div>
          </>
        )}
      </CardContent>
    </Card>
  )
}
