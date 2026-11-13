import { getCompanionSystemPrompt } from "@/lib/companion-agent"
import { getGuestSystemPrompt } from "@/lib/guest-agent"
import { matchCases } from "@/lib/match-cases"
import { formatSopBlock, retrieveSop } from "@/lib/retrieve-sop"
import {
  CONVERSATION_CONTINUITY_SYSTEM_NOTE, PROMPT_INJECTION_SYSTEM_NOTE,
  PROMPT_INJECTION_DETECTED_NOTE,
} from "@/lib/safety/constants"
import { CURRENT_COMPANION_STYLE, renderCompanionStyle, type CompanionStyle } from "@/lib/companion-style"
import type { ChatPersistence } from "@/lib/agent-prompt-config"

export type PromptRuntimeContext = {
  persistence?: ChatPersistence
  injectionDetected?: boolean
}

function assemblePrompt(base: string, context: PromptRuntimeContext, style: CompanionStyle | null): string {
  return [
    base,
    style === null ? "" : renderCompanionStyle(style),
    CONVERSATION_CONTINUITY_SYSTEM_NOTE,
    PROMPT_INJECTION_SYSTEM_NOTE,
    context.injectionDetected ? PROMPT_INJECTION_DETECTED_NOTE : "",
  ].filter(Boolean).join("\n\n")
}

/** Existing case matching and SOP retrieval remain unchanged. */
export function getCompanionChatPrompt(
  routingContext: string,
  style: CompanionStyle | null = CURRENT_COMPANION_STYLE,
  context: PromptRuntimeContext = {},
): string {
  const base = getCompanionSystemPrompt(
    matchCases(routingContext, 2), formatSopBlock(retrieveSop(routingContext)), context.persistence,
  )
  return assemblePrompt(base, context, style)
}

/** One production entry point for shared safety notes and verified runtime state. */
export function getChatSystemPrompt(options: PromptRuntimeContext & {
  mode: "companion" | "guest"
  guestId: string
  routingContext: string
}): string {
  return options.mode === "companion"
    ? getCompanionChatPrompt(options.routingContext, CURRENT_COMPANION_STYLE, options)
    : assemblePrompt(getGuestSystemPrompt(options.guestId, options.persistence), options, null)
}
