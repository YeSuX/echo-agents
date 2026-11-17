import { parseFetchErrorBody } from "@/lib/json-parse"

export const AUTH_INITIALIZATION_TIMEOUT_MS = 15_000
export const PREFERENCES_INITIALIZATION_TIMEOUT_MS = 15_000
export const AUTH_INITIALIZATION_ERROR = "登录服务暂时无法就绪，请刷新重试。为保护对话记录，暂时无法发送消息。"
export const PREFERENCES_INITIALIZATION_ERROR = "读取保存设置超时，请重试。当前消息尚未发送。"

export type PreferencesResponse = {
  historyEnabled: boolean
  consentVersion: string | null
  consentedAt: number | null
}

// Share startup across Strict Mode remounts to avoid replacing visitor cookies.
const bootstraps = new Map<string, Promise<PreferencesResponse>>()

export function loadConversationPreferences(identity: string, signedIn: boolean): Promise<PreferencesResponse> {
  const existing = bootstraps.get(identity)
  if (existing) return existing
  const controller = new AbortController()
  let timer: ReturnType<typeof setTimeout>
  const timeout = new Promise<never>((_, reject) => {
    timer = setTimeout(() => {
      reject(new Error(PREFERENCES_INITIALIZATION_ERROR))
      controller.abort()
    }, PREFERENCES_INITIALIZATION_TIMEOUT_MS)
  })
  const fetchPreferences = async () => {
    controller.signal.throwIfAborted()
    const response = await fetch(signedIn ? "/api/me/conversation-preferences" : "/api/visitor-session", {
      method: signedIn ? "GET" : "POST",
      cache: "no-store",
      signal: controller.signal,
    })
    if (!response.ok) {
      const body = await response.text()
      throw new Error(parseFetchErrorBody(body) ?? `Request failed ${response.status}`)
    }
    const body: unknown = await response.json()
    if (!body || typeof body !== "object" || !("historyEnabled" in body) || typeof body.historyEnabled !== "boolean") {
      throw new Error("保存设置返回异常，请重试。")
    }
    return {
      historyEnabled: body.historyEnabled,
      consentVersion: "consentVersion" in body && typeof body.consentVersion === "string" ? body.consentVersion : null,
      consentedAt: "consentedAt" in body && typeof body.consentedAt === "number" ? body.consentedAt : null,
    }
  }
  const operation = Promise.resolve().then(async () => {
    if (!signedIn && navigator.locks) {
      return await navigator.locks.request("rayin-visitor-bootstrap", { signal: controller.signal }, fetchPreferences)
    }
    return await fetchPreferences()
  })
  const pending = Promise.race([Promise.resolve(operation), timeout]).finally(() => {
    clearTimeout(timer)
    if (bootstraps.get(identity) === pending) bootstraps.delete(identity)
  })
  bootstraps.set(identity, pending)
  return pending
}
