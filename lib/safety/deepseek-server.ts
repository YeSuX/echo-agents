import OpenAI from "openai"
import type { Json } from "@/lib/json-parse"
import { normalizeDeepSeekBaseUrl } from "@/lib/deepseek-client-config"

/** 生产默认禁止客户端传入 API Key；开发或显式 ALLOW_CLIENT_DEEPSEEK_KEY=1 时允许 */
export function isClientDeepSeekKeyAllowed(): boolean {
  if (process.env.ALLOW_CLIENT_DEEPSEEK_KEY === "1") return true
  if (process.env.ALLOW_CLIENT_DEEPSEEK_KEY === "0") return false
  return process.env.NODE_ENV === "development"
}

export function resolveDeepSeekClient(
  root: { readonly [k: string]: Json },
):
  | { client: OpenAI }
  | { status: number; error: string; code?: string } {
  const keyFromBody =
    typeof root.deepseekApiKey === "string" ? root.deepseekApiKey.trim() : ""

  if (keyFromBody.length > 0 && !isClientDeepSeekKeyAllowed()) {
    return {
      status: 403,
      error:
        "出于安全考虑，API Key 仅能通过服务端环境变量 DEEPSEEK_API_KEY 配置，请勿在浏览器中提交密钥。",
      code: "client_key_forbidden",
    }
  }

  const apiKey =
    keyFromBody.length > 0 ? keyFromBody : (process.env.DEEPSEEK_API_KEY ?? "")
  if (apiKey.length === 0) {
    return {
      status: 400,
      error:
        "缺少 API Key：请在服务端配置环境变量 DEEPSEEK_API_KEY（生产环境不在浏览器中保存密钥）。",
      code: "missing_api_key",
    }
  }

  const urlFromBody =
    typeof root.deepseekBaseUrl === "string" ? root.deepseekBaseUrl.trim() : ""
  let baseURL: string
  if (urlFromBody.length > 0 && isClientDeepSeekKeyAllowed()) {
    const n = normalizeDeepSeekBaseUrl(urlFromBody)
    if (n === null) {
      return {
        status: 400,
        error: "deepseekBaseUrl 须为 https URL（例如 https://api.deepseek.com）",
      }
    }
    baseURL = n
  } else {
    const env = (process.env.DEEPSEEK_BASE_URL ?? "").trim()
    baseURL =
      env.length > 0 ? env.replace(/\/$/, "") : "https://api.deepseek.com"
  }

  return { client: new OpenAI({ apiKey, baseURL }) }
}

export function deepseekTimeoutMs(): number {
  const raw = process.env.DEEPSEEK_TIMEOUT_MS
  if (raw === undefined || raw.trim() === "") return 120_000
  const n = Number.parseInt(raw, 10)
  return Number.isFinite(n) && n >= 5_000 ? n : 120_000
}

export function deepseekChatOptions(): {
  model: string
  thinking: { type: "enabled" }
  reasoning_effort: "high"
} {
  return {
    model: process.env.DEEPSEEK_MODEL?.trim() || "deepseek-flash",
    thinking: { type: "enabled" },
    reasoning_effort: "high",
  }
}
