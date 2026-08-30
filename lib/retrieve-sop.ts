import { detectIntent, type UserIntent } from "@/lib/intent-detect"
import {
  getSopChunkById,
  type SopChunk,
  type SopChunkId,
} from "@/data/sop-chunks"

export const MAX_SOP_CHUNKS = 2
export const MAX_SOP_CHARS = 2_500

const SCENE_CHUNK: Partial<Record<UserIntent, SopChunkId>> = {
  voyeurism: "sop-voyeur",
  nonconsensual: "sop-nonconsensual",
  deepfake: "sop-deepfake",
  doxxing: "sop-doxxing",
  rumor: "sop-rumor",
  "remote-abuse": "sop-remote-abuse",
}

const LEGAL_PATH_RE = /法律路径|构成什么|可能构成|哪些法律|什么罪|法律责任/

/** 「1年前 / 现在报警还有用吗」等：即使关键词不全，也必须注入时效块。 */
const TIME_GAP_RE =
  /年前|一年前|1\s*年前|\d+\s*年前|[一二三四五六七八九十两]+\s*年前|个月前|六\s*个?\s*月|6\s*个?\s*月/
const STILL_USEFUL_RE = /还有用|来得及|过期|现在报警|还能.{0,8}(?:报警|报案|追究|处罚)/
const POLICE_RE = /报警|报案|派出所|公安/

export type RetrievedSop = {
  chunks: SopChunk[]
  articleAllowlist: string[]
}

function uniqueAllowlist(chunks: readonly SopChunk[]): string[] {
  const seen = new Set<string>()
  const out: string[] = []
  for (const c of chunks) {
    for (const a of c.articleAllowlist) {
      if (seen.has(a)) continue
      seen.add(a)
      out.push(a)
    }
  }
  return out
}

function tryAdd(
  selected: SopChunk[],
  used: Set<string>,
  id: SopChunkId,
): boolean {
  if (selected.length >= MAX_SOP_CHUNKS) return false
  if (used.has(id)) return false
  const chunk = getSopChunkById(id)
  if (!chunk) return false
  const nextChars =
    selected.reduce((n, c) => n + c.text.length, 0) + chunk.text.length
  if (selected.length > 0 && nextChars > MAX_SOP_CHARS) return false
  if (selected.length === 0 && chunk.text.length > MAX_SOP_CHARS) {
    selected.push(chunk)
    used.add(id)
    return true
  }
  selected.push(chunk)
  used.add(id)
  return true
}

export function retrieveSop(
  text: string,
  intents: readonly UserIntent[] = detectIntent(text),
): RetrievedSop {
  const selected: SopChunk[] = []
  const used = new Set<string>()
  const add = (id: SopChunkId) => tryAdd(selected, used, id)

  const has = (i: UserIntent) => intents.includes(i)
  const forceLimitation =
    has("limitation") ||
    (TIME_GAP_RE.test(text) &&
      (STILL_USEFUL_RE.test(text) || POLICE_RE.test(text) || has("report-police")))
  const legalPaths = has("legal-paths") || LEGAL_PATH_RE.test(text)
  const sceneIds = (
    [
      "voyeurism",
      "nonconsensual",
      "deepfake",
      "doxxing",
      "rumor",
      "remote-abuse",
    ] as const
  )
    .filter((i) => has(i))
    .map((i) => SCENE_CHUNK[i]!)

  if (forceLimitation) add("sop-facts-limitation")

  if (legalPaths) add("sop-liability-frame")
  for (const id of sceneIds) add(id)

  if (has("evidence")) add("sop-evidence")

  const wantsSupervision = /立案监督|不立案|不予立案/.test(text)
  if (wantsSupervision) add("sop-supervision")
  if (has("report-police")) add("sop-police")

  const wantsLawsuit = /起诉|诉讼|法院|管辖/.test(text)
  if (has("legal-aid") && wantsLawsuit) add("sop-lawsuit")

  if (has("sextortion")) {
    add("sop-evidence")
    add("sop-police")
    add("sop-facts-limitation")
  }

  if (has("takedown") && has("report-police")) add("sop-police")

  return {
    chunks: selected,
    articleAllowlist: uniqueAllowlist(selected),
  }
}

export function formatSopBlock(retrieved: RetrievedSop): string {
  if (retrieved.chunks.length === 0) return ""
  const body = retrieved.chunks
    .map((c) => `### ${c.title}\n${c.text}`)
    .join("\n\n")
  const ids = new Set(retrieved.chunks.map((c) => c.id))
  const extra: string[] = []
  if (ids.has("sop-facts-limitation")) {
    extra.push(
      "- 已注入时效时：必须主动说明「这类行为本身多为治安违法；满 6 个月后除非构成刑事犯罪，否则很难得到处理」。禁止只说「不等于不能报警」或用「一点也不晚」替代时效说明",
    )
  }
  if (ids.has("sop-deepfake")) {
    extra.push(
      "- 已注入 AI 换脸时：三条路径都要点到（侮辱；传播淫秽物品；侵犯公民个人信息），传播淫秽物品路径必须同时点出「若牟利」及《刑法》第三百六十三条，不要等用户追问惩罚才补",
    )
  }
  if (ids.has("sop-police")) {
    extra.push(
      "- 已注入报警方式时：按 SOP 说明报案管辖（违法行为地；偷拍看发生地；网络实施行为看传播地/服务器地/受害人所在地/加害人居住地），案情复杂建议咨询律师；不要把微博/微信举报说成 SOP 步骤或替代报警",
    )
  }
  extra.push(
    "- SOP 已写条款号的，转述时必须写出该条号（如第五十条、第八十条、第三百六十三条），禁止用「相关条款」「有关规定」代替",
  )
  return `## 本次可引用的维权 SOP（唯一法律事实来源）
${body}

硬规则：
- 条款、时效、拘留/罚款幅度、入罪数量、管辖、起诉资格，只能来自上文
- 没有写到的不要发明条款号；说明需咨询律师/法援
- 必须保留 SOP 中的不确定表述：各地认定有差异、列举不等于本案一定适用
- 用同伴口吻转述，不要整段念法条；详细步骤可指向侧边栏
${extra.join("\n")}`
}
