import { expect, test } from "@playwright/test"
import { AUTH_INITIALIZATION_ERROR, PREFERENCES_INITIALIZATION_ERROR } from "@/lib/conversation-preferences-loader"

const baseUrl = process.env.CHAT_TEST_BASE_URL ?? "http://localhost:3100"
test.use({ channel: process.env.CHAT_TEST_BROWSER_CHANNEL })

for (const path of ["/support", "/guests/1"]) {
  test(`${path} exits unresolved authentication and can retry`, async ({ page }) => {
    let blocked = true
    let bootstrapRequests = 0
    let chatRequests = 0
    await page.clock.install()
    await page.route("**/npm/@clerk/clerk-js*/**", route => blocked ? route.abort() : route.continue())
    await page.route("**/api/visitor-session", route => {
      bootstrapRequests += 1
      return route.fulfill({ json: { historyEnabled: false, consentVersion: null, consentedAt: null } })
    })
    page.on("request", request => { if (new URL(request.url()).pathname === "/api/chat") chatRequests += 1 })
    await page.goto(`${baseUrl}${path}`)
    await expect(page.getByRole("button", { name: "读取保存设置", exact: true })).toBeVisible()
    await page.clock.fastForward(16_000)
    await expect(page.getByRole("alert").filter({ hasText: AUTH_INITIALIZATION_ERROR })).toBeVisible()
    await expect(page.getByRole("button", { name: "读取保存设置", exact: true })).toHaveCount(0)
    await expect(page.getByRole("textbox")).toBeDisabled()
    expect(bootstrapRequests).toBe(0)
    expect(chatRequests).toBe(0)
    blocked = false
    await page.getByRole("button", { name: "重新加载保存设置", exact: true }).click()
    await expect(page.getByRole("textbox")).toBeEnabled({ timeout: 20000 })
    expect(bootstrapRequests).toBeGreaterThan(0)
  })

  test(`${path} bounds a stalled preference request and retries without unsaved fallback`, async ({ page }) => {
    let stalled = true
    let bootstrapRequests = 0
    let chatRequests = 0
    const held: (() => void)[] = []
    await page.clock.install()
    await page.route("**/api/visitor-session", async route => {
      bootstrapRequests += 1
      if (stalled) await new Promise<void>(resolve => held.push(resolve))
      await route.fulfill({ json: { historyEnabled: false, consentVersion: null, consentedAt: null } }).catch(() => {})
    })
    page.on("request", request => { if (new URL(request.url()).pathname === "/api/chat") chatRequests += 1 })
    await page.goto(`${baseUrl}${path}`)
    await expect.poll(() => bootstrapRequests).toBe(1)
    await page.clock.fastForward(16_000)
    await expect(page.getByRole("alert").filter({ hasText: PREFERENCES_INITIALIZATION_ERROR })).toBeVisible()
    await expect(page.getByRole("textbox")).toBeDisabled()
    expect(chatRequests).toBe(0)
    stalled = false
    held.forEach(release => release())
    await page.getByRole("button", { name: "重新加载保存设置", exact: true }).click()
    await expect(page.getByRole("textbox")).toBeEnabled()
    expect(bootstrapRequests).toBe(2)
  })
}

test("a queued visitor lock times out and a retry can bootstrap after release", async ({ page }) => {
  let bootstrapRequests = 0
  await page.clock.install()
  await page.addInitScript(() => {
    void navigator.locks.request("rayin-visitor-bootstrap", () => new Promise<void>(resolve => {
      window.addEventListener("release-bootstrap-lock", () => resolve(), { once: true })
    }))
  })
  await page.route("**/api/visitor-session", route => {
    bootstrapRequests += 1
    return route.fulfill({ json: { historyEnabled: true, consentVersion: null, consentedAt: null } })
  })
  await page.goto(`${baseUrl}/support`)
  await expect.poll(() => page.evaluate(() => navigator.locks.query().then(state => state.pending?.length))).toBe(1)
  await page.clock.fastForward(16_000)
  await expect(page.getByRole("alert").filter({ hasText: PREFERENCES_INITIALIZATION_ERROR })).toBeVisible()
  await expect(page.getByRole("textbox")).toBeDisabled()
  expect(bootstrapRequests).toBe(0)
  await page.evaluate(() => window.dispatchEvent(new Event("release-bootstrap-lock")))
  await page.getByRole("button", { name: "重新加载保存设置", exact: true }).click()
  await expect(page.getByRole("textbox")).toBeEnabled()
  expect(bootstrapRequests).toBe(1)
})
