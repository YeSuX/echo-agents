"use client"

import { useAuth } from "@clerk/nextjs"
import Link from "next/link"
import { useEffect, useState } from "react"

import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"

export function VisitorHistoryClaim({ blocked = false, onClaimed }: { blocked?: boolean; onClaimed?(): void }) {
  const { userId } = useAuth()
  const [visitorId, setVisitorId] = useState<string | null>(null)
  const [open, setOpen] = useState(false)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!userId) return
    let cancelled = false
    void fetch("/api/visitor-session", { cache: "no-store" }).then(async response => {
      if (!response.ok) throw new Error("读取游客记录失败")
      const body = await response.json() as { visitorId: string | null; hasHistory: boolean }
      if (!cancelled && body.hasHistory && body.visitorId) {
        setVisitorId(body.visitorId)
        setOpen(true)
      }
    }).catch(() => { if (!cancelled) setError("暂时无法检查游客记录，请刷新后重试。") })
    return () => { cancelled = true }
  }, [userId])

  if (!visitorId) return error ? <span role="status" className="text-xs text-destructive">{error}</span> : null

  async function claim() {
    setSaving(true)
    setError(null)
    try {
      const response = await fetch("/api/visitor-session/claim", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ visitorId, confirmed: true }),
      })
      if (!response.ok) throw new Error(response.status === 409
        ? "游客会话已变化或仍在生成，请停止生成并刷新后重试。"
        : "关联失败，游客记录尚未转移，请稍后重试。")
      setVisitorId(null)
      setOpen(false)
      onClaimed?.()
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "关联失败")
    } finally { setSaving(false) }
  }

  return <Dialog open={open} onOpenChange={setOpen}>
    <DialogTrigger asChild><Button variant="ghost" size="sm">关联游客记录</Button></DialogTrigger>
    <DialogContent>
      <DialogHeader>
        <DialogTitle>将本浏览器的游客记录关联到当前账号？</DialogTitle>
        <DialogDescription>关联后可跨设备继续对话，本浏览器的游客凭证将失效。仅在这些记录属于你时确认；暂不关联会保留原有游客记录。</DialogDescription>
      </DialogHeader>
      {error && <p role="alert" className="text-sm text-destructive">{error}</p>}
      <DialogFooter>
        <Button variant="outline" onClick={() => setOpen(false)} disabled={saving}>暂不关联</Button>
        <Button onClick={() => void claim()} disabled={saving || blocked}>确认关联</Button>
      </DialogFooter>
      <Link href="/conversations" className="text-sm underline">查看当前账号的对话记录</Link>
    </DialogContent>
  </Dialog>
}
