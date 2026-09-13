"use client"

import { useState } from "react"
import { ChevronRightIcon } from "lucide-react"

export function AgentReasoning({
  content,
  isThinking = false,
}: {
  content?: string
  isThinking?: boolean
}) {
  const [expanded, setExpanded] = useState(true)
  if (!content) return null

  return (
    <details
      open={expanded}
      onToggle={(event) => setExpanded(event.currentTarget.open)}
      className="group mb-3 rounded-lg border border-border/70 bg-background/50 text-muted-foreground"
    >
      <summary className="flex cursor-pointer list-none items-center gap-2 px-3 py-2 text-xs font-medium [&::-webkit-details-marker]:hidden">
        <ChevronRightIcon className="size-3.5 transition-transform group-open:rotate-90" aria-hidden="true" />
        {isThinking ? "Thinking…" : "View thinking"}
      </summary>
      <div className="max-h-56 overflow-y-auto whitespace-pre-wrap break-words border-t border-border/50 px-3 py-2 text-xs leading-relaxed">
        {content}
      </div>
    </details>
  )
}
