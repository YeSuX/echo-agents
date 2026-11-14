import { expect, test } from "@playwright/test"

const baseUrl = process.env.CHAT_TEST_BASE_URL ?? "http://localhost:3100"
const reply = Array.from({ length: 60 }, (_, index) => `Synthetic paragraph ${index + 1}.`).join("\n\n")

test.use({ channel: process.env.CHAT_TEST_BROWSER_CHANNEL })

for (const route of ["/support", "/guests/1"]) {
  for (const viewport of [{ width: 1440, height: 900 }, { width: 390, height: 600 }]) {
    for (const outerPadding of [0, 180]) {
      test(`${route} keeps the composer stationary at ${viewport.width}px with ${outerPadding}px outer overflow`, async ({ page }) => {
        await page.setViewportSize(viewport)
        await page.route("**/api/visitor-session", route => route.fulfill({
          contentType: "application/json", body: JSON.stringify({ historyEnabled: false, consentVersion: null, consentedAt: null }),
        }))
        let requestCount = 0
        await page.route("**/api/chat", async (request) => {
          requestCount += 1
          await new Promise(resolve => setTimeout(resolve, 100))
          await request.fulfill({
            status: 200,
            contentType: "text/event-stream",
            body: `data: ${JSON.stringify({ content: reply })}\n\ndata: [DONE]\n\n`,
          })
        })
        await page.goto(`${baseUrl}${route}`)
        const input = page.getByRole("textbox")
        await expect(input).toBeVisible()
        // A scrollable document exposes accidental ancestor scrolling.
        await page.evaluate(padding => { document.body.style.paddingBottom = `${padding}px` }, outerPadding)
        const viewportElement = route === "/support"
          ? page.locator("main[aria-label]").locator("..")
          : page.locator('[data-slot="scroll-area-viewport"]')

        for (let turn = 0; turn < 2; turn += 1) {
          await expect(input).toBeEnabled()
          await input.fill(`Synthetic message ${turn + 1}`)
          await page.evaluate(() => window.scrollTo(0, 0))
          const before = await input.boundingBox()
          if (!before) throw new Error("Composer has no bounding box")
          // Sample every frame to catch jumps during sending, not just the final layout.
          const scrollProbe = await input.evaluateHandle((element) => {
            const samples: number[] = []
            const state = { samples, active: true }
            function sample() {
              if (!state.active) return
              samples.push(element.getBoundingClientRect().bottom)
              requestAnimationFrame(sample)
            }
            sample()
            return state
          })
          await input.press("Enter")
          await expect.poll(() => requestCount).toBe(turn + 1)
          await expect(input).toBeEnabled()
          await expect(page.getByText("Synthetic paragraph 60.", { exact: true })).toHaveCount(turn + 1)
          await expect.poll(async () => viewportElement.evaluate(element =>
            Math.abs(element.scrollHeight - element.clientHeight - element.scrollTop),
          )).toBeLessThan(2)
          const samples = await scrollProbe.evaluate((probe) => {
            probe.active = false
            return probe.samples
          })
          await scrollProbe.dispose()
          const expectedBottom = before.y + before.height
          expect(samples.length).toBeGreaterThan(0)
          expect(Math.max(...samples.map(bottom => Math.abs(bottom - expectedBottom)))).toBeLessThan(2)
          await expect.poll(() => page.evaluate(() => window.scrollY)).toBe(0)
        }
        await expect(input).toHaveValue("")
        if (route === "/support") {
          await input.fill("Synthetic draft")
          await input.press("Shift+Enter")
          await expect(input).toHaveValue("Synthetic draft\n")
          await input.dispatchEvent("keydown", { key: "Enter", code: "Enter", isComposing: true, keyCode: 229 })
          await expect(input).toHaveValue("Synthetic draft\n")
          expect(requestCount).toBe(2)
        }
      })
    }
  }
}
