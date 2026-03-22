"use client"

import Link from "next/link"
import { useCallback, useEffect, useRef, useState } from "react"
import { ArrowLeftIcon, SendIcon } from "lucide-react"

import { AgentMarkdown } from "@/components/agent-markdown"
import { SupportResourcesDropdown } from "@/components/support-resources-dropdown"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { ScrollArea } from "@/components/ui/scroll-area"
import {
  deriveSelfHelpFromConversation,
  mergeSelfHelpDeduped,
  type SelfHelpPanelItem,
} from "@/lib/derive-self-help"
import { parseFetchErrorBody } from "@/lib/json-parse"
import { sseItemsToPanelItems } from "@/lib/sse-self-help"
import { parseSseDataLine } from "@/lib/sse-chat"
import { cn } from "@/lib/utils"

const AGENT_OPENING =
  "你可以问我你想了解的，我会在愿意分享的范围内回答你。"

export type MessageRole = "agent" | "user"
export type ConversationMessage = {
  id: string
  role: MessageRole
  content: string
  isFallback?: boolean
}

type ConversationPageProps = {
  guestId: string
  guestName: string
  initialMessages?: ConversationMessage[]
}

function toKimiMessages(messages: ConversationMessage[]) {
  return messages
    .filter((m) => m.role === "user" || m.role === "agent")
    .map((m) => ({
      role: m.role === "agent" ? ("assistant" as const) : ("user" as const),
      content: m.content,
    }))
}

function conversationUserText(messages: ConversationMessage[]): string {
  return messages
    .filter((m) => m.role === "user")
    .map((m) => m.content)
    .join("\n")
}

function persistStoryDraft(messages: ConversationMessage[]) {
  const draft = messages
    .filter((m) => m.role === "user")
    .map((m) => m.content)
    .join("\n\n")
  sessionStorage.setItem("companion-story-draft", draft)
}

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
  const messagesRef = useRef(messages)
  messagesRef.current = messages
  const [selfHelpItems, setSelfHelpItems] = useState<SelfHelpPanelItem[]>([])
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
    const nextMessages = [...messages, userMsg]
    setMessages(nextMessages)
    const derived = deriveSelfHelpFromConversation(
      conversationUserText(nextMessages),
    )
    setSelfHelpItems((prev) => mergeSelfHelpDeduped(prev, derived))
    setIsSending(true)
    setStreamingContent("")

    abortRef.current = new AbortController()
    const signal = abortRef.current.signal

    const kimiMessages = toKimiMessages(nextMessages)

    try {
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ guestId, messages: kimiMessages }),
        signal,
      })

      if (!res.ok) {
        const errText = await res.text()
        throw new Error(parseFetchErrorBody(errText) ?? `请求失败 ${res.status}`)
      }

      const reader = res.body?.getReader()
      const decoder = new TextDecoder()
      if (!reader) throw new Error("No response body")

      let fullContent = ""
      let buffer = ""
      let sawDone = false

      outer: while (true) {
        const { done, value } = await reader.read()
        if (done) break
        buffer += decoder.decode(value, { stream: true })
        const lines = buffer.split("\n\n")
        buffer = lines.pop() ?? ""
        for (const line of lines) {
          const parsed = parseSseDataLine(line)
          if (parsed.kind === "done") {
            sawDone = true
            break outer
          }
          if (parsed.kind === "content") {
            fullContent += parsed.content
            setStreamingContent(fullContent)
          }
          if (parsed.kind === "self_help") {
            const panel = sseItemsToPanelItems(parsed.items)
            setSelfHelpItems((prev) => mergeSelfHelpDeduped(prev, panel))
          }
        }
      }

      if (!sawDone) {
        const tail = parseSseDataLine(buffer)
        if (tail.kind === "content") fullContent += tail.content
        if (tail.kind === "self_help") {
          const panel = sseItemsToPanelItems(tail.items)
          setSelfHelpItems((prev) => mergeSelfHelpDeduped(prev, panel))
        }
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
      if (e instanceof Error && e.name === "AbortError") return
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
      void handleSend()
    }
  }

  return (
    <div className="flex h-dvh flex-col bg-background">
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
              <Link href="/learn" className="underline-offset-2 hover:underline">
                科普
              </Link>
              <span className="mx-1.5">·</span>
              <Link
                href="/stories"
                className="underline-offset-2 hover:underline"
              >
                案例
              </Link>
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

      {error && (
        <div
          className="shrink-0 border-b border-destructive/20 bg-destructive/10 px-4 py-2 text-sm text-destructive"
          role="alert"
        >
          {error}
        </div>
      )}

      {selfHelpItems.length > 0 && (
        <div className="shrink-0 border-b bg-muted/30 px-4 py-2">
          <p className="mb-1 text-xs font-medium text-muted-foreground">
            推荐资源
          </p>
          <div className="flex flex-wrap gap-2">
            {selfHelpItems.map((item) => (
              <a
                key={item.id}
                href={item.href}
                target="_blank"
                rel="noopener noreferrer"
                className="rounded-full border bg-background px-2.5 py-1 text-xs underline-offset-2 hover:underline"
              >
                {item.title}
              </a>
            ))}
          </div>
        </div>
      )}

      <ScrollArea className="min-h-0 flex-1">
        <main
          className="flex flex-col px-4 py-4"
          aria-live="polite"
          aria-relevant="additions"
        >
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
              ),
            )}
            {isSending && (
              <AgentBubble
                guestName={guestName}
                content={streamingContent || "..."}
                streaming
                className={cn(streamingContent && "opacity-90")}
              />
            )}
          </div>
          <div ref={scrollRef} />
        </main>
      </ScrollArea>

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

      <footer className="shrink-0 border-t px-4 py-2 text-center text-xs text-muted-foreground">
        <Link href="/guests" className="underline-offset-4 hover:underline">
          返回列表
        </Link>
        <span className="mx-2">·</span>
        <Link
          href="/support/end"
          className="underline-offset-4 hover:underline"
          onClick={() => persistStoryDraft(messagesRef.current)}
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
  streaming,
  className,
}: {
  guestName: string
  content: string
  isFallback?: boolean
  streaming?: boolean
  className?: string
}) {
  return (
    <div className={cn("flex justify-start", className)}>
      <div
        className={cn(
          "max-w-[85%] rounded-2xl rounded-bl-md px-4 py-2.5 text-sm",
          isFallback
            ? "border border-border bg-muted/50 text-muted-foreground"
            : "bg-muted text-foreground",
        )}
      >
        <p className="mb-0.5 font-medium text-muted-foreground">
          {guestName}
        </p>
        {streaming ? (
          <p className="whitespace-pre-wrap">{content}</p>
        ) : (
          <AgentMarkdown content={content} />
        )}
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
