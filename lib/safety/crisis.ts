export type SafetyLevel = "urgent" | "check_in" | "none"
export type SafetyDecision = { level: SafetyLevel; reasons: string[] }

type Message = { role: string; content: string }

const DANGER = /不想活|活不下去|结束(?:我|自己)?的?生命|结束一切|了结(?:我)?自己|自杀|自尽|轻生|自伤|自残|伤害(?:我)?自己|割腕|跳楼|跳河|跳桥|上吊|吞药|一了百了|想死|去死|死了算了|kill\s+myself|hurt\s+myself|suicid(?:e|al)|end\s+my\s+life|want\s+to\s+die/giu
const DISTRESS = /撑不下去|撑不住|活着没意思|没有活下去|受不了了|can['’]?t\s+(?:go\s+on|take\s+it)/iu
const HISTORICAL = /以前|曾经|过去|当年|那时|之前|去年|年前|小时候|used to|in the past|years ago|previously/iu
const CURRENT = /现在|此刻|目前|正在|刚刚|刚才|已经.{0,4}(?:吞|割|跳)|今晚|今天|马上|now|currently|tonight|today/iu
const SELF = /我|自己|\bi\b|myself|my life/iu
const OTHER = /朋友|同学|同事|家人|对方|别人|有人|他|她|新闻|文章|电影|小说|\b(?:friend|he|she|they|article)\b/iu
const SAFE_NOW = /(?:现在|目前|此刻|已经).{0,6}安全|(?:没有|不再有|不想|不会|不打算).{0,5}(?:自杀|自伤|轻生|伤害自己|结束生命)|(?:没有|不再有).{0,4}(?:这种|这些|那种)(?:念头|想法)|^\s*(?:没有|不会|安全了|no)[，,。.!！\s]*$|\bi(?: am|'m) safe\b|\bi (?:do not|don['’]?t) (?:want|plan) to (?:die|hurt myself|kill myself)/iu
const OWN_REPORT = /(?:^|[，,。！？!?；;\n])\s*(?:现在|今天|刚才|刚刚|以前|当时|之前)?我(?:说|写|告诉|(?:对|跟|向|给|和).{0,10}(?:说|写|告诉))/u

function normalized(text: string): string {
  return text.normalize("NFKC").replace(/[\u200b-\u200d\ufeff\u0000]/g, "")
    .replace(/([\u4e00-\u9fff])\s+(?=[\u4e00-\u9fff])/gu, "$1").toLowerCase()
}

/** Remove only quotations attributed to someone else; a bare quoted self-threat still counts. */
function withoutReportedQuotes(text: string): string {
  return text.replace(/[“「‘"']([^”」’"'\n]+)[”」’"']/gu, (quote, _body, offset: number) => {
    const before = text.slice(Math.max(0, offset - 24), offset)
    if (OWN_REPORT.test(before)) return quote
    return /(?:他|她|对方|别人|有人|朋友|同学).{0,10}(?:说|叫|让|写)|(?:新闻|文章|电影|小说).{0,8}(?:写|说|提到)/u.test(before)
      ? " " : quote
  })
}

