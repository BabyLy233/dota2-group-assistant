import { Link, createFileRoute } from '@tanstack/react-router'
import { useState } from 'react'
import { ApiError } from '@/lib/api'
import { ErrorState, LoadingState } from '@/components/StateViews'
import { MatchOverview } from '@/features/match/MatchOverview'
import { MatchPlayersTable } from '@/features/match/MatchPlayersTable'
import { MatchPickBans } from '@/features/match/MatchPickBans'
import { KillsTimeline } from '@/features/match/KillsTimeline'
import { RawDataView } from '@/features/match/RawDataView'
import { AnalysisTab } from '@/features/match/AnalysisTab'
import { useMatch, useSyncMatch } from '@/features/match/use-match'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'

interface MatchSearch {
  from?: string
}

export const Route = createFileRoute('/matches/$matchId')({
  validateSearch: (search: Record<string, unknown>): MatchSearch => ({
    from: typeof search.from === 'string' ? search.from : undefined,
  }),
  component: MatchPage,
})

type Tab = 'overview' | 'players' | 'bans' | 'kills' | 'ai' | 'raw'

function MatchPage() {
  const { matchId } = Route.useParams()
  const { from } = Route.useSearch()
  const [tab, setTab] = useState<Tab>('overview')
  const match = useMatch(matchId)
  const sync = useSyncMatch(matchId)

  const matchMissing = match.error instanceof ApiError && match.error.status === 404

  return (
    <div className='space-y-6'>
      <p className='flex items-center gap-2 text-sm text-muted-foreground'>
        {from && (
          <Link
            to='/players/$steamId'
            params={{ steamId: from }}
            className='text-muted-foreground transition hover:text-foreground'
          >
            ← 返回玩家
          </Link>
        )}
        {from && <span className='text-muted-foreground/50'>/</span>}
        <Link to='/' className='transition hover:text-foreground'>
          首页
        </Link>
        <span className='text-muted-foreground/50'>/</span>
        <span className='font-mono'>Match {matchId}</span>
      </p>

      {match.isLoading ? (
        <LoadingState />
      ) : matchMissing ? (
        <Card>
          <CardContent className='py-10 text-center'>
            <p className='mb-4 text-muted-foreground'>
              比赛数据不存在，点击同步从 STRATZ 获取完整数据
            </p>
            <Button onClick={() => sync.mutate()} disabled={sync.isPending}>
              {sync.isPending ? '同步中…' : '同步比赛'}
            </Button>
            {sync.isError && (
              <p className='mt-3 text-sm text-destructive'>同步失败：{sync.error.message}</p>
            )}
          </CardContent>
        </Card>
      ) : match.error ? (
        <ErrorState message={`加载比赛失败：${match.error.message}`} />
      ) : match.data ? (
        <Tabs value={tab} onValueChange={(value) => setTab(value as Tab)} className='space-y-6'>
          <TabsList variant='line'>
            <TabsTrigger value='overview'>概览</TabsTrigger>
            <TabsTrigger value='players'>玩家</TabsTrigger>
            <TabsTrigger value='bans'>选禁</TabsTrigger>
            <TabsTrigger value='kills'>击杀</TabsTrigger>
            <TabsTrigger value='ai'>智能分析</TabsTrigger>
            <TabsTrigger value='raw'>原始数据</TabsTrigger>
          </TabsList>
          <TabsContent value='overview'>
            <MatchOverview detail={match.data} syncMutation={sync} />
          </TabsContent>
          <TabsContent value='players'>
            <MatchPlayersTable players={match.data.players} />
          </TabsContent>
          <TabsContent value='bans'>
            <MatchPickBans detail={match.data} />
          </TabsContent>
          <TabsContent value='kills'>
            <KillsTimeline players={match.data.players} />
          </TabsContent>
          <TabsContent value='ai'>
            <AnalysisTab match={match.data} />
          </TabsContent>
          <TabsContent value='raw'>
            <RawDataView data={match.data.rawData} />
          </TabsContent>
        </Tabs>
      ) : null}
    </div>
  )
}
