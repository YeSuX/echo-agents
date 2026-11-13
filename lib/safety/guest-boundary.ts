import { getGuestProfile } from "@/data/guests"
import { GUEST_BOUNDARY_FALLBACK } from "./constants"
import { moderateAssistantOutput } from "./output-moderation"
import { isDisavowedClaim } from "./claim-context"

/** 嘉宾即兴编造具体经历的常见模式 */
const FABRICATION_PATTERNS: readonly RegExp[] = [
  /(?:记得|那天|有一次|当时|具体)(?:是|在)?(?:20\d{2}|[\u4e00-\u9fa5]{2,8}(?:市|区|县|镇|村|路|街|号))/,
  /我(?:当时|那年)?(?:\d{1,2})岁/,
  /(?:我的|一位)(?:同事|老板|前男友|前女友|同学|邻居)(?:叫|名叫|是)[\u4e00-\u9fa5]{1,4}/,
  /(?:去了|在)(?:派出所|法院|检察院).{0,30}(?:拿到了|收到了|判决)/,
  /我(?:也(?:曾经|经历过|遇到过|遭遇过)|曾经|当时|那时|那年|后来|之前|过去|以前|有过|遇到过|经历过|遭遇过|小时候|记得|有一次|被|去过|住在|就读|工作过|出生)/,
  /我的(?:家人|父母|母亲|父亲|伴侣|前任|同事|老板|同学|孩子|经历|故事|创伤|遭遇)/,
  /我(?:和|跟|与)(?:我的)?(?:家人|父母|母亲|父亲|伴侣|同事|朋友|律师).{0,16}(?:过|当时|那时|后来|以前|曾经|当年)/,
  /我(?:第一次|最初|开始时)|(?:以前|当时|后来|曾经).{0,4}我/,
]

export type GuestBoundaryResult = {
  content: string
  flagged: boolean
  reasons: string[]
}

export function checkGuestResponse(
  guestId: string,
  userQuestion: string,
  assistantText: string,
): GuestBoundaryResult {
  const reasons: string[] = []
  const guest = getGuestProfile(guestId)
  if (!guest) return { content: GUEST_BOUNDARY_FALLBACK, flagged: true, reasons: ["unknown_guest"] }

  const moderation = moderateAssistantOutput(assistantText, "guest")
  if (moderation.severity === "block") {
    return {
      content: moderation.content,
      flagged: true,
      reasons: [...moderation.reasons],
    }
  }

  for (const re of FABRICATION_PATTERNS) {
    for (const match of assistantText.matchAll(new RegExp(re.source, "g"))) {
      if (isDisavowedClaim(assistantText, match.index, match[0].length)) continue
      const before = assistantText.slice(0, match.index).split(/[。！？!?\n]/).at(-1) ?? ""
      const after = assistantText.slice(match.index).split(/[。！？!?\n]/)[0]
      const claim = `${before}${after}`.replace(/[\s，,；;：:]/g, "")
      const authorized = guest.authorization.facts.some(fact =>
        fact.replace(/[\s，,；;：:。！？!?]/g, "") === claim,
      )
      if (!authorized) {
        reasons.push("fabricated_detail")
        if (!guest.authorization.topics.some(topic => userQuestion.includes(topic))) {
          reasons.push("off_topic_personal_story")
        }
        break
      }
    }
    if (reasons.length) break
  }

  if (reasons.length > 0) {
    return {
      content: GUEST_BOUNDARY_FALLBACK,
      flagged: true,
      reasons,
    }
  }

  return { content: assistantText, flagged: false, reasons: [] }
}
