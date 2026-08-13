import { useState } from 'react'
import { useNavigate } from '@tanstack/react-router'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'

const STEAM_ID_PATTERN = /^\d{17}$/

export function PlayerSearchForm() {
  const navigate = useNavigate()
  const [steamId, setSteamId] = useState('')
  const [error, setError] = useState('')

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    const value = steamId.trim()
    if (!STEAM_ID_PATTERN.test(value)) {
      setError('请输入 17 位数字的 Steam ID')
      return
    }
    setError('')
    navigate({ to: '/players/$steamId', params: { steamId: value } })
  }

  return (
    <form onSubmit={handleSubmit} className='flex w-full gap-2'>
      <label htmlFor='steam-id' className='sr-only'>
        Steam ID
      </label>
      <Input
        id='steam-id'
        value={steamId}
        onChange={(e) => {
          setSteamId(e.target.value)
          if (error) setError('')
        }}
        placeholder='76561198xxxxxxxxx'
        className='h-10 flex-1'
        aria-invalid={error ? true : undefined}
      />
      <Button type='submit' size='lg' className='h-10 shrink-0'>
        查询
      </Button>
      {error && <p className='mt-2 text-sm text-destructive'>{error}</p>}
    </form>
  )
}
