"use client"

import Link from "next/link"
import { useRef, useEffect, useState, useCallback } from "react"
import { ArrowLeftIcon, SendIcon } from "lucide-react"

import { SupportResourcesDropdown } from "@/components/support-resources-dropdown"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { ScrollArea } from "@/components/ui/scroll-area"
import { cn } from "@/lib/utils"

const AGENT_OPENING =
  "你可以问我你想了解的，我会在愿意分享的范围内回答你。"

export type MessageRole = "agent" | "user"
export type ConversationMessage = {
  id: string
  role: MessageRole
  content: string
  /** 兜底/边界回复：温和引导回已分享内容 */
  isFallback?: boolean
}

type ConversationPageProps = {
  guestId: string
  guestName: string
  /** 初始消息列表（含首条引导），后续由输入提交追加 */
  initialMessages?: ConversationMessage[]
}

/** 将前端消息列表转为 Kimi API 所需的 messages（仅 user/assistant，不含 system） */
function toKimiMessages(messages: ConversationMessage[]) {
  return messages
    .filter((m) => m.role === "user" || m.role === "agent")
    .map((m) => ({
      role: m.role === "agent" ? ("assistant" as const) : ("user" as const),
      content: m.content,
    }))
}

/** 解析 SSE data 行：{ content: string } 或 [DONE] */
function parseStreamLine(line: string): { content?: string; done?: boolean } {
  const trimmed = line.trim()
  if (trimmed === "data: [DONE]") return { done: true }
  if (!trimmed.startsWith("data: ")) return {}
  try {
    const json = JSON.parse(trimmed.slice(6)) as { content?: string }
    return { content: json.content }
  } catch {
    return {}
  }
}

