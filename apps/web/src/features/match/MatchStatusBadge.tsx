import { Badge } from '@/components/ui/badge'
import type { MatchStatus } from '@dota/shared'

const VARIANTS: Record<MatchStatus, 'default' | 'secondary' | 'destructive' | 'outline'> = {
  PENDING: 'secondary',
  PROCESSING: 'outline',
  COMPLETED: 'default',
  FAILED: 'destructive',
}

const LABELS: Record<MatchStatus, string> = {
  PENDING: '待同步',
  PROCESSING: '解析中',
  COMPLETED: '已完成',
  FAILED: '失败',
}

export function MatchStatusBadge({ status }: { status: MatchStatus }) {
  return <Badge variant={VARIANTS[status]}>{LABELS[status]}</Badge>
}
