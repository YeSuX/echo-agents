"use client"

import Link from "next/link"
import { useRef, useEffect, useState } from "react"
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
  guestName: string
  /** 初始消息列表（含首条引导），后续由输入提交追加 */
  initialMessages?: ConversationMessage[]
}

/** 对话了解故事页：顶部栏 + 可滚动消息区 + 吸底输入区，支持资源常驻 */
export function ConversationPage({
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
  const scrollRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    scrollRef.current?.scrollIntoView({ behavior: "smooth" })
  }, [messages])

  const handleSend = () => {
    const text = input.trim()
    if (!text || isSending) return
    setInput("")
    setMessages((prev) => [
      ...prev,
      { id: `user-${Date.now()}`, role: "user", content: text },
    ])
    setIsSending(true)
    // 占位：暂无后端，模拟 Agent 回复
    setTimeout(() => {
      setMessages((prev) => [
        ...prev,
        {
          id: `agent-${Date.now()}`,
          role: "agent",
          content:
            "（此处为嘉宾口吻的回复占位。接入 Agent 后将根据档案生成。）",
        },
      ])
      setIsSending(false)
    }, 600)
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault()
      handleSend()
    }
  }

  return (
    <div className="flex h-dvh flex-col bg-background">
      {/* 顶部栏：返回 + 嘉宾标识 + 支持资源；插画占位可选 */}
      <header className="flex shrink-0 items-center justify-between gap-3 border-b bg-background px-4 py-3">
        <div className="flex min-w-0 flex-1 items-center gap-3">
          <Button variant="ghost" size="icon" className="shrink-0" asChild>
            <Link href="/guests" aria-label="返回嘉宾列表">
              <ArrowLeftIcon className="size-5" />
            </Link>
          </Button>
          <div className="min-w-0 flex-1">
            <p className="truncate font-medium">
              与「{guestName}」对话
            </p>
            <p className="truncate text-xs text-muted-foreground">
              通过问答了解 ta 的故事
            </p>
          </div>
          {/* 插画占位：可替换为嘉宾剪影或装饰图 */}
          <div
            className="hidden size-12 shrink-0 items-center justify-center rounded-full bg-muted text-muted-foreground sm:flex"
            aria-hidden
          >
            <span className="text-xs">插画</span>
          </div>
        </div>
        <SupportResourcesDropdown />
      </header>

      {/* 对话区：可滚动消息列表 */}
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
                content="..."
                className="opacity-70"
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
            onClick={handleSend}
            disabled={!input.trim() || isSending}
            aria-label="发送"
          >
            <SendIcon className="size-4" />
          </Button>
        </div>
      </div>

      {/* 页脚：返回列表 · 结束对话 · 支持资源 */}
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
    <div
      className={cn(
        "flex justify-start",
        className
      )}
    >
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
