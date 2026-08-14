import { Link, createFileRoute } from '@tanstack/react-router'
import { useState } from 'react'
import { ApiError } from '@/lib/api'
import { EmptyState, ErrorState, LoadingState } from '@/components/StateViews'
import { MatchList } from '@/features/player/MatchList'
import { PlayerCharts } from '@/features/player/PlayerCharts'
import { PlayerHeader } from '@/features/player/PlayerHeader'
import {
  usePlayer,
  usePlayerMatches,
  useSyncPlayer,
  useFavoritePlayer,
} from '@/features/player/use-player'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import {
  Pagination,
  PaginationContent,
  PaginationItem,
  PaginationNext,
  PaginationPrevious,
} from '@/components/ui/pagination'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { useSyncMatches } from '@/features/player/use-sync-matches'
import type { MatchListItem } from '@dota/shared'

export const Route = createFileRoute('/players/$steamId')({
  component: PlayerPage,
})

const PAGE_SIZE_OPTIONS = [10, 20, 50, 100]

function PlayerPage() {
  const { steamId } = Route.useParams()
  const [page, setPage] = useState(1)
  const [pageSize, setPageSize] = useState(20)
  const player = usePlayer(steamId)
  const matches = usePlayerMatches(steamId, page, pageSize)
  const sync = useSyncPlayer(steamId)
  const favorite = useFavoritePlayer(steamId)

  const playerMissing = player.error instanceof ApiError && player.error.status === 404

  return (
    <div className='space-y-6'>
      <Link to='/' className='text-sm text-muted-foreground transition hover:text-foreground'>
        ← 返回搜索
      </Link>

      {player.isLoading ? (
        <LoadingState />
      ) : playerMissing ? (
        <Card>
          <CardContent className='py-10 text-center'>
            <p className='mb-4 text-muted-foreground'>
              玩家未同步，请先点击手动同步获取玩家信息和最近比赛
            </p>
            <Button onClick={() => sync.mutate()} disabled={sync.isPending}>
              {sync.isPending ? '同步中…' : '手动同步'}
            </Button>
            {sync.isError && (
              <p className='mt-3 text-sm text-destructive'>同步失败：{sync.error.message}</p>
            )}
          </CardContent>
        </Card>
      ) : player.error ? (
        <ErrorState message={`加载玩家失败：${player.error.message}`} />
      ) : (
        <>
          <PlayerHeader player={player.data} syncMutation={sync} favoriteMutation={favorite} />
          {sync.isError && (
            <p className='text-sm text-destructive'>同步失败：{sync.error.message}</p>
          )}

          <section className='space-y-3'>
            <div className='flex flex-wrap items-center justify-between gap-3'>
              <h2 className='text-lg font-bold tracking-tight'>最近比赛</h2>
              {matches.data && matches.data.items.length > 0 && (
                <SyncMatchesButton items={matches.data.items} steamId={steamId} />
              )}
            </div>
            {matches.isLoading ? (
              <LoadingState rows={5} />
            ) : matches.error ? (
              <ErrorState message={`加载比赛列表失败：${matches.error.message}`} />
            ) : matches.data ? (
              matches.data.items.length === 0 ? (
                <EmptyState message='暂无比赛记录，点击手动同步获取' />
              ) : (
                <>
                  <PlayerCharts items={matches.data.items} />
                  <MatchList items={matches.data.items} backTo={steamId} />
                  <PaginationBar
                    page={matches.data.page}
                    pageSize={matches.data.pageSize}
                    total={matches.data.total}
                    onPageChange={setPage}
                    onPageSizeChange={(size) => {
                      setPageSize(size)
                      setPage(1)
                    }}
                  />
                </>
              )
            ) : null}
          </section>
        </>
      )}
    </div>
  )
}

function SyncMatchesButton({ items, steamId }: { items: MatchListItem[]; steamId: string }) {
  const sync = useSyncMatches(steamId)
  const pending = items.filter((m) => m.status !== 'COMPLETED')
  const pendingIds = pending.map((m) => String(m.matchId))
  const progress = sync.progress
  const percent =
    progress && progress.total > 0 ? Math.round((progress.done / progress.total) * 100) : 0
  const hasFailed = (progress?.failed.length ?? 0) > 0

  return (
    <div className='flex flex-wrap items-center gap-2'>
      {sync.running && progress ? (
        <div className='flex items-center gap-2'>
          <div className='h-1.5 w-32 overflow-hidden rounded-full bg-muted'>
            <div
              className='h-full rounded-full bg-primary transition-all'
              style={{ width: `${percent}%` }}
            />
          </div>
          <span className='text-xs text-muted-foreground tabular-nums'>
            同步中 {progress.done}/{progress.total}
          </span>
        </div>
      ) : (
        <Button
          size='sm'
          variant={hasFailed ? 'secondary' : 'outline'}
          disabled={pendingIds.length === 0}
          title={pendingIds.length === 0 ? '当页比赛均已同步' : undefined}
          onClick={() => sync.run(pendingIds)}
        >
          {hasFailed
            ? `重试失败 ${progress?.failed.length ?? 0} 场`
            : pendingIds.length > 0
              ? `同步当页详情（${pendingIds.length} 场）`
              : '当页已全部同步'}
        </Button>
      )}
      {!sync.running && hasFailed && progress && (
        <span className='max-w-64 truncate font-mono text-xs text-destructive'>
          失败：{progress.failed.join('、')}
        </span>
      )}
    </div>
  )
}

function PaginationBar({
  page,
  pageSize,
  total,
  onPageChange,
  onPageSizeChange,
}: {
  page: number
  pageSize: number
  total: number
  onPageChange: (page: number) => void
  onPageSizeChange: (pageSize: number) => void
}) {
  const totalPages = Math.max(1, Math.ceil(total / pageSize))
  return (
    <div className='flex flex-wrap items-center justify-between gap-3'>
      <div className='flex items-center gap-3 text-sm text-muted-foreground'>
        <span>
          共 {total} 场，第 {page} / {totalPages} 页
        </span>
        <label className='flex items-center gap-1.5'>
          每页
          <Select
            value={String(pageSize)}
            onValueChange={(value) => onPageSizeChange(Number(value))}
          >
            <SelectTrigger size='sm' className='min-w-16'>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {PAGE_SIZE_OPTIONS.map((size) => (
                <SelectItem key={size} value={String(size)}>
                  {size}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          条
        </label>
      </div>
      <Pagination>
        <PaginationContent>
          <PaginationItem>
            <PaginationPrevious
              text='上一页'
              aria-disabled={page <= 1}
              className={page <= 1 ? 'pointer-events-none opacity-40' : undefined}
              onClick={(e) => {
                e.preventDefault()
                if (page > 1) onPageChange(page - 1)
              }}
            />
          </PaginationItem>
          <PaginationItem>
            <PaginationNext
              text='下一页'
              aria-disabled={page >= totalPages}
              className={page >= totalPages ? 'pointer-events-none opacity-40' : undefined}
              onClick={(e) => {
                e.preventDefault()
                if (page < totalPages) onPageChange(page + 1)
              }}
            />
          </PaginationItem>
        </PaginationContent>
      </Pagination>
    </div>
  )
}
