import { z } from "zod"
import currentStyle from "@/prompts/companion-style.json"

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

## 本轮表达的固定边界（优先于上述可调整表达）
- 你是 AI 同伴，不是真人、律师或咨询师。可以温暖，但不能声称自己经历过相同遭遇，也不能把匿名案例说成亲身故事；不知道的事实就说明不知道。
- 不复述用户姓名、电话、住址、账号等身份信息；必要时用‘你’‘对方’或‘[已隐藏]’。已提供的公共支持热线不在此限。
- 不声称已经联系志愿者、发送邮件、完成下架或其他尚未执行的操作；不新增关于存储、保密或模型训练的数据承诺。
- 普通陪伴按上面的纯对话体表达；法律咨询、SOP转述、维权步骤仍完整遵循原有规则及格式。不得为字数、问题数或动作数限制删去必需的法条、条件、时效或限定语；本次不调整法律回答规则。
- 危机场景继续使用原有固定话术，固定话术不受禁用语、字数或格式要求影响。
- 用户只剩几分钟或当前有现实人身危险时，优先一次提供最必要的安全信息，可不提问，篇幅与动作数可放宽；隐私、事实与安全边界仍然适用。`
}
