import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardAction, CardContent, CardHeader, CardTitle } from '@/components/ui/card'

export function RawDataView({ data }: { data: unknown }) {
  const [expanded, setExpanded] = useState(false)

  if (data == null) {
    return (
      <Card>
        <CardContent className='py-10 text-center text-sm text-muted-foreground'>
          暂无原始数据（比赛尚未解析）
        </CardContent>
      </Card>
    )
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className='text-sm font-medium'>STRATZ 原始数据</CardTitle>
        <CardAction>
          <Button variant='outline' size='xs' onClick={() => setExpanded((v) => !v)}>
            {expanded ? '折叠' : '展开'}
          </Button>
        </CardAction>
      </CardHeader>
      {expanded ? (
        <CardContent className='pt-0'>
          <pre className='max-h-[60vh] overflow-auto rounded-lg bg-muted/40 p-4 text-xs leading-relaxed text-muted-foreground'>
            {JSON.stringify(data, null, 2)}
          </pre>
        </CardContent>
      ) : null}
    </Card>
  )
}
