import { Button } from "@/components/ui/button"

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
  return (
    <div
      className="flex flex-wrap gap-2 px-4 pb-2"
      role="group"
      aria-label="快捷输入"
    >
      {replies.map((q) => (
        <Button
          key={q}
          type="button"
          variant="secondary"
          size="sm"
          className="h-auto rounded-full px-3 py-1.5 text-xs font-normal"
          disabled={disabled}
          onClick={() => onPick(q)}
        >
          {q}
        </Button>
      ))}
    </div>
  )
}
