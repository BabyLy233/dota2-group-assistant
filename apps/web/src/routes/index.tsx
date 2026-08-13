import { Link, createFileRoute } from '@tanstack/react-router'
import { PlayerSearchForm } from '@/features/player/PlayerSearchForm'
import { useSyncedPlayers } from '@/features/player/use-player'
import { LoadingState, EmptyState } from '@/components/StateViews'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Separator } from '@/components/ui/separator'

export const Route = createFileRoute('/')({
  component: IndexPage,
})

function IndexPage() {
  const synced = useSyncedPlayers()

  return (
    <div className='mx-auto max-w-xl space-y-10 py-10'>
      <section className='text-center'>
        <h1 className='text-3xl font-bold tracking-tight'>Dota 2 战报工具</h1>
        <p className='mt-2 text-sm text-muted-foreground'>
          输入 Steam ID 查询玩家信息、最近比赛与详细战报
        </p>
      </section>

      <Card>
        <CardHeader>
          <CardTitle>玩家搜索</CardTitle>
        </CardHeader>
        <CardContent>
          <PlayerSearchForm />
        </CardContent>
      </Card>

      {synced.isLoading ? (
        <LoadingState rows={3} />
      ) : synced.error ? null : synced.data?.items.length === 0 ? (
        <section>
          <div className='mb-3 flex items-center gap-3'>
            <h2 className='text-sm font-medium text-muted-foreground'>已同步玩家</h2>
            <Separator className='flex-1' />
          </div>
          <EmptyState message='暂无已同步玩家，搜索一个 Steam ID 开始吧' />
        </section>
      ) : (
        <>
          <PlayerListSection
            title='收藏玩家'
            players={(synced.data?.items ?? []).filter((p) => p.favorite)}
          />
          <PlayerListSection
            title='其他已同步玩家'
            players={(synced.data?.items ?? []).filter((p) => !p.favorite).slice(0, 5)}
          />
        </>
      )}
    </div>
  )
}

function PlayerListSection({
  title,
  players,
}: {
  title: string
  players: Array<{ steamId: string; name: string; avatar: string | null; favorite: boolean }>
}) {
  if (!players.length) return null
  return (
    <section>
      <div className='mb-3 flex items-center gap-3'>
        <h2 className='text-sm font-medium text-muted-foreground'>{title}</h2>
        <Separator className='flex-1' />
      </div>
      <div className='space-y-2'>
        {players.map((p) => (
          <Link
            key={p.steamId}
            to='/players/$steamId'
            params={{ steamId: p.steamId }}
            className='flex items-center gap-3 rounded-xl border border-border bg-card px-4 py-3 transition hover:bg-muted/50'
          >
            <Avatar>
              {p.avatar ? <AvatarImage src={p.avatar} alt={p.name} /> : null}
              <AvatarFallback>{p.name?.charAt(0) ?? '?'}</AvatarFallback>
            </Avatar>
            <div className='min-w-0 flex-1'>
              <p className='truncate text-sm font-medium'>
                {p.favorite ? '★ ' : ''}
                {p.name}
              </p>
              <p className='truncate font-mono text-xs text-muted-foreground'>{p.steamId}</p>
            </div>
          </Link>
        ))}
      </div>
    </section>
  )
}
