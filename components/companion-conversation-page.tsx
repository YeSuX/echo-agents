"use client"

import Link from "next/link"
import Image from "next/image"
import { useCallback, useEffect, useRef, useState } from "react"
import {
  ArrowLeftIcon,
  LockKeyholeIcon,
  MenuIcon,
  SendIcon,
  SquareIcon,
} from "lucide-react"

import { CompanionLayout } from "@/components/companion-layout"
import { AuthControls } from "@/components/auth-controls"
import { ConversationSaveControl } from "@/components/conversation-save-control"
import { QuickReplies } from "@/components/quick-replies"
import { SelfHelpSidebar } from "@/components/self-help-sidebar"
import { AgentMarkdown } from "@/components/agent-markdown"
import {
  KimiConfigTrigger,
  useKimiConfig,
} from "@/components/kimi-config-provider"
import { SupportResourcesDropdown } from "@/components/support-resources-dropdown"
import { Button } from "@/components/ui/button"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Textarea } from "@/components/ui/textarea"
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
import { applySseParseResult, parseSseDataLine } from "@/lib/sse-chat"
import { cn } from "@/lib/utils"
import {
  MAX_CHAT_INPUT_CHARS,
  toChatApiMessages,
} from "@/lib/chat-context"
import { useConversationPersistence } from "@/hooks/use-conversation-persistence"

