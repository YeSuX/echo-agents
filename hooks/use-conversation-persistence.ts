"use client"

import { useAuth } from "@clerk/nextjs"
import { useCallback, useEffect, useRef, useState } from "react"

import { CONVERSATION_PREFERENCE_VERSION } from "@/lib/conversation-preferences"
import { parseFetchErrorBody } from "@/lib/json-parse"

type PreferencesResponse = {
  historyEnabled: boolean
  consentVersion: string | null
  consentedAt: number | null
}

async function responseError(response: Response): Promise<Error> {
  const body = await response.text()
  return new Error(parseFetchErrorBody(body) ?? `Request failed ${response.status}`)
}

// Reuse an in-flight bootstrap across Strict Mode remounts. Two first-visit
// responses must not overwrite each other's visitor credential in the browser.
const bootstraps = new Map<string, Promise<PreferencesResponse>>()
function loadPreferences(identity: string, signedIn: boolean): Promise<PreferencesResponse> {
  const existing = bootstraps.get(identity)
  if (existing) return existing
  const fetchPreferences = () => fetch(signedIn ? "/api/me/conversation-preferences" : "/api/visitor-session", {
    method: signedIn ? "GET" : "POST",
    cache: "no-store",
  }).then(async response => {
    if (!response.ok) throw await responseError(response)
    return await response.json() as PreferencesResponse
  })
  const operation = !signedIn && navigator.locks
    ? navigator.locks.request("rayin-visitor-bootstrap", fetchPreferences)
    : fetchPreferences()
  const pending = Promise.resolve(operation).finally(() => { bootstraps.delete(identity) })
  bootstraps.set(identity, pending)
  return pending
}

export function useConversationPersistence(options: {
  mode: "companion" | "guest"
  guestId?: string
}) {
  const { isLoaded: authLoaded, isSignedIn, userId } = useAuth()
  const identity = userId ?? "visitor"
  const [state, setState] = useState<{
    identity: string
    preferences: PreferencesResponse | null
    error: string | null
  } | null>(null)
  const conversationRef = useRef<{ identity: string; id: string } | null>(null)
  const preferences = state?.identity === identity ? state.preferences : null
  const error = state?.identity === identity ? state.error : null
  const isLoading = !authLoaded || (!preferences && !error)
  const historyEnabled = preferences?.historyEnabled ?? false

  useEffect(() => {
    if (!authLoaded) return
    let cancelled = false
    void loadPreferences(identity, Boolean(isSignedIn)).then(preferences => {
      if (!cancelled) setState({ identity, preferences, error: null })
    }).catch(cause => {
      if (!cancelled) setState({ identity, preferences: null, error: cause instanceof Error ? cause.message : "无法读取保存设置" })
    })
    return () => { cancelled = true }
  }, [authLoaded, identity, isSignedIn])

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

  return {
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
