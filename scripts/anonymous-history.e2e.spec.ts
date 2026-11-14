import { expect, test } from "@playwright/test"

const baseUrl = process.env.CHAT_TEST_BASE_URL ?? "http://localhost:3100"
test.use({ channel: process.env.CHAT_TEST_BROWSER_CHANNEL })
test.skip(process.env.ANONYMOUS_HISTORY_E2E !== "1", "Requires a disposable database and synthetic upstream")

test("an anonymous browser saves, resumes, isolates and deletes history", async ({ page, browser }) => {
  await page.setViewportSize({ width: 390, height: 844 })
  await page.goto(`${baseUrl}/support`)
  const input = page.getByRole("textbox")
  await expect(input).toBeEnabled()
  const cookie = (await page.context().cookies()).find(cookie => cookie.name === "rayin-visitor")
  expect(cookie?.httpOnly).toBe(true)
  expect(cookie?.sameSite).toBe("Lax")
  await input.fill("Synthetic recovery fixture")
  const chatRequest = page.waitForRequest(request => new URL(request.url()).pathname === "/api/chat")
  await input.press("Enter")
  expect((await chatRequest).postDataJSON().persistence).toBe("saved")
  await expect(page.getByText("Synthetic stored reply.", { exact: true })).toBeVisible()
  await expect(input).toBeEnabled()
  const history = await page.request.get(`${baseUrl}/api/conversations`)
  const { conversations } = await history.json() as { conversations: { id: string }[] }
  expect(conversations).toHaveLength(1)
  const id = conversations[0].id
  const secondTab = await page.context().newPage()
  await secondTab.goto(`${baseUrl}/support?conversation=${encodeURIComponent(id)}`)
  await expect(secondTab.getByText("Synthetic recovery fixture", { exact: true })).toBeVisible()
  await expect(secondTab.getByText("Synthetic stored reply.", { exact: true })).toBeVisible()
  expect(await secondTab.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true)
  const otherContext = await browser.newContext()
  try {
    const stranger = await otherContext.newPage()
    await stranger.goto(`${baseUrl}/support`)
    await expect(stranger.getByRole("textbox")).toBeEnabled()
    expect((await stranger.request.get(`${baseUrl}/api/conversations/${id}`)).status()).toBe(404)
  } finally { await otherContext.close() }
  await secondTab.goto(`${baseUrl}/conversations`)
  await expect(secondTab.locator("li")).toHaveCount(1)
  secondTab.on("dialog", dialog => dialog.accept())
  await secondTab.locator("li button").click()
  await expect(secondTab.locator("li")).toHaveCount(0)
  expect((await secondTab.request.get(`${baseUrl}/api/conversations/${id}`)).status()).toBe(404)
})

test("a bootstrap failure cannot silently fall back to an unsaved chat", async ({ page }) => {
  let chatRequests = 0
  await page.route("**/api/visitor-session", route => route.fulfill({ status: 503,
    contentType: "application/json", body: JSON.stringify({ error: "Synthetic persistence failure" }),
  }))
  page.on("request", request => { if (new URL(request.url()).pathname === "/api/chat") chatRequests += 1 })
  await page.goto(`${baseUrl}/support`)
  const input = page.getByRole("textbox")
  await expect(input).toBeEnabled()
  await input.fill("Synthetic failure fixture")
  await input.press("Enter")
  await expect(page.getByRole("alert").filter({ hasText: "Synthetic persistence failure" })).toContainText("Synthetic persistence failure")
  expect(chatRequests).toBe(0)
})

test("concurrent first-visit tabs share a visitor instead of overwriting credentials", async ({ context }) => {
  const first = await context.newPage()
  const second = await context.newPage()
  await Promise.all([first.goto(`${baseUrl}/support`), second.goto(`${baseUrl}/support`)])
  await expect(first.getByRole("textbox")).toBeEnabled()
  await expect(second.getByRole("textbox")).toBeEnabled()
  const responses = await Promise.all([first, second].map(page => page.request.post(`${baseUrl}/api/conversations`, {
    data: { mode: "companion" },
  })))
  expect(responses.map(response => response.status())).toEqual([201, 201])
  const { conversations } = await (await first.request.get(`${baseUrl}/api/conversations`)).json() as { conversations: { id: string }[] }
  expect(conversations).toHaveLength(2)
  expect((await context.cookies()).filter(cookie => cookie.name === "rayin-visitor")).toHaveLength(1)
  for (const conversation of conversations) {
    expect((await first.request.delete(`${baseUrl}/api/conversations/${conversation.id}`)).status()).toBe(204)
  }
})
