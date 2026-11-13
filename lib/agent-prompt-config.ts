import { z } from "zod"
import policy from "@/prompts/agent-policy.json"

const text = z.string().trim().min(1)

// Trusted, repository-owned text only. No runtime overrides or full prompt replacement.
export const AGENT_PROMPTS = z.object({
  companion: z.object({
    identity: text, prohibitions: text, myths: text, traumaInformed: text,
    violenceTypes: text, learnGuide: text, outputFormat: text, legalGuidance: text,
  }).strict(),
  safety: z.object({
    urgentResponse: text, checkInResponse: text, guestFallback: text,
    outputFallback: text, timeoutResponse: text, errorResponse: text,
    injection: text, injectionDetected: text, continuity: text, crisisProtocol: text,
  }).strict(),
  privacy: z.object({
    anonymous: text, history: text, story: text, redaction: text,
    redactionTitle: text, redactionIntro: text,
    saved: text, ephemeral: text, unknown: text, boundary: text,
  }).strict(),
  guest: z.object({ identity: text, authorization: text, boundaries: text }).strict(),
  styleBoundary: text,
}).strict().parse(policy)

export type ChatPersistence = "saved" | "ephemeral"

export function fillPrompt(template: string, values: Record<string, string>): string {
  return template.replace(/\{(\w+)\}/g, (_, key: string) => {
    if (!(key in values)) throw new Error(`Missing prompt value: ${key}`)
    return values[key]
  })
}

export function renderPrivacyPrinciples(persistence?: ChatPersistence): string {
  const privacy = AGENT_PROMPTS.privacy
  return `## 隐私与当前保存状态\n${[
    privacy.anonymous, privacy.history, privacy.story, privacy.redaction,
    privacy[persistence ?? "unknown"], privacy.boundary,
  ].map(line => `- ${line}`).join("\n")}`
}
