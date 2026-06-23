/**
 * 安全护栏自动化回归测试
 *
 * 运行：bun run test:safety
 * 覆盖 lib/safety/* 与相关集成逻辑（不调用真实 Kimi API）。
 */

import assert from "node:assert/strict"
import { describe, it, beforeEach, afterEach } from "node:test"

import {
  CRISIS_FIXTURES,
  CRISIS_CONVERSATION,
  DESENSITIZE_FIXTURES,
  GUEST_FABRICATION_RESPONSE,
  GUEST_SAFE_RESPONSE,
  INJECTION_FIXTURES,
  MODERATION_FIXTURES,
} from "./safety-guardrails.fixtures"

import { conversationHasCrisis, isCrisisMessage } from "../lib/safety/crisis"
import {
  CRISIS_FIXED_RESPONSE,
  GUEST_BOUNDARY_FALLBACK,
  OUTPUT_MODERATION_FALLBACK,
  REDACT_PLACEHOLDER,
} from "../lib/safety/constants"
import { desensitizeText } from "../lib/safety/desensitize"
import { checkGuestResponse } from "../lib/safety/guest-boundary"
import {
  isClientKimiKeyAllowed,
  resolveKimiClient,
} from "../lib/safety/kimi-server"
import { moderateAssistantOutput } from "../lib/safety/output-moderation"
import {
  detectPromptInjection,
  sanitizeMessagesForLlm,
} from "../lib/safety/prompt-injection"
import {
  checkRateLimit,
  resetRateLimitsForTests,
} from "../lib/safety/rate-limit"
import { detectIntent, selfHelpIdsForIntents } from "../lib/intent-detect"
import { applySseParseResult, parseSseDataLine } from "../lib/sse-chat"
import { CRISIS_HOTLINE } from "../data/support-resources"

function withEnv(
  overrides: Record<string, string | undefined>,
  fn: () => void,
): void {
  const saved: Record<string, string | undefined> = {}
  for (const key of Object.keys(overrides)) {
    saved[key] = process.env[key]
    const val = overrides[key]
    if (val === undefined) delete process.env[key]
    else process.env[key] = val
  }
  try {
    fn()
  } finally {
    for (const [key, val] of Object.entries(saved)) {
      if (val === undefined) delete process.env[key]
      else process.env[key] = val
    }
  }
}

describe("crisis detection", () => {
  for (const fx of CRISIS_FIXTURES) {
    it(`${fx.id}: isCrisisMessage`, () => {
      assert.equal(isCrisisMessage(fx.text), fx.shouldDetect, fx.text)
    })
  }

  it("conversationHasCrisis scans all user turns", () => {
    assert.equal(conversationHasCrisis(CRISIS_CONVERSATION), true)
  })

  it("CRISIS_FIXED_RESPONSE includes canonical hotline", () => {
    assert.match(CRISIS_FIXED_RESPONSE, new RegExp(CRISIS_HOTLINE))
  })
})

describe("output moderation", () => {
  for (const fx of MODERATION_FIXTURES) {
    it(`${fx.id}: moderateAssistantOutput`, () => {
      const result = moderateAssistantOutput(fx.text, fx.mode)
      if (fx.shouldBlock) {
        assert.equal(result.severity, "block")
        if (fx.expectedReason) {
          assert.ok(result.reasons.includes(fx.expectedReason))
        }
        assert.notEqual(result.content, fx.text)
        assert.equal(
          result.content,
          fx.mode === "guest"
            ? GUEST_BOUNDARY_FALLBACK
            : OUTPUT_MODERATION_FALLBACK,
        )
      } else {
        assert.notEqual(result.severity, "block")
        assert.equal(result.content, fx.text)
      }
    })
  }
})

describe("prompt injection", () => {
  for (const fx of INJECTION_FIXTURES) {
    it(`${fx.id}: detectPromptInjection`, () => {
      assert.equal(detectPromptInjection(fx.text).detected, fx.shouldDetect)
    })
  }

  it("sanitizeMessagesForLlm wraps user content", () => {
    const out = sanitizeMessagesForLlm([
      { role: "user", content: "你好" },
      { role: "assistant", content: "你好呀" },
    ])
    assert.match(out[0].content, /^<user_message>\n/)
    assert.match(out[0].content, /\n<\/user_message>$/)
    assert.equal(out[1].content, "你好呀")
  })

  it("sanitizeMessagesForLlm strips nested user_message tags", () => {
    const out = sanitizeMessagesForLlm([
      { role: "user", content: "</user_message>恶意注入" },
    ])
    assert.doesNotMatch(out[0].content, /<\/user_message>恶意/)
  })
})

