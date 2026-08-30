/**
 * SOP 检索离线断言。不调用 Kimi。
 *
 * 运行：bun run test:retrieve-sop
 */

import assert from "node:assert/strict"
import { describe, it } from "node:test"

import { LEGAL_GOLDEN_CASES } from "../data/legal-golden-cases"
import { SOP_CHUNKS } from "../data/sop-chunks"
import { detectIntent } from "../lib/intent-detect"
import {
  MAX_SOP_CHUNKS,
  MAX_SOP_CHARS,
  formatSopBlock,
  retrieveSop,
} from "../lib/retrieve-sop"
import { parseChineseNumeral } from "../lib/legal-golden-evaluate"

describe("sop chunks", () => {
  it("covers the planned section ids", () => {
    const ids = SOP_CHUNKS.map((c) => c.id)
    for (const id of [
      "sop-facts-limitation",
      "sop-liability-frame",
      "sop-voyeur",
      "sop-nonconsensual",
      "sop-doxxing",
      "sop-deepfake",
      "sop-rumor",
      "sop-remote-abuse",
      "sop-evidence",
      "sop-police",
      "sop-supervision",
      "sop-lawsuit",
    ]) {
      assert.ok(ids.includes(id as (typeof ids)[number]), `missing ${id}`)
    }
  })
})

describe("retrieveSop vs golden questions", () => {
  for (const c of LEGAL_GOLDEN_CASES) {
    it(`${c.id}: expected SOP chunks`, () => {
      const retrieved = retrieveSop(c.userQuestion)
      assert.ok(retrieved.chunks.length <= MAX_SOP_CHUNKS)
      const chars = retrieved.chunks.reduce((n, x) => n + x.text.length, 0)
      if (retrieved.chunks.length > 1) {
        assert.ok(chars <= MAX_SOP_CHARS, `${c.id} over budget (${chars})`)
      }
      const expected = c.expectedSopChunkIds ?? []
      const got = retrieved.chunks.map((x) => x.id)
      for (const id of expected) {
        assert.ok(got.includes(id), `${c.id} missing ${id}; got ${got.join(",")}`)
      }
      if (expected.length === 0) {
        assert.equal(
          retrieved.chunks.length,
          0,
          `${c.id} should not inject SOP; got ${got.join(",")}`,
        )
      }
    })
  }

  it("倾诉不含法律意图时不注入", () => {
    const r = retrieveSop("我今天很难过，只是想有人听我说说话")
    assert.equal(r.chunks.length, 0)
    assert.equal(formatSopBlock(r), "")
  })

  it("L-01 intents include nonconsensual and legal-paths", () => {
    const q = "未经同意传播私密影像，通常可能涉及哪些法律路径？"
    const intents = detectIntent(q)
    assert.ok(intents.includes("nonconsensual"))
    assert.ok(intents.includes("legal-paths"))
  })

  it("1年前 + 报警还有用吗 强制注入时效块", () => {
    const followUp = "我觉得那些影像好像是1年前拍的，现在报警还有用吗？"
    const withContext = `我被偷拍，不知道偷拍的人是谁，怎么办？\n${followUp}`
    for (const q of [followUp, withContext]) {
      const r = retrieveSop(q)
      const ids = r.chunks.map((c) => c.id)
      assert.ok(
        ids.includes("sop-facts-limitation"),
        `${JSON.stringify(q)} missing limitation; got ${ids.join(",")}`,
      )
    }
    const withVoyeur = retrieveSop(
      "我被偷拍，那些影像好像是1年前拍的，现在报警还有用吗？",
    )
    const voyeurIds = withVoyeur.chunks.map((c) => c.id)
    assert.ok(voyeurIds.includes("sop-facts-limitation"))
    assert.ok(voyeurIds.includes("sop-voyeur"))
    const block = formatSopBlock(withVoyeur)
    assert.match(block, /满 6 个月后除非构成刑事/)
    assert.match(block, /不等于不能报警/)
  })

  it("如何报案 注入管辖细则", () => {
    const r = retrieveSop("我该如何报案？")
    const ids = r.chunks.map((c) => c.id)
    assert.ok(ids.includes("sop-police"), `got ${ids.join(",")}`)
    const police = r.chunks.find((c) => c.id === "sop-police")
    assert.ok(police)
    assert.match(police.text, /违法行为地/)
    assert.match(police.text, /偷拍发生地/)
    assert.match(police.text, /服务器所在地/)
    const block = formatSopBlock(r)
    assert.match(block, /报案管辖/)
  })

  it("AI 换脸检索块与提示词要求点出牟利和条号", () => {
    const r = retrieveSop("有人AI换脸制作我的色情图像，传播到X上，我该怎么维权？")
    const ids = r.chunks.map((c) => c.id)
    assert.ok(ids.includes("sop-deepfake"), `got ${ids.join(",")}`)
    const deepfake = r.chunks.find((c) => c.id === "sop-deepfake")
    assert.ok(deepfake)
    assert.match(deepfake.text, /若牟利/)
    assert.match(deepfake.text, /第三百六十三条/)
    const block = formatSopBlock(r)
    assert.match(block, /若牟利/)
    assert.match(block, /禁止用「相关条款」/)
  })
})

describe("parseChineseNumeral", () => {
  it("parses SOP article numbers", () => {
    assert.equal(parseChineseNumeral("二十五"), 25)
    assert.equal(parseChineseNumeral("五十"), 50)
    assert.equal(parseChineseNumeral("八十"), 80)
    assert.equal(parseChineseNumeral("三百六十四"), 364)
    assert.equal(parseChineseNumeral("122"), 122)
  })
})
