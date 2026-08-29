"use client"

import { useAuth } from "@clerk/nextjs"
import { useCallback, useEffect, useRef, useState } from "react"

import { parseFetchErrorBody } from "@/lib/json-parse"

type ConversationMode = "companion" | "guest"

type PreferencesResponse = {
  historyEnabled: boolean
  consentVersion: string | null
  consentedAt: number | null
}

async function responseError(response: Response): Promise<Error> {
  const body = await response.text()
  return new Error(parseFetchErrorBody(body) ?? `Request failed ${response.status}`)
}

export function useConversationPersistence(options: {
  mode: ConversationMode
  guestId?: string
}) {
  const { isLoaded: authLoaded, isSignedIn } = useAuth()
  const [historyEnabled, setHistoryEnabled] = useState(false)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const conversationIdRef = useRef<string | null>(null)

  useEffect(() => {
    if (!authLoaded) return
    if (!isSignedIn) return
    let cancelled = false
    void fetch("/api/me/conversation-preferences", { cache: "no-store" })
      .then(async (response) => {
        if (!response.ok) throw await responseError(response)
        return (await response.json()) as PreferencesResponse
      })
      .then((preferences) => {
        if (!cancelled) setHistoryEnabled(preferences.historyEnabled)
      })
      .catch((cause) => {
        if (!cancelled) {
          setError(cause instanceof Error ? cause.message : "无法读取保存设置")
        }
      })
      .finally(() => {
        if (!cancelled) setIsLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [authLoaded, isSignedIn])

  const updateHistoryEnabled = useCallback(async (enabled: boolean) => {
    setError(null)
    const response = await fetch("/api/me/conversation-preferences", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        historyEnabled: enabled,
        consentVersion: enabled ? "conversation-storage-v1" : null,
      }),
    })
    if (!response.ok) throw await responseError(response)
    const preferences = (await response.json()) as PreferencesResponse
    setHistoryEnabled(preferences.historyEnabled)
  }, [])

  const savedRequest = useCallback(
    async (content: string): Promise<Record<string, unknown> | null> => {
      if (!isSignedIn || !historyEnabled) return null
      let conversationId = conversationIdRef.current
      if (!conversationId) {
        const response = await fetch("/api/conversations", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            mode: options.mode,
            guestId: options.mode === "guest" ? options.guestId : null,
          }),
        })
        if (!response.ok) throw await responseError(response)
        const body = (await response.json()) as {
          conversation: { id: string }
        }
        conversationId = body.conversation.id
        conversationIdRef.current = conversationId
      }
      return {
        persistence: "saved",
        conversationId,
        clientMessageId: crypto.randomUUID(),
        content,
      }
    }, [historyEnabled, isSignedIn, options.guestId, options.mode],
  )
  const resumeConversation = useCallback((conversationId: string) => {
    conversationIdRef.current = conversationId
  }, [])

  return {
    authLoaded,
    isSignedIn: Boolean(isSignedIn),
    historyEnabled: Boolean(isSignedIn) && historyEnabled,
    isLoading: !authLoaded || (Boolean(isSignedIn) && isLoading),
    error,
    enableHistory: () => updateHistoryEnabled(true),
    disableHistory: () => updateHistoryEnabled(false),
    resumeConversation,
    savedRequest,
  }
}
