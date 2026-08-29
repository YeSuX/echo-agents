"use client"

import Link from "next/link"
import { useCallback, useEffect, useRef, useState } from "react"
import { ArrowLeftIcon, SendIcon, SquareIcon } from "lucide-react"

import { AgentMarkdown } from "@/components/agent-markdown"
import { AuthControls } from "@/components/auth-controls"
import { ConversationSaveControl } from "@/components/conversation-save-control"
import {
  KimiConfigTrigger,
  useKimiConfig,
} from "@/components/kimi-config-provider"
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
import { applySseParseResult, parseSseDataLine } from "@/lib/sse-chat"
import { cn } from "@/lib/utils"
import {
  MAX_CHAT_INPUT_CHARS,
  toChatApiMessages,
} from "@/lib/chat-context"
import { useConversationPersistence } from "@/hooks/use-conversation-persistence"

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
  initialConversationId?: string
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
  initialConversationId,
}: ConversationPageProps) {
  const { kimiRequestFields } = useKimiConfig()
  const persistence = useConversationPersistence({
    mode: "guest",
    guestId,
  })
  const { isSignedIn, resumeConversation } = persistence
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

  useEffect(() => {
    if (!initialConversationId || !isSignedIn) return
    let cancelled = false
    void fetch(`/api/conversations/${initialConversationId}`, {
      cache: "no-store",
    })
      .then(async (response) => {
        if (!response.ok) throw new Error("无法读取这段对话")
        return (await response.json()) as {
          conversation: { mode: string; guestId: string | null }
          turns: Array<{
            id: string
            userContent: string
            assistantContent: string | null
            status: "pending" | "completed" | "stopped" | "failed"
          }>
        }
      })
      .then((body) => {
        if (
          cancelled ||
          body.conversation.mode !== "guest" ||
          body.conversation.guestId !== guestId
        ) {
          return
        }
        resumeConversation(initialConversationId)
        const restored: ConversationMessage[] = [
          { id: "opening", role: "agent", content: AGENT_OPENING },
        ]
        for (const turn of body.turns) {
          restored.push({
            id: `${turn.id}-user`,
            role: "user",
            content: turn.userContent,
          })
          if (turn.status === "completed" && turn.assistantContent) {
            restored.push({
              id: `${turn.id}-agent`,
              role: "agent",
              content: turn.assistantContent,
            })
          } else if (turn.status !== "pending") {
            restored.push({
              id: `${turn.id}-status`,
              role: "agent",
              content: "这次回复没有完整保存，你可以重新发送上一条消息。",
              isFallback: true,
            })
          }
        }
        setMessages(restored)
      })
      .catch((cause) => {
        if (!cancelled) {
          setError(cause instanceof Error ? cause.message : "读取对话失败")
        }
      })
    return () => {
      cancelled = true
    }
  }, [guestId, initialConversationId, isSignedIn, resumeConversation])

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

    let fullContent = ""

    try {
      const savedBody = await persistence.savedRequest(text)
      const requestBody = savedBody ?? {
        persistence: "ephemeral",
        guestId,
        messages: toChatApiMessages(nextMessages),
      }
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...requestBody, ...kimiRequestFields }),
        signal,
      })

      if (!res.ok) {
        const errText = await res.text()
        throw new Error(parseFetchErrorBody(errText) ?? `请求失败 ${res.status}`)
      }

      const reader = res.body?.getReader()
      const decoder = new TextDecoder()
      if (!reader) throw new Error("No response body")

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
          if (parsed.kind === "content" || parsed.kind === "content_replace") {
            fullContent = applySseParseResult(parsed, fullContent)
            setStreamingContent(fullContent)
          }
          if (parsed.kind === "self_help") {
            const panel = sseItemsToPanelItems(parsed.items)
            setSelfHelpItems((prev) => mergeSelfHelpDeduped(prev, panel))
          }
          if (parsed.kind === "persistence_error") {
            setError("回复已生成，但未能写入云端记录。请先复制内容后重试。")
          }
        }
      }

      if (!sawDone) {
        const tail = parseSseDataLine(buffer)
        if (tail.kind === "content" || tail.kind === "content_replace") {
        fullContent = applySseParseResult(tail, fullContent)
      }
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
      if (e instanceof Error && e.name === "AbortError") {
        setStreamingContent("")
        setMessages((prev) => [
          ...prev,
          {
            id: `agent-${Date.now()}`,
            role: "agent",
            content: fullContent.trim()
              ? `${fullContent.trim()}\n\n（已停止生成）`
              : "已停下。你可以换个问题继续，或者先离开一会儿。",
            isFallback: !fullContent.trim(),
          },
        ])
        return
      }
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
  }, [guestId, input, isSending, messages, kimiRequestFields, persistence])

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
        <KimiConfigTrigger />
        <ConversationSaveControl
          isSignedIn={persistence.isSignedIn}
          historyEnabled={persistence.historyEnabled}
          isLoading={persistence.isLoading}
          onEnable={persistence.enableHistory}
          onDisable={persistence.disableHistory}
        />
        <AuthControls compact />
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
            maxLength={MAX_CHAT_INPUT_CHARS}
            aria-label="输入你想问的问题"
          />
          {isSending ? (
            <Button
              type="button"
              size="icon"
              variant="outline"
              onClick={() => abortRef.current?.abort()}
              aria-label="停止生成"
            >
              <SquareIcon className="size-3.5 fill-current" />
            </Button>
          ) : (
            <Button
              type="button"
              size="icon"
              onClick={() => void handleSend()}
              disabled={!input.trim()}
              aria-label="发送"
            >
              <SendIcon className="size-4" />
            </Button>
          )}
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
