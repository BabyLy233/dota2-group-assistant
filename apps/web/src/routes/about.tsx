import { Link, createFileRoute } from '@tanstack/react-router'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'

export const Route = createFileRoute('/about')({
  component: AboutPage,
})

function AboutPage() {
  return (
    <div className='mx-auto max-w-2xl space-y-6'>
      <h1 className='text-2xl font-bold tracking-tight'>关于本站</h1>

      <Card>
        <CardHeader>
          <CardTitle>项目简介</CardTitle>
          <CardDescription>
            Dota 2 战报工具是一个本地运行的数据分析工具，用于查询玩家信息、比赛记录并生成 AI 战报。
          </CardDescription>
        </CardHeader>
        <CardContent className='space-y-2 text-sm text-muted-foreground'>
          <p>主要功能：</p>
          <ul className='list-disc space-y-1 pl-5'>
            <li>按 Steam ID 搜索玩家并同步最近比赛</li>
            <li>比赛详情：比分、BP 选禁、经济领先曲线、击杀时间线、玩家数据与装备</li>
            <li>智能分析：完整战报与 QQ 群简报，支持自定义 AI 接口，结果本地缓存</li>
            <li>收藏玩家快速访问，主题与分页自定义</li>
          </ul>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>数据来源</CardTitle>
        </CardHeader>
        <CardContent className='space-y-2 text-sm text-muted-foreground'>
          <p>
            比赛与玩家数据来自{' '}
            <a
              href='https://stratz.com'
              target='_blank'
              rel='noreferrer'
              className='text-primary underline underline-offset-2'
            >
              STRATZ API
            </a>
            ，受其速率配额限制，本工具已内置限流控制。
          </p>
          <p>AI 分析使用您自行配置的 OpenAI 兼容接口，密钥仅保存在本地浏览器。</p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>免责声明</CardTitle>
        </CardHeader>
        <CardContent className='text-sm text-muted-foreground'>
          <p>
            本站为个人学习用途的本地工具，与 Valve 公司及 Dota 2 官方无任何关联。AI
            生成的分析内容仅供参考，可能存在错误或不准确之处。
          </p>
        </CardContent>
      </Card>

      <p className='text-sm text-muted-foreground'>
        <Link to='/' className='text-primary transition hover:text-primary/80'>
          ← 返回首页
        </Link>
      </p>
    </div>
  )
}
