"use client"

import { useAuth } from "@clerk/nextjs"
import { useCallback, useEffect, useRef, useState } from "react"

import { CONVERSATION_PREFERENCE_VERSION } from "@/lib/conversation-preferences"
import { parseFetchErrorBody } from "@/lib/json-parse"
import { AUTH_INITIALIZATION_ERROR, AUTH_INITIALIZATION_TIMEOUT_MS, loadConversationPreferences, type PreferencesResponse } from "@/lib/conversation-preferences-loader"

async function responseError(response: Response): Promise<Error> {
  const body = await response.text()
  return new Error(parseFetchErrorBody(body) ?? `Request failed ${response.status}`)
}

export function useConversationPersistence(options: {
  mode: "companion" | "guest"
  guestId?: string
}) {
  const { isLoaded: authLoaded, isSignedIn, userId } = useAuth()
  const identity = userId ?? "visitor"
  const [authTimedOut, setAuthTimedOut] = useState(false)
  const [loadAttempt, setLoadAttempt] = useState(0)
  const [state, setState] = useState<{
    identity: string
    preferences: PreferencesResponse | null
    error: string | null
  } | null>(null)
  const conversationRef = useRef<{ identity: string; id: string } | null>(null)
  const preferences = state?.identity === identity ? state.preferences : null
  const error = !authLoaded && authTimedOut
    ? AUTH_INITIALIZATION_ERROR
    : state?.identity === identity ? state.error : null
  const isLoading = !error && (!authLoaded || !preferences)
  const historyEnabled = preferences?.historyEnabled ?? false

  useEffect(() => {
    if (authLoaded) return
    const timer = setTimeout(() => setAuthTimedOut(true), AUTH_INITIALIZATION_TIMEOUT_MS)
    return () => clearTimeout(timer)
  }, [authLoaded])

  useEffect(() => {
    if (!authLoaded) return
    let cancelled = false
    void loadConversationPreferences(identity, Boolean(isSignedIn)).then(preferences => {
      if (!cancelled) setState({ identity, preferences, error: null })
    }).catch(cause => {
      if (!cancelled) setState({ identity, preferences: null, error: cause instanceof Error ? cause.message : "无法读取保存设置" })
    })
    return () => { cancelled = true }
  }, [authLoaded, identity, isSignedIn, loadAttempt])

  const updateHistoryEnabled = useCallback(async (enabled: boolean) => {
    const response = await fetch("/api/me/conversation-preferences", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ historyEnabled: enabled, consentVersion: CONVERSATION_PREFERENCE_VERSION }),
    })
    if (!response.ok) throw await responseError(response)
    const preferences = await response.json() as PreferencesResponse
    setState({ identity, preferences, error: null })
    // Re-enabling starts a fresh saved context rather than silently resuming a
    // conversation whose temporary messages were never uploaded.
    conversationRef.current = null
  }, [identity])

  const savedRequest = useCallback(async (content: string): Promise<Record<string, unknown> | null> => {
    if (isLoading) throw new Error("保存设置仍在加载，请稍后重试")
    if (error) throw new Error(error)
    if (!historyEnabled) return null
    let conversationId = conversationRef.current?.identity === identity ? conversationRef.current.id : null
    if (!conversationId) {
      const response = await fetch("/api/conversations", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ mode: options.mode, guestId: options.mode === "guest" ? options.guestId : null }),
      })
      if (!response.ok) throw await responseError(response)
      const body = await response.json() as { conversation: { id: string } }
      conversationId = body.conversation.id
      conversationRef.current = { identity, id: conversationId }
    }
    return { persistence: "saved", conversationId, clientMessageId: crypto.randomUUID(), content }
  }, [isLoading, error, historyEnabled, options.mode, options.guestId, identity])

  const resumeConversation = useCallback((conversationId: string) => {
    conversationRef.current = { identity, id: conversationId }
  }, [identity])

  const retryPreferences = useCallback(() => {
    if (!authLoaded) {
      window.location.reload()
      return
    }
    setState(null)
    setLoadAttempt(attempt => attempt + 1)
  }, [authLoaded])

  return {
    retryPreferences,
    authLoaded,
    isSignedIn: Boolean(isSignedIn),
    historyEnabled,
    isLoading,
    error,
    savedRequest,
    resumeConversation,
    enableHistory: () => updateHistoryEnabled(true),
    disableHistory: () => updateHistoryEnabled(false),
  }
}
