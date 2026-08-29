"use client"

import Link from "next/link"
import { ArrowLeftIcon, LoaderCircleIcon, Trash2Icon } from "lucide-react"
import { useCallback, useEffect, useState } from "react"

import { AuthControls } from "@/components/auth-controls"
import { Button } from "@/components/ui/button"
import { GUESTS } from "@/data/guests"

type Conversation = {
  id: string
  mode: "companion" | "guest"
  guestId: string | null
  status: "active" | "archived"
  createdAt: number
  updatedAt: number
  lastMessageAt: number | null
}

function conversationTitle(conversation: Conversation): string {
  if (conversation.mode === "companion") return "小荧同伴对话"
  const guest = GUESTS.find((item) => item.id === conversation.guestId)
  return guest ? `与「${guest.name}」的对话` : "嘉宾对话"
}

function conversationHref(conversation: Conversation): string {
  if (conversation.mode === "companion") {
    return `/support?conversation=${encodeURIComponent(conversation.id)}`
  }
  return `/guests/${encodeURIComponent(conversation.guestId ?? "")}?conversation=${encodeURIComponent(conversation.id)}`
}

export function ConversationsPage() {
  const [conversations, setConversations] = useState<Conversation[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const load = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const response = await fetch("/api/conversations", { cache: "no-store" })
      if (!response.ok) throw new Error("无法读取对话记录")
      const body = (await response.json()) as {
        conversations: Conversation[]
      }
      setConversations(body.conversations)
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "读取失败")
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    void load()
  }, [load])

  const removeConversation = async (id: string) => {
    if (!window.confirm("删除后无法从活动数据库恢复，确认删除这段对话？")) return
    const response = await fetch(`/api/conversations/${id}`, { method: "DELETE" })
    if (!response.ok) {
      setError("删除失败，请重试")
      return
    }
    setConversations((current) => current.filter((item) => item.id !== id))
  }

  const removeAll = async () => {
    if (!window.confirm("确认删除全部云端对话？此操作不会关闭未来保存。")) return
    const response = await fetch("/api/me/conversations", { method: "DELETE" })
    if (!response.ok) {
      setError("清空失败，请重试")
      return
    }
    setConversations([])
  }

  return (
    <div className="min-h-dvh bg-muted/20">
      <header className="border-b bg-background">
        <div className="mx-auto flex h-16 max-w-4xl items-center justify-between px-4">
          <div className="flex items-center gap-2">
            <Button variant="ghost" size="icon" asChild>
              <Link href="/" aria-label="返回首页">
                <ArrowLeftIcon className="size-5" />
              </Link>
            </Button>
            <h1 className="font-semibold">云端对话记录</h1>
          </div>
          <AuthControls compact />
        </div>
      </header>

      <main className="mx-auto max-w-4xl px-4 py-8">
        <div className="mb-6 flex items-start justify-between gap-4">
          <div>
            <h2 className="text-2xl font-semibold tracking-tight">你的对话</h2>
            <p className="mt-2 max-w-2xl text-sm leading-6 text-muted-foreground">
              正文经过应用层加密后存储。删除后活动系统会立即不可访问，平台备份按隐私说明中的保留窗口过期。
            </p>
          </div>
          {conversations.length > 0 && (
            <Button variant="outline" size="sm" onClick={() => void removeAll()}>
              <Trash2Icon className="size-4" />
              清空全部
            </Button>
          )}
        </div>

        {error && (
          <div className="mb-4 rounded-lg border border-destructive/30 bg-destructive/10 p-3 text-sm text-destructive">
            {error}
          </div>
        )}

        {loading ? (
          <div className="flex items-center gap-2 py-12 text-sm text-muted-foreground">
            <LoaderCircleIcon className="size-4 animate-spin" />
            正在读取记录…
          </div>
        ) : conversations.length === 0 ? (
          <div className="rounded-2xl border bg-background p-8 text-center">
            <p className="font-medium">还没有云端对话</p>
            <p className="mt-2 text-sm text-muted-foreground">
              登录后发送的新消息会默认加密同步，并出现在这里。
            </p>
            <Button className="mt-5" asChild>
              <Link href="/support">开始新对话</Link>
            </Button>
          </div>
        ) : (
          <ul className="space-y-3">
            {conversations.map((conversation) => (
              <li
                key={conversation.id}
                className="flex items-center gap-3 rounded-xl border bg-background p-4"
              >
                <Link
                  href={conversationHref(conversation)}
                  className="min-w-0 flex-1 rounded-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                >
                  <p className="truncate font-medium">
                    {conversationTitle(conversation)}
                  </p>
                  <p className="mt-1 text-xs text-muted-foreground">
                    {new Intl.DateTimeFormat("zh-CN", {
                      dateStyle: "medium",
                      timeStyle: "short",
                    }).format(conversation.lastMessageAt ?? conversation.createdAt)}
                  </p>
                </Link>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => void removeConversation(conversation.id)}
                  aria-label={`删除${conversationTitle(conversation)}`}
                >
                  <Trash2Icon className="size-4" />
                </Button>
              </li>
            ))}
          </ul>
        )}
      </main>
    </div>
  )
}