function negatedSignal(clause: string, start: number): boolean {
  const before = clause.slice(0, start)
  if (/(?:不是|并非|不代表)(?:没有|不想|不会|不打算)(?:想过|去|过|有|任何|\s)*$/u.test(before)) return false
  return /(?:不|没有|并没有|没|不会|不想|不打算|从未|不曾|不再|不准备|不考虑|不愿意|不是)(?:过|再|去|要|有|想过|任何|一点|打算|想法|念头|[“「‘"'\s]){0,5}$/u.test(before)
    || /(?:don['’]?t|do not|never|not)(?:\s+\w+){0,3}\s+$/iu.test(before)
}

function lastMarker(text: string, pattern: RegExp): number {
  return [...text.matchAll(new RegExp(pattern.source, "giu"))].at(-1)?.index ?? -1
}

export function assessCrisisMessage(text: string): SafetyDecision {
  const original = normalized(text)
  const clean = withoutReportedQuotes(original)
  const reasons: string[] = []
  let concern = false
  for (const clause of clean.split(/[，,。！？!?；;\n]|但是|但|不过|然而|可是|\bbut\b|\bhowever\b/iu)) {
    const subject = clause.replace(/我(?:的)?(?:朋友|同学|同事|家人)/gu, "朋友")
    const thirdParty = OTHER.test(subject) && !SELF.test(subject)
    for (const match of clause.matchAll(DANGER)) {
      if (negatedSignal(clause, match.index)) { reasons.push("negated_signal"); continue }
      const before = clause.slice(0, match.index)
      const reported = !OWN_REPORT.test(before) && /(?:他|她|对方|别人|有人|朋友|同学|同事|家人)(?:说|叫|让|要求|威胁|想|要|准备|打算|会|可能|自己|我|你|她|他|去|再|真的|现在|\s){0,8}$/u.test(before)
      if (thirdParty || reported) { reasons.push("reported_signal"); continue }
      const ownIntent = /我(?:也|真的|现在|正在|已经|刚刚|刚才|马上|今晚|今天|想|要|准备|打算|决定|会|可能|怕|担心|快|就|很){0,6}$/u.test(before)
        || /\bi\s+(?:want|plan|intend|am going)\b/iu.test(before)
      if (!ownIntent && /是什么意思|这个词|定义|科普|相关研究|论文|study|studying|research|definition/iu.test(clause)) {
        reasons.push("educational_mention")
        continue
      }
      const historyBefore = lastMarker(before, HISTORICAL)
      const currentBefore = lastMarker(before, CURRENT)
      const after = clause.slice(match.index + match[0].length)
      const historyAfter = /^[”」’"'\s]*(?:(?:是|发生在|发生于)(?:我)?|是我以前的想法)?(?:以前|过去|去年|当年的|小时候)|\byears ago\b/iu.test(after)
      if (historyBefore > currentBefore || (historyAfter && currentBefore < 0)) {
        concern = true
        reasons.push("historical_signal")
        continue
      }
      // An isolated clinical term is uncertain; current intent or action needs direct protection.
      const explicit = SELF.test(clause) || /不想活|活不下去|想死|去死|死了算了|结束生命|结束一切|一了百了|(?:想|要|准备|正在|已经|刚).{0,4}(?:自杀|自伤|割腕|跳楼|吞药)/u.test(clause)
      if (explicit) return { level: "urgent", reasons: ["current_danger"] }
      concern = true
      reasons.push("uncertain_signal")
    }
    if (!thirdParty && DISTRESS.test(clause) && !/(?:不再|没有).{0,4}(?:撑不住|撑不下去|受不了)/u.test(clause)) {
      concern = true
      reasons.push("distress_signal")
    }
  }
  // A safety statement cannot override an explicit current danger found above.
  if (SAFE_NOW.test(original)) return { level: "none", reasons: ["current_safety_statement"] }
  return { level: concern ? "check_in" : "none", reasons: [...new Set(reasons)] }
}

/** Reassess the latest user turn; only an immediately preceding unresolved signal carries forward. */
export function assessConversationSafety(messages: readonly Message[]): SafetyDecision {
  const users = messages.filter(message => message.role === "user")
  const latest = users.at(-1)
  if (!latest) return { level: "none", reasons: [] }
  const decision = assessCrisisMessage(latest.content)
  if (decision.level !== "none" || decision.reasons.length > 0) return decision
  const previous = users.at(-2)
  if (previous && assessCrisisMessage(previous.content).level !== "none") {
    return { level: "check_in", reasons: ["recent_unresolved_signal"] }
  }
  return decision
}

/** Compatibility for existing intent callers; uncertain signals remain safety-related. */
export function isCrisisMessage(text: string): boolean {
  return assessCrisisMessage(text).level !== "none"
}

export function conversationHasCrisis(messages: readonly Message[]): boolean {
  return assessConversationSafety(messages).level !== "none"
}
