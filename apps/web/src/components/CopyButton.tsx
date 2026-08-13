import { useState } from 'react'
import { Button } from '@/components/ui/button'

export function CopyButton({ text, label = '复制' }: { text: string; label?: string }) {
  const [copied, setCopied] = useState(false)

  async function handleCopy() {
    try {
      await navigator.clipboard.writeText(text)
      setCopied(true)
      setTimeout(() => setCopied(false), 1500)
    } catch {
      // clipboard unavailable
    }
  }

  return (
    <Button variant='outline' size='xs' onClick={handleCopy}>
      {copied ? '已复制 ✓' : label}
    </Button>
  )
}
