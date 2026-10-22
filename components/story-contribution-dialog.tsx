"use client"

import { useEffect, useRef, useState } from "react"
import { Button } from "@/components/ui/button"
import { Checkbox } from "@/components/ui/checkbox"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { desensitizeText } from "@/lib/safety/desensitize"
import { storySubmissionError } from "@/lib/story-submission-feedback"
import { clearStoryDraft, createStoryDraft, MAX_STORY_CHARS, STORY_CONSENT_VERSION, writeStoryDraft, type StoryDraft } from "@/lib/story-contribution"

type StoryContributionDialogProps = {
  open: boolean
  onOpenChange: (open: boolean) => void
  initialDraft: StoryDraft | null
  initialError?: string | null
}

export function StoryContributionDialog({ open, onOpenChange, initialDraft, initialError }: StoryContributionDialogProps) {
  const [draft, setDraft] = useState<StoryDraft | null>(initialDraft)
  const [agreed, setAgreed] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [submitted, setSubmitted] = useState(false)
  const inFlight = useRef(false)
  const text = draft?.text ?? ""
  const preview = desensitizeText(text.trim())
  const tooLong = Math.max(text.trim().length, preview.length) > MAX_STORY_CHARS

  useEffect(() => {
    if (open) {
      setDraft(initialDraft)
      setAgreed(false)
      setError(initialError ?? null)
      setSubmitted(false)
    }
  }, [open, initialDraft, initialError])

  function retain(next: StoryDraft) {
    setDraft(next)
    try {
      writeStoryDraft(sessionStorage, next)
    } catch {
      setError("浏览器暂时无法保留修改，请先复制草稿，再关闭或刷新页面。")
    }
  }

  const handleSubmit = async () => {
    if (inFlight.current || !draft || !agreed || !text.trim() || tooLong) return
    inFlight.current = true
    setSubmitting(true)
    setError(null)
    // Keep the same ID across network retries, including an uncertain response.
    retain(draft)
    try {
      const res = await fetch("/api/stories/contribute", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          submissionId: draft.id,
          text: preview,
          consent: true,
          consentVersion: STORY_CONSENT_VERSION,
        }),
        signal: AbortSignal.timeout(30_000),
      })
      if (!res.ok) {
        setError(storySubmissionError(res.status, res.headers.get("Retry-After")))
        return
      }
      const data: unknown = await res.json()
      if (!data || typeof data !== "object" || !("ok" in data) || data.ok !== true ||
        !("submissionId" in data) || data.submissionId !== draft.id) {
        throw new Error("The receipt could not be verified. Retry safely with the retained draft.")
      }
      setSubmitted(true)
      try { clearStoryDraft(sessionStorage, draft.id) } catch {
        setError("内容已收到，但浏览器无法清除本地草稿。完成后请关闭此页签。")
      }
    } catch (cause) {
      setError(cause instanceof Error && ["TimeoutError", "AbortError"].includes(cause.name)
        ? "请求超时，暂时无法确认是否提交成功。草稿已保留，直接重试不会重复投稿。"
        : "暂时无法确认是否提交成功。草稿已保留，请检查网络后重试。")
    } finally {
      inFlight.current = false
      setSubmitting(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={value => { if (!inFlight.current) onOpenChange(value) }}>
      <DialogContent className="max-h-[90dvh] overflow-y-auto sm:max-w-2xl [&_[data-slot=dialog-title]]:pr-6">
        <DialogHeader>
          <DialogTitle>匿名分享你的经历（可选）</DialogTitle>
          <DialogDescription className="leading-7">
            你可以直接填写经历，也可以审阅从对话带入的草稿。请删除不愿分享的内容，尤其是姓名、日期、地点等身份线索。对话草稿包含你的消息和 AI 已完成的回复，不包含模型思考过程。
          </DialogDescription>
        </DialogHeader>
        {!submitted && <>
          <Label htmlFor="story-draft">可编辑的故事草稿</Label>
          <Textarea
            id="story-draft"
            className="min-h-56 text-sm"
            value={text}
            onChange={event => { setAgreed(false); setError(null); retain(createStoryDraft(event.target.value)) }}
            disabled={submitting}
            aria-describedby="story-length"
          />
          <p id="story-length" className={tooLong ? "text-sm text-destructive" : "text-xs text-muted-foreground"}>
            {text.trim().length.toLocaleString()} / {MAX_STORY_CHARS.toLocaleString()} 字
            {tooLong && "。内容过长，请缩短后再提交；系统没有自动删减内容。"}
          </p>
        </>}
        <details open={submitted} className="rounded-lg border p-3 text-sm">
          <summary className="cursor-pointer font-medium">{submitted ? "已提交的内容" : "查看脱敏预览"}</summary>
          <p className="mt-3 max-h-64 overflow-y-auto whitespace-pre-wrap break-words">{preview || "尚未填写内容。"}</p>
        </details>
        {submitted ? (
          <div className="space-y-2 text-sm" role="status">
            <p>内容已收到，将进入审核，不会自动公开。</p>
            <p className="break-all text-xs text-muted-foreground">投稿回执： {draft?.id}</p>
          </div>
        ) : (
          <div className="flex items-start gap-2">
            <Checkbox id="story-agree" checked={agreed} disabled={submitting} onCheckedChange={value => setAgreed(value === true)} />
            <Label htmlFor="story-agree" className="text-sm font-normal leading-snug">
              我已检查脱敏预览，同意留存这份脱敏内容，用于事件监测和公益倡导。自动脱敏可能遗漏身份线索，请再次确认。
            </Label>
          </div>
        )}
        {error && <p className="text-sm text-destructive" role="alert">{error}</p>}
        <DialogFooter className="gap-2 sm:gap-0">
          {submitted ? <Button onClick={() => onOpenChange(false)}>完成</Button> : <>
            <Button variant="outline" disabled={submitting} onClick={() => onOpenChange(false)}>暂不分享</Button>
            <Button disabled={!agreed || submitting || !text.trim() || tooLong} onClick={() => void handleSubmit()}>
              {submitting ? "提交中…" : "提交"}
            </Button>
          </>}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
