import { ToolCard } from './ToolCard'

export type SuiteTool = { id: string; name: string; blurb: string; path: string; repo: string; enabled: boolean }

export function App({ tools }: { tools: SuiteTool[] }) {
  return (
    <main className="bg-surface-page text-text-primary min-h-dvh">
      <div className="mx-auto flex max-w-3xl flex-col gap-6 px-4 pt-8 pb-12">
        <header className="flex flex-col gap-2">
          <h1 className="text-3xl leading-tight font-bold">AI Studio Suite</h1>
          <p className="text-text-secondary">Six filmmaking tools, one address. Story to shot to motion reference.</p>
        </header>
        <ol aria-label="Pipeline" className="bg-surface-card border-border divide-border divide-y overflow-hidden rounded-xl border">
          {tools.map((tool, i) => (
            <li key={tool.id}><ToolCard tool={tool} step={i + 1} /></li>
          ))}
        </ol>
        <footer id="credits" className="text-text-secondary max-w-prose text-sm">
          Tools by Sam Wasserman, Wasserman Productions (<a className="text-text-primary underline underline-offset-4" href="https://wassermanproductions.com">wassermanproductions.com</a>), Apache-2.0.
          If they help you, support the author at <a className="text-text-primary underline underline-offset-4" href="https://ko-fi.com/samwasserman">ko-fi.com/samwasserman</a>.
        </footer>
      </div>
    </main>
  )
}
