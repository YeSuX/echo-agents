import {
  CRISIS_HOTLINE,
  CRISIS_HOTLINE_LABEL,
} from "@/data/support-resources"
import { AGENT_PROMPTS, fillPrompt } from "@/lib/agent-prompt-config"

export const REDACT_PLACEHOLDER = "[已隐藏]"

/** 危机场景固定回复（全站单一信源） */
export const CRISIS_FIXED_RESPONSE = fillPrompt(AGENT_PROMPTS.safety.urgentResponse, {
  hotlineLabel: CRISIS_HOTLINE_LABEL,
  hotline: CRISIS_HOTLINE,
})
export const CRISIS_CHECK_IN_RESPONSE = AGENT_PROMPTS.safety.checkInResponse

export const GUEST_BOUNDARY_FALLBACK = AGENT_PROMPTS.safety.guestFallback

export const OUTPUT_MODERATION_FALLBACK = AGENT_PROMPTS.safety.outputFallback

export const UPSTREAM_TIMEOUT_MESSAGE = AGENT_PROMPTS.safety.timeoutResponse

export const UPSTREAM_ERROR_MESSAGE = AGENT_PROMPTS.safety.errorResponse

export const PROMPT_INJECTION_SYSTEM_NOTE = AGENT_PROMPTS.safety.injection
export const PROMPT_INJECTION_DETECTED_NOTE = AGENT_PROMPTS.safety.injectionDetected

export const CONVERSATION_CONTINUITY_SYSTEM_NOTE = AGENT_PROMPTS.safety.continuity

export const CRISIS_PROTOCOL = fillPrompt(AGENT_PROMPTS.safety.crisisProtocol, {
  urgentResponse: CRISIS_FIXED_RESPONSE,
  checkInResponse: CRISIS_CHECK_IN_RESPONSE,
})
