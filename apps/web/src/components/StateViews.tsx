import { Skeleton } from '@/components/ui/skeleton'
import { Card } from '@/components/ui/card'

export function LoadingState({ rows = 1 }: { rows?: number }) {
  return (
    <div className='space-y-3'>
      {Array.from({ length: rows }).map((_, i) => (
        <Skeleton key={i} className='h-14 w-full rounded-xl' />
      ))}
    </div>
  )
}

export function ErrorState({ message }: { message: string }) {
  return (
    <Card className='border-destructive/40 bg-destructive/5 px-6 py-10 text-center'>
      <p className='text-sm text-destructive'>{message}</p>
    </Card>
  )
}

export function EmptyState({ message }: { message: string }) {
  return (
    <Card className='bg-muted/40 px-6 py-10 text-center'>
      <p className='text-sm text-muted-foreground'>{message}</p>
    </Card>
  )
}
