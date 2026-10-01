import { Button } from '@weeeha/ui/components/button'
import { Card, CardDescription, CardFooter, CardHeader } from '@weeeha/ui/components/card'
import type { SuiteTool } from './App'

export function ToolCard({ tool, step }: { tool: SuiteTool; step: number }) {
  const id = `tool-${tool.id}`
  return (
    <Card
      role="article"
      aria-labelledby={id}
      data-enabled={tool.enabled}
      className="min-h-18 flex-col items-stretch gap-3 rounded-none bg-transparent py-4 ring-0 has-data-[slot=card-footer]:pb-4 sm:flex-row sm:items-center sm:gap-4"
    >
      <CardHeader className="flex flex-1 items-start gap-3">
        <span className="text-text-secondary w-8 shrink-0 pt-0.5 text-center text-sm font-medium">
          <span className="sr-only">Step </span>{step}
        </span>
        <div className="flex flex-col gap-0.5">
          <h2
            id={id}
            className={tool.enabled ? 'text-text-primary text-xl leading-snug font-bold' : 'text-text-primary text-base leading-snug font-medium'}
          >
            {tool.name}
          </h2>
          <CardDescription className="text-text-secondary">{tool.blurb}</CardDescription>
        </div>
      </CardHeader>
      <CardFooter className="shrink-0 gap-3 border-t-0 bg-transparent p-0 pl-14 sm:justify-end sm:pr-(--card-spacing) sm:pl-0">
        {tool.enabled ? (
          <Button asChild size="lg" className="px-4 text-sm">
            <a href={`.${tool.path}`} aria-label={`Open ${tool.name}`}>Open</a>
          </Button>
        ) : (
          <>
            <span className="text-text-secondary text-sm">Desktop only for now</span>
            <a
              className="text-text-primary hover:text-text-secondary inline-flex min-h-10 items-center text-sm font-medium underline underline-offset-4"
              href={`https://github.com/${tool.repo}`}
              aria-label={`${tool.name} fork on GitHub`}
            >
              Fork on GitHub
            </a>
          </>
        )}
      </CardFooter>
    </Card>
  )
}
