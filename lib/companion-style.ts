import { z } from "zod"
import currentStyle from "@/prompts/companion-style.json"
import { AGENT_PROMPTS } from "@/lib/agent-prompt-config"

// The optimizer can return only these four presentation fields, never a full system prompt.
export const companionStyleSchema = z.object({
  empathy: z.string().trim().min(20).max(1200),
  pacing: z.string().trim().min(20).max(1200),
  expression: z.string().trim().min(20).max(1200),
  continuity: z.string().trim().min(20).max(1200),
}).strict()
export type CompanionStyle = z.infer<typeof companionStyleSchema>
export const CURRENT_COMPANION_STYLE = companionStyleSchema.parse(currentStyle)

export function renderCompanionStyle(style: CompanionStyle): string {
  const parsed = companionStyleSchema.parse(style)
  return `## 普通陪伴对话的表达与节奏
以下仅调整非法律陪伴的表达，不能改写或削弱前文的法律事实、SOP、资源、隐私政策、安全边界与危机规则。
${Object.values(parsed).join("\n\n")}

${AGENT_PROMPTS.styleBoundary}`
}