type MessageRole = "agent" | "user"
type ConversationMessage = {
  id: string
  role: MessageRole
  content: string
  isFallback?: boolean
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

export function CompanionConversationPage({
  initialConversationId,
}: {
  initialConversationId?: string
}) {
  const { allowClientKimiKey, kimiRequestFields } = useKimiConfig()
  const persistence = useConversationPersistence({
    mode: "companion",
  })
  const { isSignedIn, resumeConversation } = persistence
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
  const hasConversation = messages.length > 1 || isSending
  const showSidebar = selfHelpItems.length > 0

  useEffect(() => {
    scrollRef.current?.scrollIntoView({ behavior: "auto" })
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
          conversation: { mode: string }
          turns: Array<{
            id: string
            userContent: string
            assistantContent: string | null
            status: "pending" | "completed" | "stopped" | "failed"
          }>
        }
      })
      .then((body) => {
        if (cancelled || body.conversation.mode !== "companion") return
        resumeConversation(initialConversationId)
        const restored: ConversationMessage[] = [
          { id: "opening", role: "agent", content: COMPANION_OPENING },
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
  }, [initialConversationId, isSignedIn, resumeConversation])

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
      let fullContent = ""

      try {
        const savedBody = await persistence.savedRequest(text)
        const requestBody = savedBody ?? {
          persistence: "ephemeral",
          mode: "companion",
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
          const parsedErr = parseFetchErrorBody(errText)
          throw new Error(parsedErr ?? `请求失败 ${res.status}`)
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
                : "已停下。你可以换个方式继续，或者先休息一下。",
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
    },
    [isSending, messages, kimiRequestFields, persistence],
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
      <header className="flex min-h-16 shrink-0 items-center justify-between gap-2 border-b bg-background px-3 py-2 sm:px-5">
        <div className="flex min-w-0 flex-1 items-center gap-2">
          <Button variant="ghost" size="icon" className="shrink-0" asChild>
            <Link href="/" aria-label="返回首页">
              <ArrowLeftIcon className="size-5" />
            </Link>
          </Button>
          <div className="min-w-0 flex-1 leading-tight">
            <p className="truncate text-sm font-medium sm:text-base">
              小荧 · {COMPANION_AGENT_LABEL}
            </p>
            <p className="truncate text-xs text-muted-foreground">
              {persistence.historyEnabled
                ? "已加密同步到云端"
                : persistence.isSignedIn
                  ? "云端同步已关闭"
                  : "临时对话，不保存"}
            </p>
          </div>
        </div>
        <div className="flex shrink-0 items-center gap-2">
          {showSidebar && (
            <Sheet>
              <SheetTrigger asChild>
                <Button
                  variant="outline"
                  size="sm"
                  className="lg:hidden"
                  type="button"
                >
                  <MenuIcon className="size-4" />
                  自助工具
                </Button>
              </SheetTrigger>
              <SheetContent side="right" className="w-full p-0 sm:max-w-sm">
                <SheetHeader className="sr-only">
                  <SheetTitle>智能自助包</SheetTitle>
                </SheetHeader>
                {sidebar}
              </SheetContent>
            </Sheet>
          )}
          {allowClientKimiKey && <KimiConfigTrigger />}
          <ConversationSaveControl
            isSignedIn={persistence.isSignedIn}
            historyEnabled={persistence.historyEnabled}
            isLoading={persistence.isLoading}
            onEnable={persistence.enableHistory}
            onDisable={persistence.disableHistory}
          />
          <AuthControls compact />
          <SupportResourcesDropdown />
          <Button variant="ghost" size="sm" className="hidden sm:inline-flex" asChild>
            <Link
              href="/support/end"
              onClick={() => persistStoryDraft(messagesRef.current)}
            >
              结束对话
            </Link>
          </Button>
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

      <ScrollArea className="min-h-0 flex-1 bg-muted/[0.16]">
        <main
          className="flex min-h-full flex-col px-4 py-6 sm:py-8"
          aria-live="polite"
          aria-relevant="additions"
        >
          <div className="mx-auto w-full max-w-3xl space-y-5">
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
                content={streamingContent || "正在整理回应…"}
                streaming
                className={cn(streamingContent && "opacity-90")}
              />
            )}
            {!hasConversation && (
              <section className="pt-3" aria-labelledby="quick-start-heading">
                <div className="mb-3">
                  <h2 id="quick-start-heading" className="text-sm font-semibold">
                    你现在最需要什么？
                  </h2>
                  <p className="mt-1 text-sm text-muted-foreground">
                    可以选择一个常见问题，也可以直接输入自己的情况。
                  </p>
                </div>
                <QuickReplies
                  replies={COMPANION_QUICK_REPLIES}
                  onPick={handleQuickPick}
                  disabled={isSending}
                />
              </section>
            )}
          </div>
          <div ref={scrollRef} />
        </main>
      </ScrollArea>

      <div className="shrink-0 border-t bg-background">
        <div className="mx-auto max-w-3xl px-4 py-3">
          <div className="flex items-end gap-2">
            <Textarea
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="慢慢输入你想说的…"
              className="max-h-32 min-h-11 resize-none bg-background py-3"
              rows={1}
              disabled={isSending}
              maxLength={MAX_CHAT_INPUT_CHARS}
              aria-label="输入消息"
            />
            {isSending ? (
              <Button
                type="button"
                variant="outline"
                className="h-11 px-4"
                onClick={() => abortRef.current?.abort()}
              >
                <SquareIcon className="size-3.5 fill-current" />
                <span className="hidden sm:inline">停止</span>
                <span className="sr-only sm:hidden">停止生成</span>
              </Button>
            ) : (
              <Button
                type="button"
                className="h-11 px-4"
                onClick={handleSend}
                disabled={!input.trim()}
              >
                <SendIcon className="size-4" />
                <span className="hidden sm:inline">发送</span>
                <span className="sr-only sm:hidden">发送</span>
              </Button>
            )}
          </div>
          <div className="mt-2 flex items-center justify-between gap-3 text-xs text-muted-foreground">
            <span className="inline-flex items-center gap-1.5">
              <LockKeyholeIcon className="size-3.5" aria-hidden="true" />
              {persistence.historyEnabled
                ? "对话内容已加密同步，可在记录页删除"
                : persistence.isSignedIn
                  ? "云端同步已关闭，本次对话仅临时保留"
                  : "未登录，对话仅临时保留"}
            </span>
            <span className="hidden sm:inline">Enter 发送，Shift + Enter 换行</span>
            {input.length >= MAX_CHAT_INPUT_CHARS * 0.8 && (
              <span>{input.length}/{MAX_CHAT_INPUT_CHARS}</span>
            )}
          </div>
          <Link
            href="/support/end"
            className="mt-2 inline-flex text-xs text-muted-foreground underline-offset-4 hover:text-foreground hover:underline sm:hidden"
            onClick={() => persistStoryDraft(messagesRef.current)}
          >
            结束对话
          </Link>
        </div>
      </div>
    </div>
  )

  return (
    <CompanionLayout sidebar={sidebar} showSidebar={showSidebar}>
      {chatColumn}
    </CompanionLayout>
  )
}

function AgentBubble({
  content,
  isFallback,
  streaming,
  className,
}: {
  content: string
  isFallback?: boolean
  streaming?: boolean
  className?: string
}) {
  return (
    <div className={cn("flex items-start justify-start gap-3", className)}>
      <Image
        src="/logo.PNG"
        alt=""
        width={32}
        height={32}
        className="mt-0.5 size-8 shrink-0 rounded-full object-cover"
      />
      <div
        className={cn(
          "max-w-[min(88%,42rem)] rounded-2xl rounded-tl-md px-4 py-3 text-sm leading-6",
          isFallback
            ? "border border-border bg-muted/50 text-muted-foreground"
            : "bg-muted text-foreground",
        )}
      >
        <p className="mb-0.5 font-medium text-muted-foreground">
          {COMPANION_AGENT_LABEL}
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
      <div className="max-w-[min(88%,42rem)] rounded-2xl rounded-tr-md bg-primary px-4 py-3 text-sm leading-6 text-primary-foreground">
        <p className="whitespace-pre-wrap">{content}</p>
      </div>
    </div>
  )
}
