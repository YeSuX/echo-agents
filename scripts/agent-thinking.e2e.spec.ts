import { expect, test } from "@playwright/test"

const baseUrl = process.env.CHAT_TEST_BASE_URL ?? "http://localhost:3100"
test.use({ channel: process.env.CHAT_TEST_BROWSER_CHANNEL })

type StreamProbe = {
  controller: ReadableStreamDefaultController<Uint8Array> | null
}

declare global {
  interface Window {
    thinkingStreamProbe: StreamProbe
  }
}

for (const route of ["/support", "/guests/1"]) {
  for (const outcome of ["complete", "stop", "fail"] as const) {
    test(`${route} hides reasoning and clears the animation on ${outcome}`, async ({ page }) => {
      await page.route("**/api/visitor-session", request => request.fulfill({
        json: { historyEnabled: false, consentVersion: null, consentedAt: null },
      }))
      // Control a real SSE reader without a model request or persisted test data.
      await page.addInitScript(() => {
        const originalFetch = window.fetch.bind(window)
        const probe: StreamProbe = { controller: null }
        window.thinkingStreamProbe = probe
        window.fetch = Object.assign(async (input: Parameters<typeof fetch>[0], init?: Parameters<typeof fetch>[1]) => {
          const url = input instanceof Request ? input.url : input.toString()
          if (new URL(url, location.href).pathname !== "/api/chat") return originalFetch(input, init)
          const stream = new ReadableStream<Uint8Array>({
            start(controller) {
              probe.controller = controller
              init?.signal?.addEventListener("abort", () => {
                controller.error(new DOMException("Stopped", "AbortError"))
              }, { once: true })
            },
          })
          return new Response(stream, { headers: { "Content-Type": "text/event-stream" } })
        }, { preconnect: originalFetch.preconnect })
      })
      await page.emulateMedia({ reducedMotion: "no-preference" })
      await page.goto(`${baseUrl}${route}`)
      const input = page.getByRole("textbox")
      await expect(input).toBeEnabled()
      await input.fill("Synthetic animation fixture")
      await input.press("Enter")
      const thinking = page.getByRole("status", { name: "正在思考", exact: true })
      await expect(thinking).toBeVisible()
      await page.waitForFunction(() => window.thinkingStreamProbe.controller !== null)
      await page.evaluate(() => {
        window.thinkingStreamProbe.controller!.enqueue(new TextEncoder().encode(
          'data: {"type":"reasoning","content":"Private reasoning fixture"}\n\n',
        ))
      })
      await expect(thinking).toBeVisible()
      await expect(page.getByText("Private reasoning fixture", { exact: true })).toHaveCount(0)
      await expect(page.locator("details")).toHaveCount(0)
      const dots = thinking.locator('[aria-hidden="true"] > span')
      await expect(dots).toHaveCount(3)
      await expect.poll(() => dots.first().evaluate(element => getComputedStyle(element).animationName)).toBe("bounce")
      await page.emulateMedia({ reducedMotion: "reduce" })
      await expect.poll(() => dots.first().evaluate(element => getComputedStyle(element).animationName)).toBe("none")

      if (outcome === "complete") {
        await page.evaluate(() => {
          window.thinkingStreamProbe.controller!.enqueue(new TextEncoder().encode(
            'data: {"content":"Synthetic visible answer."}\n\n',
          ))
        })
        await expect(page.getByText("Synthetic visible answer.", { exact: true })).toBeVisible()
        await expect(thinking).toHaveCount(0)
        await page.evaluate(() => {
          const controller = window.thinkingStreamProbe.controller!
          controller.enqueue(new TextEncoder().encode("data: [DONE]\n\n"))
          controller.close()
        })
      } else if (outcome === "stop") {
        await page.getByRole("button", { name: "停止生成", exact: true }).click()
      } else {
        await page.evaluate(() => {
          window.thinkingStreamProbe.controller!.error(new Error("Synthetic stream failure"))
        })
        await expect(page.getByRole("alert").filter({ hasText: "Synthetic stream failure" })).toBeVisible()
      }
      await expect(input).toBeEnabled()
      await expect(thinking).toHaveCount(0)
      await expect(page.getByText("Private reasoning fixture", { exact: true })).toHaveCount(0)
      await expect(page.locator("details")).toHaveCount(0)
    })
  }
}
