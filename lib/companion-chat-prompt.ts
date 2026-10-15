import { getCompanionSystemPrompt } from "@/lib/companion-agent"
import { matchCases } from "@/lib/match-cases"
import { formatSopBlock, retrieveSop } from "@/lib/retrieve-sop"
import { CONVERSATION_CONTINUITY_SYSTEM_NOTE, PROMPT_INJECTION_SYSTEM_NOTE } from "@/lib/safety/constants"
import { CURRENT_COMPANION_STYLE, renderCompanionStyle, type CompanionStyle } from "@/lib/companion-style"

/** Shared by the production route and eval runner. null reproduces the pre-change prompt. */
export function getCompanionChatPrompt(
  routingContext: string,
  style: CompanionStyle | null = CURRENT_COMPANION_STYLE,
): string {
  const base = getCompanionSystemPrompt(matchCases(routingContext, 2), formatSopBlock(retrieveSop(routingContext)))
  const protectedPrompt = `${base}\n\n${CONVERSATION_CONTINUITY_SYSTEM_NOTE}\n\n${PROMPT_INJECTION_SYSTEM_NOTE}`
  return style === null ? protectedPrompt : `${protectedPrompt}\n\n${renderCompanionStyle(style)}`
}
