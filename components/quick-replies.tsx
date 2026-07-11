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
      className="grid grid-cols-1 gap-2 sm:grid-cols-2"
      role="group"
      aria-label="选择一个常见问题开始"
    >
      {replies.map((q) => (
        <Button
          key={q}
          type="button"
          variant="outline"
          className="h-auto min-h-12 justify-start whitespace-normal rounded-xl px-4 py-3 text-left text-sm font-normal leading-5 shadow-none"
          disabled={disabled}
          onClick={() => onPick(q)}
        >
          {q}
        </Button>
      ))}
    </div>
  )
}
