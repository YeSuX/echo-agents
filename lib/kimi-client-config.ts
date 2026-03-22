export const KIMI_CONFIG_STORAGE_API_KEY = "echo-agents.kimiApiKey"
export const KIMI_CONFIG_STORAGE_BASE_URL = "echo-agents.kimiBaseUrl"

export const KIMI_DEFAULT_BASE_URL = "https://api.moonshot.cn/v1"

export type KimiClientStoredConfig = {
  apiKey: string
  baseUrl: string
}

export function readKimiClientConfig(): KimiClientStoredConfig {
  if (typeof window === "undefined") {
    return { apiKey: "", baseUrl: "" }
  }
  return {
    apiKey: localStorage.getItem(KIMI_CONFIG_STORAGE_API_KEY) ?? "",
    baseUrl: localStorage.getItem(KIMI_CONFIG_STORAGE_BASE_URL) ?? "",
  }
}

export function writeKimiClientConfig(c: KimiClientStoredConfig): void {
  localStorage.setItem(KIMI_CONFIG_STORAGE_API_KEY, c.apiKey)
  localStorage.setItem(KIMI_CONFIG_STORAGE_BASE_URL, c.baseUrl)
}

export function clearKimiClientConfig(): void {
  localStorage.removeItem(KIMI_CONFIG_STORAGE_API_KEY)
  localStorage.removeItem(KIMI_CONFIG_STORAGE_BASE_URL)
}

export function normalizeKimiBaseUrl(input: string): string | null {
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

export function kimiFieldsForRequest(
  apiKey: string,
  baseUrl: string,
): { kimiApiKey?: string; kimiBaseUrl?: string } {
  const out: { kimiApiKey?: string; kimiBaseUrl?: string } = {}
  const k = apiKey.trim()
  if (k.length > 0) out.kimiApiKey = k
  const n = normalizeKimiBaseUrl(baseUrl)
  if (n !== null) out.kimiBaseUrl = n
  return out
}
