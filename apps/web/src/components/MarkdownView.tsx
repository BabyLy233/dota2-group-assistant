import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'

const components = {
  h1: (props: React.ComponentPropsWithoutRef<'h1'>) => (
    <h1
      className='mt-2 mb-3 border-b border-border pb-1.5 text-xl font-bold tracking-tight'
      {...props}
    />
  ),
  h2: (props: React.ComponentPropsWithoutRef<'h2'>) => (
    <h2 className='mt-6 mb-2 text-lg font-bold tracking-tight' {...props} />
  ),
  h3: (props: React.ComponentPropsWithoutRef<'h3'>) => (
    <h3 className='mt-4 mb-1.5 text-base font-semibold' {...props} />
  ),
  p: (props: React.ComponentPropsWithoutRef<'p'>) => (
    <p className='my-2 leading-relaxed' {...props} />
  ),
  strong: (props: React.ComponentPropsWithoutRef<'strong'>) => (
    <strong className='font-semibold text-foreground' {...props} />
  ),
  em: (props: React.ComponentPropsWithoutRef<'em'>) => <em className='italic' {...props} />,
  ul: (props: React.ComponentPropsWithoutRef<'ul'>) => (
    <ul className='my-2 list-disc space-y-1 pl-5' {...props} />
  ),
  ol: (props: React.ComponentPropsWithoutRef<'ol'>) => (
    <ol className='my-2 list-decimal space-y-1 pl-5' {...props} />
  ),
  li: (props: React.ComponentPropsWithoutRef<'li'>) => (
    <li className='my-0.5 leading-relaxed' {...props} />
  ),
  blockquote: (props: React.ComponentPropsWithoutRef<'blockquote'>) => (
    <blockquote
      className='my-3 border-l-2 border-primary/50 pl-3 text-muted-foreground italic'
      {...props}
    />
  ),
  code: (props: React.ComponentPropsWithoutRef<'code'>) => (
    <code
      className='rounded-md bg-muted px-1.5 py-0.5 font-mono text-[0.85em] text-foreground'
      {...props}
    />
  ),
  pre: (props: React.ComponentPropsWithoutRef<'pre'>) => (
    <pre
      className='my-3 overflow-x-auto rounded-lg bg-neutral-950/80 p-3.5 font-mono text-xs leading-relaxed text-neutral-200'
      {...props}
    />
  ),
  table: (props: React.ComponentPropsWithoutRef<'table'>) => (
    <div className='my-3 overflow-x-auto rounded-lg border border-border'>
      <table className='w-full border-collapse text-sm' {...props} />
    </div>
  ),
  thead: (props: React.ComponentPropsWithoutRef<'thead'>) => (
    <thead className='border-b border-border bg-muted/60' {...props} />
  ),
  th: (props: React.ComponentPropsWithoutRef<'th'>) => (
    <th
      className='px-3 py-2 text-left text-xs font-semibold tracking-wide text-muted-foreground'
      {...props}
    />
  ),
  td: (props: React.ComponentPropsWithoutRef<'td'>) => (
    <td className='border-t border-border/60 px-3 py-1.5 align-top' {...props} />
  ),
  a: (props: React.ComponentPropsWithoutRef<'a'>) => (
    <a className='text-primary underline underline-offset-2 hover:text-primary/80' {...props} />
  ),
  hr: (props: React.ComponentPropsWithoutRef<'hr'>) => (
    <hr className='my-4 border-border' {...props} />
  ),
}

export function MarkdownView({ content }: { content: string }) {
  return (
    <div className='text-[0.9rem] leading-relaxed text-foreground/90'>
      <ReactMarkdown remarkPlugins={[remarkGfm]} components={components}>
        {content}
      </ReactMarkdown>
    </div>
  )
}
