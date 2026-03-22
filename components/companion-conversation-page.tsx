"use client"

import Link from "next/link"
import { useCallback, useEffect, useRef, useState } from "react"
import { ArrowLeftIcon, MenuIcon, SendIcon } from "lucide-react"

import { CompanionLayout } from "@/components/companion-layout"
import { QuickReplies } from "@/components/quick-replies"
import { SelfHelpSidebar } from "@/components/self-help-sidebar"
import { SupportResourcesDropdown } from "@/components/support-resources-dropdown"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { ScrollArea } from "@/components/ui/scroll-area"
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet"
import { COMPANION_AGENT_LABEL, COMPANION_OPENING } from "@/lib/companion-agent"
import { COMPANION_QUICK_REPLIES } from "@/data/quick-replies"
import {
  deriveSelfHelpFromConversation,
  mergeSelfHelpDeduped,
  type SelfHelpPanelItem,
} from "@/lib/derive-self-help"
import { parseFetchErrorBody } from "@/lib/json-parse"
import { sseItemsToPanelItems } from "@/lib/sse-self-help"
import { parseSseDataLine } from "@/lib/sse-chat"
import { cn } from "@/lib/utils"

type MessageRole = "agent" | "user"
type ConversationMessage = {
  id: string
  role: MessageRole
  content: string
  isFallback?: boolean
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

export function CompanionConversationPage() {
  const [input, setInput] = useState("")
  const [messages, setMessages] = useState<ConversationMessage[]>([
    { id: "opening", role: "agent", content: COMPANION_OPENING },
  ])
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

  const sendMessage = useCallback(
    async (rawText: string) => {
      const text = rawText.trim()
      if (!text || isSending) return
      setError(null)
      const userMsg: ConversationMessage = {
        id: `user-${Date.now()}`,
        role: "user",
        content: text,
      }
      const nextMessages = [...messages, userMsg]
      setMessages(nextMessages)
      setIsSending(true)
      setStreamingContent("")

      const derived = deriveSelfHelpFromConversation(
        conversationUserText(nextMessages),
      )
      setSelfHelpItems((prev) => mergeSelfHelpDeduped(prev, derived))

      abortRef.current = new AbortController()
      const signal = abortRef.current.signal
      const kimiMessages = toKimiMessages(nextMessages)

      try {
        const res = await fetch("/api/chat", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ mode: "companion", messages: kimiMessages }),
          signal,
        })

        if (!res.ok) {
          const errText = await res.text()
          const parsedErr = parseFetchErrorBody(errText)
          throw new Error(parsedErr ?? `请求失败 ${res.status}`)
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
    },
    [isSending, messages],
  )

  const handleSend = useCallback(() => {
    const t = input.trim()
    if (!t) return
    setInput("")
    void sendMessage(t)
  }, [input, sendMessage])

  const handleQuickPick = useCallback(
    (text: string) => {
      void sendMessage(text)
    },
    [sendMessage],
  )

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault()
      handleSend()
    }
  }

  const sidebar = <SelfHelpSidebar items={selfHelpItems} />

  const chatColumn = (
    <div className="flex h-dvh flex-col">
      <header className="flex shrink-0 items-center justify-between gap-2 border-b bg-background px-3 py-3 sm:px-4">
        <div className="flex min-w-0 flex-1 items-center gap-2">
          <Button variant="ghost" size="icon" className="shrink-0" asChild>
            <Link href="/" aria-label="返回首页">
              <ArrowLeftIcon className="size-5" />
            </Link>
          </Button>
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-medium sm:text-base">
              小影 · {COMPANION_AGENT_LABEL}
            </p>
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
        </div>
        <div className="flex shrink-0 items-center gap-2">
          <Sheet>
            <SheetTrigger asChild>
              <Button
                variant="outline"
                size="sm"
                className="lg:hidden"
                type="button"
              >
                <MenuIcon className="size-4" />
                <span className="sr-only">自助包</span>
              </Button>
            </SheetTrigger>
            <SheetContent side="right" className="w-full p-0 sm:max-w-sm">
              <SheetHeader className="sr-only">
                <SheetTitle>智能自助包</SheetTitle>
              </SheetHeader>
              {sidebar}
            </SheetContent>
          </Sheet>
          <SupportResourcesDropdown />
        </div>
      </header>

      {error && (
        <div
          className="shrink-0 border-b border-destructive/20 bg-destructive/10 px-4 py-2 text-sm text-destructive"
          role="alert"
        >
          {error}
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
                  content={msg.content}
                  isFallback={msg.isFallback}
                />
              ) : (
                <UserBubble key={msg.id} content={msg.content} />
              ),
            )}
            {isSending && (
              <AgentBubble
                content={streamingContent || "…"}
                className={cn(streamingContent && "opacity-90")}
              />
            )}
          </div>
          <div ref={scrollRef} />
        </main>
      </ScrollArea>

      <div className="shrink-0 border-t bg-background">
        <QuickReplies
          replies={COMPANION_QUICK_REPLIES}
          onPick={handleQuickPick}
          disabled={isSending}
        />
        <div className="mx-auto flex max-w-2xl gap-2 p-4 pt-0">
          <Input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="慢慢输入你想说的…"
            className="min-w-0"
            disabled={isSending}
            aria-label="输入消息"
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

      <footer className="shrink-0 border-t px-4 py-2 text-center text-xs text-muted-foreground">
        <Link
          href="/support/end"
          className="underline-offset-4 hover:underline"
          onClick={() => persistStoryDraft(messagesRef.current)}
        >
          结束对话
        </Link>
        <span className="mx-2">·</span>
        <span>支持资源见右上角</span>
      </footer>
    </div>
  )

  return (
    <CompanionLayout sidebar={sidebar}>{chatColumn}</CompanionLayout>
  )
}

function AgentBubble({
  content,
  isFallback,
  className,
}: {
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
            : "bg-muted text-foreground",
        )}
      >
        <p className="mb-0.5 font-medium text-muted-foreground">
          {COMPANION_AGENT_LABEL}
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