/** 对话了解故事页：顶部栏 + 可滚动消息区 + 吸底输入区，支持资源常驻；接入 Kimi Agent 流式回复 */
export function ConversationPage({
  guestId,
  guestName,
  initialMessages = [],
}: ConversationPageProps) {
  const [input, setInput] = useState("")
  const [messages, setMessages] = useState<ConversationMessage[]>(() => {
    if (initialMessages.length > 0) return initialMessages
    return [
      {
        id: "opening",
        role: "agent",
        content: AGENT_OPENING,
      },
    ]
  })
  const [isSending, setIsSending] = useState(false)
  const [streamingContent, setStreamingContent] = useState("")
  const [error, setError] = useState<string | null>(null)
  const scrollRef = useRef<HTMLDivElement>(null)
  const abortRef = useRef<AbortController | null>(null)

  useEffect(() => {
    scrollRef.current?.scrollIntoView({ behavior: "smooth" })
  }, [messages, streamingContent])

  const handleSend = useCallback(async () => {
    const text = input.trim()
    if (!text || isSending) return
    setInput("")
    setError(null)
    const userMsg: ConversationMessage = {
      id: `user-${Date.now()}`,
      role: "user",
      content: text,
    }
    setMessages((prev) => [...prev, userMsg])
    setIsSending(true)
    setStreamingContent("")

    abortRef.current = new AbortController()
    const signal = abortRef.current.signal

    const kimiMessages = toKimiMessages([...messages, userMsg])

    try {
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ guestId, messages: kimiMessages }),
        signal,
      })

      if (!res.ok) {
        const errBody = await res.json().catch(() => ({}))
        throw new Error(
          (errBody as { error?: string }).error || `请求失败 ${res.status}`
        )
      }

      const reader = res.body?.getReader()
      const decoder = new TextDecoder()
      if (!reader) throw new Error("No response body")

      let fullContent = ""
      let buffer = ""

      while (true) {
        const { done, value } = await reader.read()
        if (done) break
        buffer += decoder.decode(value, { stream: true })
        const lines = buffer.split("\n\n")
        buffer = lines.pop() ?? ""
        for (const line of lines) {
          const { content, done: streamDone } = parseStreamLine(line)
          if (streamDone) break
          if (content) {
            fullContent += content
            setStreamingContent(fullContent)
          }
        }
      }

      // 收尾可能留在 buffer 里的行
      const { content } = parseStreamLine(buffer)
      if (content) {
        fullContent += content
      }
      setStreamingContent("")
      setMessages((prev) => [
        ...prev,
        {
          id: `agent-${Date.now()}`,
          role: "agent",
          content: fullContent || "（没有收到回复，请重试。）",
        },
      ])
    } catch (e) {
      if ((e as Error).name === "AbortError") return
      setError(e instanceof Error ? e.message : "发送失败，请重试")
      setMessages((prev) => [
        ...prev,
        {
          id: `agent-${Date.now()}`,
          role: "agent",
          content: "抱歉，暂时无法回复。请检查网络或稍后再试。",
          isFallback: true,
        },
      ])
    } finally {
      setIsSending(false)
      abortRef.current = null
    }
  }, [guestId, input, isSending, messages])

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault()
      handleSend()
    }
  }

  return (
    <div className="flex h-dvh flex-col bg-background">
      {/* 顶部栏：返回 + 嘉宾标识 + 支持资源 */}
      <header className="flex shrink-0 items-center justify-between gap-3 border-b bg-background px-4 py-3">
        <div className="flex min-w-0 flex-1 items-center gap-3">
          <Button variant="ghost" size="icon" className="shrink-0" asChild>
            <Link href="/guests" aria-label="返回嘉宾列表">
              <ArrowLeftIcon className="size-5" />
            </Link>
          </Button>
          <div className="min-w-0 flex-1">
            <p className="truncate font-medium">与「{guestName}」对话</p>
            <p className="truncate text-xs text-muted-foreground">
              通过问答了解 ta 的故事
            </p>
          </div>
          <div
            className="hidden size-12 shrink-0 items-center justify-center rounded-full bg-muted text-muted-foreground sm:flex"
            aria-hidden
          >
            <span className="text-xs">插画</span>
          </div>
        </div>
        <SupportResourcesDropdown />
      </header>

      {/* 错误条 */}
      {error && (
        <div
          className="shrink-0 border-b border-destructive/20 bg-destructive/10 px-4 py-2 text-sm text-destructive"
          role="alert"
        >
          {error}
        </div>
      )}

      {/* 对话区 */}
      <ScrollArea className="min-h-0 flex-1">
        <main className="flex flex-col px-4 py-4">
          <div className="mx-auto w-full max-w-2xl space-y-4">
            {messages.map((msg) =>
              msg.role === "agent" ? (
                <AgentBubble
                  key={msg.id}
                  guestName={guestName}
                  content={msg.content}
                  isFallback={msg.isFallback}
                />
              ) : (
                <UserBubble key={msg.id} content={msg.content} />
              )
            )}
            {isSending && (
              <AgentBubble
                guestName={guestName}
                content={streamingContent || "..."}
                className={cn(streamingContent && "opacity-90")}
              />
            )}
          </div>
          <div ref={scrollRef} />
        </main>
      </ScrollArea>

      {/* 输入区：吸底 */}
      <div className="shrink-0 border-t bg-background p-4">
        <div className="mx-auto flex max-w-2xl gap-2">
          <Input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="输入你想问的…（例如 ta 的经历、态度或观点）"
            className="min-w-0"
            disabled={isSending}
            aria-label="输入你想问的问题"
          />
          <Button
            type="button"
            size="icon"
            onClick={() => void handleSend()}
            disabled={!input.trim() || isSending}
            aria-label="发送"
          >
            <SendIcon className="size-4" />
          </Button>
        </div>
      </div>

      {/* 页脚 */}
      <footer className="shrink-0 border-t px-4 py-2 text-center text-xs text-muted-foreground">
        <Link
          href="/guests"
          className="underline-offset-4 hover:underline"
        >
          返回列表
        </Link>
        <span className="mx-2">·</span>
        <Link
          href="/guests/leave"
          className="underline-offset-4 hover:underline"
        >
          结束对话
        </Link>
        <span className="mx-2">·</span>
        <span>支持资源见顶部入口</span>
      </footer>
    </div>
  )
}

function AgentBubble({
  guestName,
  content,
  isFallback,
  className,
}: {
  guestName: string
  content: string
  isFallback?: boolean
  className?: string
}) {
  return (
    <div className={cn("flex justify-start", className)}>
      <div
        className={cn(
          "max-w-[85%] rounded-2xl rounded-bl-md px-4 py-2.5 text-sm",
          isFallback
            ? "border border-border bg-muted/50 text-muted-foreground"
            : "bg-muted text-foreground"
        )}
      >
        <p className="mb-0.5 font-medium text-muted-foreground">
          {guestName}
        </p>
        <p className="whitespace-pre-wrap">{content}</p>
      </div>
    </div>
  )
}

function UserBubble({ content }: { content: string }) {
  return (
    <div className="flex justify-end">
      <div className="max-w-[85%] rounded-2xl rounded-br-md border bg-background px-4 py-2.5 text-sm text-foreground">
        <p className="whitespace-pre-wrap">{content}</p>
      </div>
    </div>
  )
}
