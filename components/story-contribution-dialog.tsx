"use client"

import { useEffect, useState } from "react"

import { Button } from "@/components/ui/button"
import { Checkbox } from "@/components/ui/checkbox"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"

type StoryContributionDialogProps = {
  open: boolean
  onOpenChange: (open: boolean) => void
  initialDraft: string
}

export function StoryContributionDialog({
  open,
  onOpenChange,
  initialDraft,
}: StoryContributionDialogProps) {
  const [agreed, setAgreed] = useState(false)
  const [text, setText] = useState(initialDraft)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [submitted, setSubmitted] = useState(false)

  useEffect(() => {
    if (open) {
      setText(initialDraft)
      setAgreed(false)
      setError(null)
      setSubmitted(false)
    }
  }, [open, initialDraft])

  const handleSubmit = async () => {
    setSubmitting(true)
    setError(null)
    try {
      const res = await fetch("/api/stories/contribute", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text }),
      })
      if (!res.ok) {
        setError("提交未成功，请稍后再试。")
        return
      }
      const data = (await res.json()) as { desensitizedText?: string }
      if (typeof data.desensitizedText === "string") {
        setText(data.desensitizedText)
      }
      setSubmitted(true)
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>匿名分享你的经历（可选）</DialogTitle>
          <DialogDescription>
            请勿包含可识别的时间、地点、真实姓名。提交前请自行删改；服务端会自动脱敏手机号、链接等敏感信息。
          </DialogDescription>
        </DialogHeader>
        <Textarea
          className="min-h-[120px] text-sm"
          value={text}
          onChange={(e) => setText(e.target.value)}
          readOnly={submitted}
          placeholder="在此写下你愿意匿名分享的内容，或留空仅表示稍后愿意再试。"
          aria-label="分享正文"
        />
        {submitted && (
          <p className="text-sm text-muted-foreground" role="status">
            已提交。下方为服务端脱敏后的版本，不含手机号、链接等敏感信息。
          </p>
        )}
        {!submitted && (
          <div className="flex items-start gap-2">
            <Checkbox
              id="story-agree"
              checked={agreed}
              onCheckedChange={(v) => setAgreed(v === true)}
            />
            <Label htmlFor="story-agree" className="text-sm font-normal leading-snug">
              我理解并愿意在脱敏后匿名分享以上内容
            </Label>
          </div>
        )}
        {error && (
          <p className="text-sm text-destructive" role="alert">
            {error}
          </p>
        )}
        <DialogFooter className="gap-2 sm:gap-0">
          {submitted ? (
            <Button onClick={() => onOpenChange(false)}>完成</Button>
          ) : (
            <>
              <Button variant="outline" onClick={() => onOpenChange(false)}>
                暂不分享
              </Button>
              <Button
                disabled={!agreed || submitting || text.trim().length === 0}
                onClick={() => void handleSubmit()}
              >
                {submitting ? "提交中…" : "提交"}
              </Button>
            </>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