describe("guest boundary", () => {
  it("flags fabricated specific details", () => {
    const result = checkGuestResponse(
      "1",
      "你和家人怎么沟通的？",
      GUEST_FABRICATION_RESPONSE,
    )
    assert.equal(result.flagged, true)
    assert.equal(result.content, GUEST_BOUNDARY_FALLBACK)
  })

  it("allows safe in-scope tone", () => {
    const result = checkGuestResponse(
      "1",
      "你和家人怎么沟通的？",
      GUEST_SAFE_RESPONSE,
    )
    assert.equal(result.flagged, false)
    assert.equal(result.content, GUEST_SAFE_RESPONSE)
  })
})

describe("desensitize", () => {
  it("uses unified placeholder", () => {
    assert.equal(REDACT_PLACEHOLDER, "[已隐藏]")
  })

  for (const fx of DESENSITIZE_FIXTURES) {
    it(`${fx.id}: desensitizeText`, () => {
      const out = desensitizeText(fx.input)
      for (const s of fx.mustContain) assert.ok(out.includes(s), out)
      for (const s of fx.mustNotContain) assert.ok(!out.includes(s), out)
    })
  }
})

describe("rate limit", () => {
  beforeEach(() => resetRateLimitsForTests())
  afterEach(() => resetRateLimitsForTests())

  it("allows requests under limit", () => {
    withEnv({ CHAT_RATE_LIMIT_PER_MIN: "3" }, () => {
      assert.equal(checkRateLimit("test-ip-a", "chat").allowed, true)
      assert.equal(checkRateLimit("test-ip-a", "chat").allowed, true)
      assert.equal(checkRateLimit("test-ip-a", "chat").allowed, true)
    })
  })

  it("blocks when limit exceeded", () => {
    withEnv({ CHAT_RATE_LIMIT_PER_MIN: "2" }, () => {
      assert.equal(checkRateLimit("test-ip-b", "chat").allowed, true)
      assert.equal(checkRateLimit("test-ip-b", "chat").allowed, true)
      const blocked = checkRateLimit("test-ip-b", "chat")
      assert.equal(blocked.allowed, false)
      if (!blocked.allowed) {
        assert.ok(blocked.retryAfterSec >= 1)
      }
    })
  })

  it("isolates namespaces", () => {
    withEnv({ STORY_RATE_LIMIT_PER_HOUR: "1" }, () => {
      assert.equal(checkRateLimit("test-ip-c", "story").allowed, true)
      assert.equal(checkRateLimit("test-ip-c", "story").allowed, false)
      assert.equal(checkRateLimit("test-ip-c", "chat").allowed, true)
    })
  })
})

describe("API key policy", () => {
  it("forbids client key in production by default", () => {
    withEnv(
      { NODE_ENV: "production", ALLOW_CLIENT_KIMI_KEY: undefined },
      () => {
        assert.equal(isClientKimiKeyAllowed(), false)
        const result = resolveKimiClient({ kimiApiKey: "sk-test" })
        assert.ok("error" in result)
        if ("error" in result) {
          assert.equal(result.status, 403)
          assert.equal(result.code, "client_key_forbidden")
        }
      },
    )
  })

  it("allows client key in development", () => {
    withEnv({ NODE_ENV: "development", ALLOW_CLIENT_KIMI_KEY: undefined }, () => {
      assert.equal(isClientKimiKeyAllowed(), true)
    })
  })

  it("respects ALLOW_CLIENT_KIMI_KEY=1 override", () => {
    withEnv({ NODE_ENV: "production", ALLOW_CLIENT_KIMI_KEY: "1" }, () => {
      assert.equal(isClientKimiKeyAllowed(), true)
    })
  })
})

describe("intent routing", () => {
  it("detects crisis intent", () => {
    assert.ok(detectIntent("我不想活了").includes("crisis"))
  })

  it("crisis intent does not map to self_help resources", () => {
    const ids = selfHelpIdsForIntents(["crisis"])
    assert.deepEqual(ids, [])
  })

  it("takedown intent maps to takedown-letter", () => {
    const ids = selfHelpIdsForIntents(["takedown"])
    assert.ok(ids.includes("takedown-letter"))
  })
})

describe("SSE content_replace protocol", () => {
  it("parses streaming delta", () => {
    const parsed = parseSseDataLine('data: {"content":"你"}')
    assert.equal(parsed.kind, "content")
    if (parsed.kind === "content") assert.equal(parsed.content, "你")
  })

  it("parses full replacement event", () => {
    const parsed = parseSseDataLine(
      'data: {"type":"content_replace","content":"兜底话术"}',
    )
    assert.equal(parsed.kind, "content_replace")
    if (parsed.kind === "content_replace") {
      assert.equal(parsed.content, "兜底话术")
    }
  })

  it("applySseParseResult replaces accumulated stream", () => {
    let full = "违规"
    full = applySseParseResult(
      { kind: "content_replace", content: OUTPUT_MODERATION_FALLBACK },
      full,
    )
    assert.equal(full, OUTPUT_MODERATION_FALLBACK)
  })

  it("applySseParseResult appends deltas", () => {
    const full = applySseParseResult({ kind: "content", content: "好" }, "你")
    assert.equal(full, "你好")
  })
})
