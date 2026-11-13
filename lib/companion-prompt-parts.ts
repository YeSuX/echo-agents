import { SUPPORT_RESOURCES } from "@/data/support-resources"
import { AGENT_PROMPTS, renderPrivacyPrinciples } from "@/lib/agent-prompt-config"

export { CRISIS_PROTOCOL } from "@/lib/safety/constants"

export const ROLE_IDENTITY = AGENT_PROMPTS.companion.identity
export const HARD_PROHIBITIONS = AGENT_PROMPTS.companion.prohibitions
export const MYTH_CORRECTIONS = AGENT_PROMPTS.companion.myths
export const TRAUMA_INFORMED = AGENT_PROMPTS.companion.traumaInformed
export const IBSV_TYPES = AGENT_PROMPTS.companion.violenceTypes
export const OUTPUT_FORMAT = AGENT_PROMPTS.companion.outputFormat
export const LEARN_GUIDE = AGENT_PROMPTS.companion.learnGuide

// Reuse the existing public directory without changing resource selection or data.
export const SUPPORT_RESOURCES_TEXT = `## 支持资源（按需求选择 1–2 个）\n${
  SUPPORT_RESOURCES.map(resource =>
    `- ${resource.label}：${resource.description ?? ""}（${resource.href}）`,
  ).join("\n")
}`

export const PRIVACY_PRINCIPLES = renderPrivacyPrinciples()
