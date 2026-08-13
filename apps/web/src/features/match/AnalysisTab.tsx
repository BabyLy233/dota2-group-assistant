import { Link } from '@tanstack/react-router'
import type { MatchDetail } from '@dota/shared'
import { loadAiSettings } from '@/lib/ai-settings'
import { formatFullDateTime } from '@/lib/format'
import { Button } from '@/components/ui/button'
import {
  Card,
  CardAction,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import { CopyButton } from '@/components/CopyButton'
import { MarkdownView } from '@/components/MarkdownView'
import { useStreamAnalyze, ANALYSIS_TTL_MS } from './use-stream-analyze'

export function AnalysisTab({ match }: { match: MatchDetail }) {
  const stream = useStreamAnalyze(String(match.matchId))
  const settings = loadAiSettings()
  const configured = Boolean(settings.baseURL && settings.apiKey && settings.model)
  const full = match.analysis
  const brief = match.brief
  const briefStreaming = stream.streaming && stream.currentType === 'brief'
  const fullStreaming = stream.streaming && stream.currentType === 'full'
  const inProgressError = stream.errorCode === 'analysis_in_progress'

  const briefStuck =
    match.analysisBriefStatus === 'PROCESSING' &&
    match.analysisBriefStartedAt != null &&
    Date.now() - match.analysisBriefStartedAt > ANALYSIS_TTL_MS
  const fullStuck =
    match.analysisFullStatus === 'PROCESSING' &&
    match.analysisFullStartedAt != null &&
    Date.now() - match.analysisFullStartedAt > ANALYSIS_TTL_MS
  const briefProcessing =
    (match.analysisBriefStatus === 'PROCESSING' && !briefStuck) || briefStreaming
  const fullProcessing = (match.analysisFullStatus === 'PROCESSING' && !fullStuck) || fullStreaming

  if (match.status !== 'COMPLETED') {
    return (
      <Card>
        <CardContent className='py-10 text-center text-sm text-muted-foreground'>
          比赛尚未解析完成，状态为 {match.status}，无法进行智能分析。请先在概览页点击「重新同步」。
        </CardContent>
      </Card>
    )
  }

  if (!configured) {
    return (
      <Card>
        <CardContent className='py-10 text-center'>
          <p className='mb-4 text-sm text-muted-foreground'>
            尚未配置智能分析服务。请先到设置页填写接口地址、接口密钥和模型名称。
          </p>
          <Link to='/settings'>
            <Button>去设置</Button>
          </Link>
        </CardContent>
      </Card>
    )
  }

  return (
    <div className='space-y-6'>
      {fullStuck && (
        <Card className='border-amber-500/40'>
          <CardContent className='py-4 text-center text-sm text-amber-400'>
            上次详细战报分析已中断，超过 3 分钟未完成，可直接点击下方「重新分析」强制重新生成
          </CardContent>
        </Card>
      )}
      {briefStuck && (
        <Card className='border-amber-500/40'>
          <CardContent className='py-4 text-center text-sm text-amber-400'>
            上次简报生成已中断，超过 3 分钟未完成，可直接点击下方「重新生成」强制重新生成
          </CardContent>
        </Card>
      )}

      <Card className={briefStreaming ? 'border-primary/40' : undefined}>
        <CardHeader>
          <CardTitle className='text-sm font-medium'>💬 QQ 群简报</CardTitle>
          <CardAction>
            {brief ? (
              <div className='flex gap-2'>
                <CopyButton text={brief.text} label='复制简报' />
                <Button
                  variant='outline'
                  size='xs'
                  disabled={briefProcessing}
                  onClick={() => stream.run({ type: 'brief', force: true })}
                >
                  {briefProcessing ? '分析中…' : '重新生成'}
                </Button>
              </div>
            ) : null}
          </CardAction>
          {brief && (
            <CardDescription className='text-xs'>
              模型：{brief.model} · 生成于 {formatFullDateTime(brief.createdAt)}
            </CardDescription>
          )}
        </CardHeader>
        <CardContent>
          {briefStreaming ? (
            <div className='min-h-24 rounded-lg bg-muted/40 p-5'>
              <MarkdownView content={stream.content} />
              <div className='mt-3 flex items-center gap-2 text-xs text-muted-foreground'>
                <span className='inline-block size-2 animate-pulse rounded-full bg-primary' />
                正在生成简报…
              </div>
            </div>
          ) : brief ? (
            <div className='rounded-lg bg-muted/40 p-5'>
              <MarkdownView content={brief.text} />
            </div>
          ) : (
            <div className='py-6 text-center'>
              <p className='mb-4 text-sm text-muted-foreground'>
                生成一份 150~250 字的犀利简报：谁在犯罪谁背锅、谁在带飞，适合直接发 QQ 群
              </p>
              <Button
                variant='secondary'
                disabled={briefProcessing}
                onClick={() => stream.run({ type: 'brief' })}
              >
                {briefProcessing ? '分析中…' : '生成简报'}
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      <Card className={fullStreaming ? 'border-primary/40' : undefined}>
        <CardHeader>
          <CardTitle className='text-sm font-medium'>📄 完整战报分析</CardTitle>
          <CardAction>
            {full ? (
              <div className='flex gap-2'>
                <CopyButton text={full.text} label='复制全文' />
                <Button
                  variant='outline'
                  size='xs'
                  disabled={fullProcessing}
                  onClick={() => stream.run({ type: 'full', force: true })}
                >
                  {fullProcessing ? '分析中…' : '重新分析'}
                </Button>
              </div>
            ) : null}
          </CardAction>
          {full && (
            <CardDescription className='text-xs'>
              模型：{full.model} · 生成于 {formatFullDateTime(full.createdAt)}
            </CardDescription>
          )}
        </CardHeader>
        <CardContent>
          {fullStreaming ? (
            <div className='min-h-32 rounded-lg bg-muted/40 p-5'>
              <MarkdownView content={stream.content} />
              <div className='mt-3 flex items-center gap-2 text-xs text-muted-foreground'>
                <span className='inline-block size-2 animate-pulse rounded-full bg-primary' />
                正在生成完整战报…
              </div>
            </div>
          ) : full ? (
            <div className='rounded-lg bg-muted/40 p-5'>
              <MarkdownView content={full.text} />
            </div>
          ) : (
            <div className='py-8 text-center'>
              <p className='mb-4 text-sm text-muted-foreground'>
                使用 {settings.model} 生成这一局比赛的完整分析报告，结果将保存，避免重复分析
              </p>
              <Button onClick={() => stream.run({ type: 'full' })} disabled={fullProcessing}>
                {fullProcessing ? '分析中…' : '生成分析'}
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      {stream.status === 'error' && (
        <p className='rounded-md bg-destructive/10 px-3 py-2 text-sm text-destructive'>
          分析失败：{stream.error}
          {inProgressError && (
            <button
              type='button'
              className='ml-2 underline underline-offset-2'
              onClick={() => stream.run({ type: 'full', force: true })}
            >
              强制重新分析
            </button>
          )}
        </p>
      )}
    </div>
  )
}
