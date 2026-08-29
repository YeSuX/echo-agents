"use client"

import { SignInButton } from "@clerk/nextjs"
import { CloudIcon, CloudOffIcon, LoaderCircleIcon } from "lucide-react"
import { useState } from "react"

import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"

type ConversationSaveControlProps = {
  isSignedIn: boolean
  historyEnabled: boolean
  isLoading: boolean
  onEnable(): Promise<void>
  onDisable(): Promise<void>
}

export function ConversationSaveControl({
  isSignedIn,
  historyEnabled,
  isLoading,
  onEnable,
  onDisable,
}: ConversationSaveControlProps) {
  const [open, setOpen] = useState(false)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  if (isLoading) {
    return (
      <Button variant="ghost" size="sm" disabled>
        <LoaderCircleIcon className="size-4 animate-spin" />
        <span className="hidden sm:inline">读取保存设置</span>
      </Button>
    )
  }

  if (!isSignedIn) {
    return (
      <SignInButton mode="modal">
        <Button variant="ghost" size="sm">
          <CloudOffIcon className="size-4" />
          <span className="hidden sm:inline">登录后自动同步</span>
        </Button>
      </SignInButton>
    )
  }

  const apply = async () => {
    setSaving(true)
    setError(null)
    try {
      if (historyEnabled) await onDisable()
      else await onEnable()
      setOpen(false)
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "更新失败，请重试")
    } finally {
      setSaving(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="ghost" size="sm">
          {historyEnabled ? (
            <CloudIcon className="size-4 text-primary" />
          ) : (
            <CloudOffIcon className="size-4" />
          )}
          <span className="hidden sm:inline">
            {historyEnabled ? "云端同步已开启" : "云端同步已关闭"}
          </span>
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>
            {historyEnabled ? "关闭云端同步？" : "重新开启云端同步？"}
          </DialogTitle>
          <DialogDescription className="space-y-2 text-left leading-6">
            {historyEnabled ? (
              <>
                <span className="block">关闭后，新消息将只保留在当前页面，不再写入云端。</span>
                <span className="block">已有记录不会自动删除，可在对话记录页单独清空。</span>
              </>
            ) : (
              <>
                <span className="block">从下一条消息开始，对话会恢复加密同步到 Cloudflare D1，并关联当前 Clerk 账号。</span>
                <span className="block">当前临时对话不会自动上传，你可以随时关闭或删除记录。</span>
              </>
            )}
          </DialogDescription>
        </DialogHeader>
        {error && <p className="text-sm text-destructive">{error}</p>}
        <DialogFooter>
          <Button variant="outline" onClick={() => setOpen(false)}>
            取消
          </Button>
          <Button onClick={() => void apply()} disabled={saving}>
            {saving && <LoaderCircleIcon className="size-4 animate-spin" />}
            {historyEnabled ? "确认关闭" : "确认开启"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
