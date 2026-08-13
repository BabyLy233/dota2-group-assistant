import type { UseMutationResult } from '@tanstack/react-query'
import type { Player } from '@dota/shared'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Button } from '@/components/ui/button'
import { Card, CardAction, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'

interface PlayerHeaderProps {
  player?: Player
  syncMutation: UseMutationResult<Player, Error, void, unknown>
  favoriteMutation: UseMutationResult<Player, Error, boolean, unknown>
}

export function PlayerHeader({ player, syncMutation, favoriteMutation }: PlayerHeaderProps) {
  return (
    <Card>
      <CardHeader>
        <div className='flex min-w-0 items-center gap-4'>
          <Avatar size='lg'>
            {player?.avatar ? <AvatarImage src={player.avatar} alt={player?.name ?? ''} /> : null}
            <AvatarFallback>{player?.name?.charAt(0) ?? '?'}</AvatarFallback>
          </Avatar>
          <div className='min-w-0'>
            <CardTitle className='truncate text-lg'>{player?.name ?? '-'}</CardTitle>
            <CardDescription className='mt-1 break-all font-mono text-xs'>
              Steam ID：{player?.steamId ?? '-'}
            </CardDescription>
          </div>
        </div>
        <CardAction>
          <div className='flex gap-2'>
            <Button
              variant={player?.favorite ? 'secondary' : 'outline'}
              onClick={() => favoriteMutation.mutate(!player?.favorite)}
              disabled={favoriteMutation.isPending}
              title={player?.favorite ? '取消收藏' : '收藏该玩家'}
            >
              {player?.favorite ? '★ 已收藏' : '☆ 收藏'}
            </Button>
            <Button onClick={() => syncMutation.mutate()} disabled={syncMutation.isPending}>
              {syncMutation.isPending ? '同步中…' : '手动同步'}
            </Button>
          </div>
        </CardAction>
      </CardHeader>
    </Card>
  )
}
