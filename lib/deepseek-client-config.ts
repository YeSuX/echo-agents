export const DEEPSEEK_CONFIG_STORAGE_API_KEY = "echo-agents.deepseekApiKey"
export const DEEPSEEK_CONFIG_STORAGE_BASE_URL = "echo-agents.deepseekBaseUrl"

export const DEEPSEEK_DEFAULT_BASE_URL = "https://api.deepseek.com"

export type DeepSeekClientStoredConfig = {
  apiKey: string
  baseUrl: string
}

export function readDeepSeekClientConfig(): DeepSeekClientStoredConfig {
  if (typeof window === "undefined") {
    return { apiKey: "", baseUrl: "" }
  }
  return {
    apiKey: localStorage.getItem(DEEPSEEK_CONFIG_STORAGE_API_KEY) ?? "",
    baseUrl: localStorage.getItem(DEEPSEEK_CONFIG_STORAGE_BASE_URL) ?? "",
  }
}

export function writeDeepSeekClientConfig(c: DeepSeekClientStoredConfig): void {
  localStorage.setItem(DEEPSEEK_CONFIG_STORAGE_API_KEY, c.apiKey)
  localStorage.setItem(DEEPSEEK_CONFIG_STORAGE_BASE_URL, c.baseUrl)
}

export function clearDeepSeekClientConfig(): void {
  localStorage.removeItem(DEEPSEEK_CONFIG_STORAGE_API_KEY)
  localStorage.removeItem(DEEPSEEK_CONFIG_STORAGE_BASE_URL)
}

export function normalizeDeepSeekBaseUrl(input: string): string | null {
  const t = input.trim()
  if (t.length === 0) return null
  if (!t.startsWith("https://")) return null
  try {
    const u = new URL(t)
    if (u.protocol !== "https:") return null
    let s = u.toString()
    if (s.endsWith("/")) s = s.slice(0, -1)
    return s
  } catch {
    return null
  }
}

export function deepseekFieldsForRequest(
  apiKey: string,
  baseUrl: string,
): { deepseekApiKey?: string; deepseekBaseUrl?: string } {
  const out: { deepseekApiKey?: string; deepseekBaseUrl?: string } = {}
  const k = apiKey.trim()
  if (k.length > 0) out.deepseekApiKey = k
  const n = normalizeDeepSeekBaseUrl(baseUrl)
  if (n !== null) out.deepseekBaseUrl = n
  return out
}
