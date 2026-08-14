import { createRootRoute, Link, Outlet } from '@tanstack/react-router'
import { ThemeToggle } from '@/components/ThemeToggle'

export const Route = createRootRoute({
  component: RootLayout,
})

function RootLayout() {
  return (
    <div className='flex min-h-screen flex-col bg-background text-foreground'>
      <header className='border-b border-border'>
        <nav className='mx-auto flex max-w-5xl items-center gap-6 px-4 py-3'>
          <Link to='/' className='text-lg font-bold tracking-tight'>
            Dota 2 战报工具
          </Link>
          <Link
            to='/'
            className='text-sm text-muted-foreground transition hover:text-foreground'
            activeOptions={{ exact: true }}
          >
            玩家搜索
          </Link>
          <Link
            to='/settings'
            className='text-sm text-muted-foreground transition hover:text-foreground'
          >
            智能分析
          </Link>
          <Link
            to='/about'
            className='text-sm text-muted-foreground transition hover:text-foreground'
          >
            关于
          </Link>
          <div className='ml-auto'>
            <ThemeToggle />
          </div>
        </nav>
      </header>
      <main className='mx-auto w-full max-w-5xl flex-1 px-4 py-8'>
        <Outlet />
      </main>
      <footer className='border-t border-border'>
        <div className='mx-auto flex max-w-5xl flex-wrap items-center justify-between gap-2 px-4 py-4 text-xs text-muted-foreground'>
          <span>Dota 2 战报工具 · 数据来源 STRATZ API</span>
          <div className='flex items-center gap-4'>
            <a
              href='https://github.com/BabyLy233/dota2-group-assistant'
              target='_blank'
              rel='noreferrer'
              className='transition hover:text-foreground'
            >
              GitHub
            </a>
            <Link to='/about' className='transition hover:text-foreground'>
              关于本站
            </Link>
            <Link to='/settings' className='transition hover:text-foreground'>
              智能分析设置
            </Link>
          </div>
        </div>
      </footer>
    </div>
  )
}
