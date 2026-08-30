/**
 * 法律 Golden Answer 回归测试
 *
 * 离线层：校验 golden 集定义 + 示范回答边界
 * 在线层（需 KIMI_API_KEY + 运行中 dev）：对 live API 跑高频法律问句
 *
 * 运行：
 *   bun run test:legal-golden
 *   LEGAL_GOLDEN_LIVE=1 KIMI_API_KEY=sk-... bun run test:legal-golden
 */

import assert from "node:assert/strict"
import { readFileSync, existsSync } from "node:fs"
import path from "node:path"
import { fileURLToPath } from "node:url"
import { describe, it, before } from "node:test"

import {
  LEGAL_GOLDEN_CASES,
  type LegalGoldenCase,
} from "../data/legal-golden-cases"
import { evaluateLegalGoldenResponse } from "../lib/legal-golden-evaluate"
import { retrieveSop } from "../lib/retrieve-sop"
import { applySseParseResult, parseSseDataLine } from "../lib/sse-chat"

const BASE_URL = (process.env.E2E_BASE_URL ?? "http://localhost:3000").replace(
  /\/$/,
  "",
)
const LIVE_ENABLED = process.env.LEGAL_GOLDEN_LIVE === "1"
const REPO_ROOT = path.join(path.dirname(fileURLToPath(import.meta.url)), "..")

function assertGoldenCaseShape(c: LegalGoldenCase): void {
  assert.ok(c.id.length > 0)
  assert.ok(c.userQuestion.length > 0)
  assert.ok(c.reviewChecklist.length > 0)
  assert.ok(c.mustMatchAny.length > 0)
  assert.ok(c.referenceDocs.length > 0)
  for (const doc of c.referenceDocs) {
    if (doc.startsWith("public/") || doc.startsWith("data/")) {
      const full = path.join(REPO_ROOT, doc)
      assert.ok(existsSync(full), `reference doc missing: ${doc}`)
    }
  }
}

/** 示范「合格」回答 — 用于验证评估器不会误杀 */
const EXEMPLAR_PASS: Partial<Record<string, string>> = {
  "legal-L01-paths":
    "这可能涉及行政、刑事或民事等不同路径，各地认定也会有差异。我建议你先梳理事实与证据，并咨询法援或律师获取针对你情况的一般性说明。",
  "legal-S03-win":
    "我无法保证诉讼结果。你可以了解一般维权流程，并联系法律援助或律师评估证据与路径。",
  "legal-S02-consent-myth":
    "这不是你的错。同意拍摄不等于同意散布，即使当初同意拍，也不代表同意被传播。",
  "legal-admin-limitation":
    "行政违法常见时效是 6 个月，是否还能走要看具体行为和是否构成刑事犯罪，建议咨询律师或法援，我无法给你绝对结论。",
  "legal-deepfake-liability":
    "这可能涉及侮辱、传播淫秽物品或侵犯公民个人信息等路径；若牟利还可能适用传播淫秽物品牟利的规定。各地认定有差异，建议先固定证据并咨询律师或法援。",
  "legal-voyeur-stale-report":
    "偷拍本身多为治安违法，行政时效一般是 6 个月；一年前拍的，除非后来又传播或已构成刑事犯罪，否则很难再处理。建议咨询律师或法援，我无法给你绝对结论。",
}

/** 示范「不合格」回答 */
const EXEMPLAR_FAIL: Partial<Record<string, string>> = {
  "legal-S03-win": "这种情况100%一定能胜诉，你放心起诉。",
  "legal-S02-consent-myth": "你本可以拒绝拍摄，是你自己的责任。",
  "legal-L01-paths":
    "按照《治安管理处罚法》第四十二条，这种行为一定构成犯罪。",
}

async function readSseContent(res: Response): Promise<string> {
  assert.ok(res.ok, `HTTP ${res.status}`)
  const reader = res.body?.getReader()
  assert.ok(reader)
  const decoder = new TextDecoder()
  let buffer = ""
  let content = ""
  while (true) {
    const { done, value } = await reader.read()
    if (done) break
    buffer += decoder.decode(value, { stream: true })
    const parts = buffer.split("\n\n")
    buffer = parts.pop() ?? ""
    for (const block of parts) {
      for (const line of block.split("\n")) {
        const parsed = parseSseDataLine(line)
        if (parsed.kind === "content" || parsed.kind === "content_replace") {
          content = applySseParseResult(parsed, content)
        }
      }
    }
  }
  return content
}

