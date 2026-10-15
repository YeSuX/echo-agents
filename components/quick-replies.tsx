"use client"

import { useId, useState } from "react"
import { ChevronDownIcon } from "lucide-react"

import { Button } from "@/components/ui/button"
import styles from "@/components/companion-refresh.module.css"

type QuickRepliesProps = {
  replies: readonly string[]
  onPick: (text: string) => void
  disabled?: boolean
}

export function QuickReplies({
  replies,
  onPick,
  disabled,
}: QuickRepliesProps) {
  const [expanded, setExpanded] = useState(false)
  const choicesId = useId()
  const visibleReplies = expanded ? replies : replies.slice(0, 3)

  return (
    <div>
      <div id={choicesId} className={styles.quickReplies} role="group" aria-label="常见问题">
        {visibleReplies.map((q) => (
          <Button
            key={q}
            type="button"
            variant="outline"
            className={styles.quickReply}
            disabled={disabled}
            onClick={() => onPick(q)}
          >
            {q}
          </Button>
        ))}
      </div>
      {replies.length > 3 && (
        <button
          type="button"
          className={styles.moreReplies}
          onClick={() => setExpanded((value) => !value)}
          aria-expanded={expanded}
          aria-controls={choicesId}
        >
          {expanded ? "收起问题" : "看看其他问题"}
          <ChevronDownIcon className="size-3" style={{ transform: expanded ? "rotate(180deg)" : undefined }} />
        </button>
      )}
    </div>
  )
}
