"use client"

import { useEffect, useRef, useState } from "react"
import { Button } from "@/components/ui/button"
import { Checkbox } from "@/components/ui/checkbox"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { desensitizeText } from "@/lib/safety/desensitize"
import { parseFetchErrorBody } from "@/lib/json-parse"
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
      setError("Your browser could not retain edits. Copy this draft before closing or refreshing the page.")
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
        if (res.status === 429) {
          const seconds = Number(res.headers.get("Retry-After"))
          setError(Number.isFinite(seconds) && seconds > 0
            ? `Too many submissions. Retry in ${Math.ceil(seconds / 60)} minute(s). Your draft is retained.`
            : "Too many submissions. Please retry later; your draft is retained.")
        } else {
          setError(parseFetchErrorBody(await res.text()) ?? "Submission failed. Your draft is retained; please retry.")
        }
        return
      }
      const data: unknown = await res.json()
      if (!data || typeof data !== "object" || !("ok" in data) || data.ok !== true ||
        !("submissionId" in data) || data.submissionId !== draft.id) {
        throw new Error("The receipt could not be verified. Retry safely with the retained draft.")
      }
      setSubmitted(true)
      try { clearStoryDraft(sessionStorage, draft.id) } catch {
        setError("Submission received. Your browser could not clear the local draft; close this tab when finished.")
      }
    } catch (cause) {
      setError(cause instanceof Error && ["TimeoutError", "AbortError"].includes(cause.name)
        ? "The request timed out. Your draft is retained; retrying will not create a duplicate."
        : "Could not confirm submission. Your draft is retained; please check the connection and retry.")
    } finally {
      inFlight.current = false
      setSubmitting(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={value => { if (!inFlight.current) onOpenChange(value) }}>
      <DialogContent className="max-h-[90dvh] overflow-y-auto sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>匿名分享你的经历（可选）</DialogTitle>
          <DialogDescription>
            Review the full conversation below, including your messages and completed Agent replies. Remove anything you do not want to share, especially names, dates, and places. Model thinking is excluded.
          </DialogDescription>
        </DialogHeader>
        {!submitted && <>
          <Label htmlFor="story-draft">Editable conversation draft</Label>
          <Textarea
            id="story-draft"
            className="min-h-56 text-sm"
            value={text}
            onChange={event => { setAgreed(false); setError(null); retain(createStoryDraft(event.target.value)) }}
            disabled={submitting}
            aria-describedby="story-length"
          />
          <p id="story-length" className={tooLong ? "text-sm text-destructive" : "text-xs text-muted-foreground"}>
            {text.trim().length.toLocaleString()} / {MAX_STORY_CHARS.toLocaleString()} characters
            {tooLong && " — Shorten the draft before submitting; nothing has been cut automatically."}
          </p>
        </>}
        <details open={submitted} className="rounded-lg border p-3 text-sm">
          <summary className="cursor-pointer font-medium">{submitted ? "Submitted content" : "Preview the anonymized submission"}</summary>
          <p className="mt-3 max-h-64 overflow-y-auto whitespace-pre-wrap break-words">{preview || "No content yet."}</p>
        </details>
        {submitted ? (
          <div className="space-y-2 text-sm" role="status">
            <p>Received for review. This submission is not automatically published.</p>
            <p className="break-all text-xs text-muted-foreground">Receipt: {draft?.id}</p>
          </div>
        ) : (
          <div className="flex items-start gap-2">
            <Checkbox id="story-agree" checked={agreed} disabled={submitting} onCheckedChange={value => setAgreed(value === true)} />
            <Label htmlFor="story-agree" className="text-sm font-normal leading-snug">
              I have reviewed the preview and consent to retaining this anonymized content for event monitoring and public-interest advocacy. Automatic masking may miss identifying details.
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