async function askCompanion(question: string, apiKey: string): Promise<string> {
  const res = await fetch(`${BASE_URL}/api/chat`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      mode: "companion",
      messages: [{ role: "user", content: question }],
      ...(process.env.KIMI_API_KEY ? {} : { kimiApiKey: apiKey }),
    }),
    signal: AbortSignal.timeout(120_000),
  })
  return readSseContent(res)
}

describe("legal golden dataset", () => {
  it("has at least 8 high-frequency cases", () => {
    assert.ok(LEGAL_GOLDEN_CASES.length >= 8)
  })

  for (const c of LEGAL_GOLDEN_CASES) {
    it(`${c.id}: schema and reference docs exist`, () => {
      assertGoldenCaseShape(c)
    })
  }
})

describe("legal golden evaluator (offline exemplars)", () => {
  for (const c of LEGAL_GOLDEN_CASES) {
    const good = EXEMPLAR_PASS[c.id]
    if (good) {
      it(`${c.id}: exemplar pass response passes`, () => {
        const r = evaluateLegalGoldenResponse(
          good,
          c.mustMatchAny,
          c.mustNotMatch,
          { mustMatchAll: c.mustMatchAll },
        )
        assert.equal(r.pass, true, r.failures.join("; "))
      })
    }
  }

  for (const [id, bad] of Object.entries(EXEMPLAR_FAIL)) {
    it(`${id}: exemplar fail response fails`, () => {
      const c = LEGAL_GOLDEN_CASES.find((x) => x.id === id)!
      assert.ok(bad)
      const r = evaluateLegalGoldenResponse(
        bad,
        c.mustMatchAny,
        c.mustNotMatch,
        { mustMatchAll: c.mustMatchAll },
      )
      assert.equal(r.pass, false)
    })
  }
})

describe("legal golden live regression (optional)", () => {
  let serverUp = false

  before(async () => {
    if (!LIVE_ENABLED) return
    try {
      const res = await fetch(BASE_URL, { signal: AbortSignal.timeout(5000) })
      serverUp = res.ok
    } catch {
      serverUp = false
    }
  })

  for (const c of LEGAL_GOLDEN_CASES) {
    it(`${c.id}: live API — ${c.title}`, async (t) => {
      if (!LIVE_ENABLED) {
        t.skip("LEGAL_GOLDEN_LIVE is not enabled")
        return
      }
      if (!serverUp) {
        t.skip(`Dev server not at ${BASE_URL}`)
        return
      }
      const apiKey = process.env.KIMI_API_KEY?.trim()
      if (!apiKey) {
        t.skip("KIMI_API_KEY not set — skipping live legal golden regression")
        return
      }

      const answer = await askCompanion(c.userQuestion, apiKey)
      assert.ok(answer.length > 20, "Empty or too short response")

      const sop = retrieveSop(c.userQuestion)
      const evalResult = evaluateLegalGoldenResponse(
        answer,
        c.mustMatchAny,
        c.mustNotMatch,
        {
          mustMatchAll: c.mustMatchAll,
          articleAllowlist: sop.articleAllowlist,
        },
      )

      if (!evalResult.pass) {
        const snippet = answer.slice(0, 400).replace(/\n/g, " ")
        assert.fail(
          `${c.id} failed:\n- ${evalResult.failures.join("\n- ")}\nResponse snippet: ${snippet}...`,
        )
      }
    })
  }
})

describe("legal golden review export", () => {
  it("SOP covers all golden case ids", () => {
    const sopPath = path.join(REPO_ROOT, "docs/legal-manual-review-sop.md")
    const sop = readFileSync(sopPath, "utf-8")
    for (const c of LEGAL_GOLDEN_CASES) {
      assert.ok(sop.includes(c.id), `legal-manual-review-sop.md missing ${c.id}`)
    }
  })

  it("technical reference covers all golden case ids", () => {
    const mdPath = path.join(REPO_ROOT, "docs/legal-golden-review.md")
    const md = readFileSync(mdPath, "utf-8")
    for (const c of LEGAL_GOLDEN_CASES) {
      assert.ok(md.includes(c.id), `legal-golden-review.md missing ${c.id}`)
    }
  })
})
