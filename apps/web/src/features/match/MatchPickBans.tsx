import type { MatchDetail } from '@dota/shared'
import { useConstants } from '@/lib/use-constants'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'

interface PickBanItem {
  isPick?: boolean
  heroId?: number | null
  bannedHeroId?: number | null
  order?: number | null
  isRadiant?: boolean | null
  wasBannedSuccessfully?: boolean
}

export function MatchPickBans({ detail }: { detail: MatchDetail }) {
  const { data: constants } = useConstants()
  const bans = (detail.pickBans as PickBanItem[] | null) ?? []
  const picks = bans.filter((b) => b.isPick)
  const bansList = bans.filter((b) => !b.isPick && b.wasBannedSuccessfully)

  if (!bans.length) {
    return (
      <Card>
        <CardContent className='py-8 text-center text-sm text-muted-foreground'>
          暂无数据
        </CardContent>
      </Card>
    )
  }

  const heroName = (id: number | null | undefined) =>
    id != null ? (constants?.heroes[id] ?? `英雄 ${id}`) : '?'

  return (
    <div className='grid gap-4 sm:grid-cols-2'>
      <Card>
        <CardHeader>
          <CardTitle className='text-sm'>选人</CardTitle>
        </CardHeader>
        <CardContent className='space-y-1.5'>
          {picks.map((p, i) => (
            <div key={i} className='flex items-center gap-2 text-sm'>
              <span className='w-6 shrink-0 text-right tabular-nums text-muted-foreground'>
                {i + 1}
              </span>
              <span
                className={`h-3.5 w-3.5 shrink-0 rounded-sm ${
                  p.isRadiant ? 'bg-emerald-500' : 'bg-red-500'
                }`}
              />
              <span className='font-medium'>{heroName(p.heroId)}</span>
              <span className='text-xs text-muted-foreground'>{p.isRadiant ? '天辉' : '夜魇'}</span>
            </div>
          ))}
        </CardContent>
      </Card>
      <Card>
        <CardHeader>
          <CardTitle className='text-sm'>禁用列表</CardTitle>
        </CardHeader>
        <CardContent className='space-y-1.5'>
          {bansList.length ? (
            bansList.map((b, i) => (
              <div key={i} className='flex items-center gap-2 text-sm text-muted-foreground'>
                <span className='w-6 shrink-0 text-right tabular-nums'>{i + 1}</span>
                <span className='h-3.5 w-3.5 shrink-0 rounded-sm bg-neutral-700' />
                <span className='line-through decoration-red-500/60'>
                  {heroName(b.bannedHeroId)}
                </span>
              </div>
            ))
          ) : (
            <p className='text-sm text-muted-foreground'>无禁用记录</p>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
