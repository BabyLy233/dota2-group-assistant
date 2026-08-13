import { format } from 'date-fns'

export function formatDateTime(ts: number | null): string {
  if (ts == null) return '-'
  return format(new Date(ts * 1000), 'MM-dd HH:mm')
}

export function formatDuration(seconds: number | null): string {
  if (seconds == null) return '-'
  const m = Math.floor(seconds / 60)
  const s = seconds % 60
  return `${m}m${String(s).padStart(2, '0')}s`
}

export function formatNumber(value: number | null): string {
  if (value == null) return '-'
  return value.toLocaleString('en-US')
}

export function formatFullDateTime(ts: number | null): string {
  if (ts == null) return '-'
  return format(new Date(ts), 'yyyy-MM-dd HH:mm')
}
