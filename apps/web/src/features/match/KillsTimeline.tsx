import type { MatchPlayerDetail } from '@dota/shared'
import { useConstants } from '@/lib/use-constants'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'

interface KillRow {
  time: number
  attacker: number | null
  target: number | null
  attackerPlayerSlot: number
  targetPlayerSlot: number
  assistCount: number
  isSolo: boolean
  isGank: boolean
}

export function KillsTimeline({ players }: { players: MatchPlayerDetail[] }) {
  const { data: constants } = useConstants()

  const heroBySlot = new Map<number, number>()
  const playerByHero = new Map<number, number>()
  for (const p of players) {
    if (p.heroId != null) playerByHero.set(p.heroId, p.playerSlot ?? 0)
  }

  const rows: KillRow[] = []
  for (const p of players) {
    for (const k of p.killEvents) {
      if (k.attacker == null) continue
      rows.push({
        time: k.time,
        attacker: k.attacker,
        target: k.target,
        attackerPlayerSlot: playerByHero.get(k.attacker) ?? p.playerSlot ?? 0,
        targetPlayerSlot: k.target != null ? (playerByHero.get(k.target) ?? 0) : 0,
        assistCount: k.assist?.length ?? 0,
        isSolo: k.isSolo ?? false,
        isGank: k.isGank ?? false,
      })
    }
  }
  rows.sort((a, b) => a.time - b.time)

  const isRadiantSlot = (slot: number) => slot < 5
  const heroName = (id: number | null) =>
    id != null ? (constants?.heroes[id] ?? `Hero ${id}`) : '?'

  if (!rows.length) {
    return (
      <Card>
        <CardContent className='py-8 text-center text-sm text-muted-foreground'>
          暂无击杀数据，比赛尚未解析
        </CardContent>
      </Card>
    )
  }

  const fmt = (t: number) => {
    const m = Math.floor(t / 60)
    const s = t % 60
    return `${m}:${String(s).padStart(2, '0')}`
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className='text-sm font-medium'>击杀时间线，共 {rows.length} 次击杀</CardTitle>
      </CardHeader>
      <CardContent>
        <div className='max-h-[55vh] space-y-1 overflow-y-auto pr-1'>
          {rows.map((r, i) => {
            const radiantKill = isRadiantSlot(r.attackerPlayerSlot)
            return (
              <div
                key={i}
                className={`flex items-center gap-3 rounded-md px-2 py-1 text-sm ${
                  radiantKill
                    ? 'bg-emerald-500/10 text-emerald-700 dark:bg-emerald-500/[0.07] dark:text-emerald-300'
                    : 'bg-red-500/10 text-red-700 dark:bg-red-500/[0.07] dark:text-red-300'
                }`}
              >
                <span className='w-10 shrink-0 tabular-nums text-muted-foreground'>
                  {fmt(r.time)}
                </span>
                <span className='font-medium'>
                  {heroName(r.attacker)}
                  {r.assistCount > 0 && (
                    <span className='ml-1 text-xs text-muted-foreground'>
                      +{r.assistCount} 助攻
                    </span>
                  )}
                  {r.isSolo && (
                    <span className='ml-1.5 rounded bg-amber-500/20 px-1 text-xs text-amber-400'>
                      单杀
                    </span>
                  )}
                  {r.isGank && (
                    <span className='ml-1.5 rounded bg-purple-500/20 px-1 text-xs text-purple-400'>
                      Gank
                    </span>
                  )}
                </span>
                <span className='text-muted-foreground'>→</span>
                <span>{heroName(r.target)}</span>
              </div>
            )
          })}
        </div>
      </CardContent>
    </Card>
  )
}
