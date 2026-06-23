import { CRISIS_FIXED_RESPONSE } from "./constants"

export function encodeSseData(payload: unknown): Uint8Array {
  return new TextEncoder().encode(`data: ${JSON.stringify(payload)}\n\n`)
}

export function encodeSseDone(): Uint8Array {
  return new TextEncoder().encode("data: [DONE]\n\n")
}

export function createCrisisSseStream(): ReadableStream<Uint8Array> {
  return new ReadableStream({
    start(controller) {
      controller.enqueue(encodeSseData({ content: CRISIS_FIXED_RESPONSE }))
      controller.enqueue(encodeSseDone())
      controller.close()
    },
  })
}

export function createTextSseStream(text: string): ReadableStream<Uint8Array> {
  return new ReadableStream({
    start(controller) {
      controller.enqueue(encodeSseData({ content: text }))
      controller.enqueue(encodeSseDone())
      controller.close()
    },
  })
}

export function sseResponseHeaders(): HeadersInit {
  return {
    "Content-Type": "text/event-stream",
    "Cache-Control": "no-cache",
    Connection: "keep-alive",
  }
}

export function jsonErrorResponse(
  error: string,
  status: number,
  extra?: Record<string, string>,
): Response {
  return new Response(JSON.stringify({ error, ...extra }), {
    status,
    headers: { "Content-Type": "application/json" },
  })
}

export function rateLimitResponse(retryAfterSec: number): Response {
  return new Response(
    JSON.stringify({
      error: "请求过于频繁，请稍后再试。",
      retryAfterSec,
    }),
    {
      status: 429,
      headers: {
        "Content-Type": "application/json",
        "Retry-After": String(retryAfterSec),
      },
    },
  )
}
