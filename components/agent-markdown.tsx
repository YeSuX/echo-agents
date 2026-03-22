"use client"

import type { Components } from "react-markdown"
import ReactMarkdown from "react-markdown"
import remarkGfm from "remark-gfm"

import { cn } from "@/lib/utils"

const markdownComponents: Partial<Components> = {
  h1: ({ children }) => (
    <h2 className="mb-2 mt-3 text-base font-semibold first:mt-0">
      {children}
    </h2>
  ),
  h2: ({ children }) => (
    <h2 className="mb-2 mt-3 text-base font-semibold first:mt-0">
      {children}
    </h2>
  ),
  h3: ({ children }) => (
    <h3 className="mb-1.5 mt-2 text-sm font-semibold first:mt-0">
      {children}
    </h3>
  ),
  p: ({ children }) => (
    <p className="mb-2 leading-relaxed last:mb-0">{children}</p>
  ),
  ul: ({ children }) => (
    <ul className="mb-2 list-disc space-y-1 pl-4 last:mb-0">{children}</ul>
  ),
  ol: ({ children }) => (
    <ol className="mb-2 list-decimal space-y-1 pl-4 last:mb-0">{children}</ol>
  ),
  li: ({ children }) => <li className="leading-relaxed">{children}</li>,
  strong: ({ children }) => (
    <strong className="font-semibold text-foreground">{children}</strong>
  ),
  em: ({ children }) => <em className="italic">{children}</em>,
  blockquote: ({ children }) => (
    <blockquote className="mb-2 border-l-2 border-muted-foreground/40 pl-3 text-muted-foreground last:mb-0">
      {children}
    </blockquote>
  ),
  hr: () => <hr className="my-3 border-border" />,
  a: ({ href, children }) => {
    const external = href?.startsWith("http")
    return (
      <a
        href={href}
        className="font-medium text-primary underline underline-offset-2 hover:text-primary/90"
        target={external ? "_blank" : undefined}
        rel={external ? "noopener noreferrer" : undefined}
      >
        {children}
      </a>
    )
  },
  code: ({ className, children, ...props }) => {
    const isBlock = Boolean(className?.includes("language-"))
    if (isBlock) {
      return (
        <code
          className={cn(
            "block overflow-x-auto rounded-md bg-background/80 p-2 font-mono text-xs",
            className,
          )}
          {...props}
        >
          {children}
        </code>
      )
    }
    return (
      <code
        className="rounded bg-background/80 px-1 py-0.5 font-mono text-xs"
        {...props}
      >
        {children}
      </code>
    )
  },
  pre: ({ children }) => (
    <pre className="mb-2 overflow-x-auto rounded-md border bg-background/50 p-2 last:mb-0">
      {children}
    </pre>
  ),
  table: ({ children }) => (
    <div className="mb-2 max-w-full overflow-x-auto last:mb-0">
      <table className="w-full min-w-[200px] border-collapse text-xs">
        {children}
      </table>
    </div>
  ),
  thead: ({ children }) => <thead>{children}</thead>,
  tbody: ({ children }) => <tbody>{children}</tbody>,
  tr: ({ children }) => <tr className="border-b border-border">{children}</tr>,
  th: ({ children }) => (
    <th className="border border-border px-2 py-1.5 text-left font-medium">
      {children}
    </th>
  ),
  td: ({ children }) => (
    <td className="border border-border px-2 py-1.5 align-top">{children}</td>
  ),
}

type AgentMarkdownProps = {
  content: string
  className?: string
}

export function AgentMarkdown({ content, className }: AgentMarkdownProps) {
  return (
    <div className={cn("agent-markdown min-w-0 wrap-break-word", className)}>
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        components={markdownComponents}
        disallowedElements={["script", "iframe", "object", "embed"]}
        unwrapDisallowed
      >
        {content}
      </ReactMarkdown>
    </div>
  )
}
