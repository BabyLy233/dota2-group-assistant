import { createFileRoute } from '@tanstack/react-router'
import { useState } from 'react'
import { loadAiSettings, saveAiSettings } from '@/lib/ai-settings'
import { Button } from '@/components/ui/button'
import {
  Card,
  CardAction,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import { Input } from '@/components/ui/input'

export const Route = createFileRoute('/settings')({
  component: SettingsPage,
})

function SettingsPage() {
  const [baseURL, setBaseURL] = useState(loadAiSettings().baseURL)
  const [apiKey, setApiKey] = useState(loadAiSettings().apiKey)
  const [model, setModel] = useState(loadAiSettings().model)
  const [saved, setSaved] = useState(false)

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    saveAiSettings({ baseURL: baseURL.trim(), apiKey: apiKey.trim(), model: model.trim() })
    setSaved(true)
    setTimeout(() => setSaved(false), 2000)
  }

  return (
    <div className='mx-auto max-w-xl space-y-6'>
      <h1 className='text-2xl font-bold tracking-tight'>智能分析设置</h1>

      <Card>
        <CardHeader>
          <CardTitle>智能分析接口</CardTitle>
          <CardDescription>
            支持任意兼容 OpenAI 标准的接口，如 DeepSeek、Kimi、通义千问、Ollama
            等。配置仅保存在本地浏览器，不会上传到服务器。
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className='space-y-4'>
            <div className='space-y-1.5'>
              <label htmlFor='base-url' className='text-sm font-medium'>
                接口地址
              </label>
              <Input
                id='base-url'
                value={baseURL}
                onChange={(e) => setBaseURL(e.target.value)}
                placeholder='https://api.deepseek.com/v1'
                className='font-mono text-sm'
              />
            </div>
            <div className='space-y-1.5'>
              <label htmlFor='api-key' className='text-sm font-medium'>
                接口密钥
              </label>
              <Input
                id='api-key'
                type='password'
                value={apiKey}
                onChange={(e) => setApiKey(e.target.value)}
                placeholder='sk-...'
                className='font-mono text-sm'
              />
            </div>
            <div className='space-y-1.5'>
              <label htmlFor='model' className='text-sm font-medium'>
                模型名称
              </label>
              <Input
                id='model'
                value={model}
                onChange={(e) => setModel(e.target.value)}
                placeholder='deepseek-chat'
                className='font-mono text-sm'
              />
            </div>
            <div className='flex items-center gap-3'>
              <Button type='submit'>保存设置</Button>
              {saved && <span className='text-sm text-emerald-500'>已保存 ✓</span>}
            </div>
          </form>
        </CardContent>
      </Card>

      <Card>
        <CardContent className='space-y-1.5 py-5 text-sm text-muted-foreground'>
          <p>常见配置示例：</p>
          <p className='font-mono text-xs'>DeepSeek: https://api.deepseek.com/v1 · deepseek-chat</p>
          <p className='font-mono text-xs'>
            Ollama 本地：http://localhost:11434/v1 · llama3.3，密钥随意填写
          </p>
        </CardContent>
      </Card>
    </div>
  )
}
