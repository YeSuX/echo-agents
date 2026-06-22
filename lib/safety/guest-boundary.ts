import { GUESTS } from "@/data/guests"
import { GUEST_BOUNDARY_FALLBACK } from "./constants"
import { moderateAssistantOutput } from "./output-moderation"

/** 嘉宾即兴编造具体经历的常见模式 */
const FABRICATION_PATTERNS: readonly RegExp[] = [
  /(?:记得|那天|有一次|当时|具体)(?:是|在)?(?:20\d{2}|[\u4e00-\u9fa5]{2,8}(?:市|区|县|镇|村|路|街|号))/,
  /我(?:当时|那年)?(?:\d{1,2})岁/,
  /(?:我的|一位)(?:同事|老板|前男友|前女友|同学|邻居)(?:叫|名叫|是)[\u4e00-\u9fa5]{1,4}/,
  /(?:去了|在)(?:派出所|法院|检察院).{0,30}(?:拿到了|收到了|判决)/,
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

  const moderation = moderateAssistantOutput(assistantText, "guest")
  if (moderation.severity === "block") {
    return {
      content: moderation.content,
      flagged: true,
      reasons: [...moderation.reasons],
    }
  }

  for (const re of FABRICATION_PATTERNS) {
    if (re.test(assistantText)) {
      reasons.push("fabricated_detail")
      break
    }
  }

  const guest = GUESTS.find((g) => g.id === guestId)
  if (guest && isClearlyOffTopic(userQuestion, guest.tagline)) {
    const sharesPersonalStory =
      /我(?:曾经|当时|那时|有一次|记得)|我的经历/.test(assistantText)
    if (sharesPersonalStory && assistantText.length > 120) {
      reasons.push("off_topic_personal_story")
    }
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

function isClearlyOffTopic(question: string, tagline: string): boolean {
  const q = question.toLowerCase()
  const topicHints = extractTopicHints(tagline)
  if (topicHints.length === 0) return false
  return !topicHints.some((hint) => q.includes(hint))
}

function extractTopicHints(tagline: string): string[] {
  const hints: string[] = []
  const pairs: [RegExp, string][] = [
    [/家人|家庭|沟通/, "家人"],
    [/司法|程序|法院|律师/, "司法"],
    [/康复|支撑|恢复/, "康复"],
    [/舆论|二次伤害/, "舆论"],
    [/伴侣|信任|边界/, "伴侣"],
    [/幸存者|称呼/, "幸存者"],
    [/职场|自我照顾/, "职场"],
    [/写作|表达/, "写作"],
    [/听见|理解/, "理解"],
  ]
  for (const [re, hint] of pairs) {
    if (re.test(tagline)) hints.push(hint)
  }
  return hints
}
