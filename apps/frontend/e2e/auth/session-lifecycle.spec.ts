import { expect, test, type Page } from "@playwright/test";

const SERVER_URL = "https://kotel.localhost";
const LOGIN = "kotel_e2e_root";
const PASSWORD = "kotel_e2e_pass";

async function ensureSetupUser(page: Page): Promise<void> {
  const statusResponse = await page.request.get(`${SERVER_URL}/api/setup/status`);
  expect(statusResponse.ok()).toBeTruthy();
  const statusBody = (await statusResponse.json()) as { available: boolean };
  if (!statusBody.available) {
    return;
  }

  const initResponse = await page.request.post(`${SERVER_URL}/api/setup/init`, {
    data: {
      login: LOGIN,
      password: PASSWORD,
      fullname: "Kotel E2E Root",
    },
  });
  if (initResponse.ok()) {
    return;
  }

  const nextStatusResponse = await page.request.get(`${SERVER_URL}/api/setup/status`);
  expect(nextStatusResponse.ok()).toBeTruthy();
  const nextStatusBody = (await nextStatusResponse.json()) as { available: boolean };
  expect(nextStatusBody.available).toBe(false);
}

async function addServerViaOAuth(page: Page): Promise<void> {
  const sessionForm = page
    .locator("form")
    .filter({ has: page.getByRole("button", { name: "Add server" }) })
    .first();

  await sessionForm.getByPlaceholder("https://kotel.localhost").fill(SERVER_URL);
  const [popup] = await Promise.all([
    page.waitForEvent("popup"),
    sessionForm.getByRole("button", { name: "Add server" }).click(),
  ]);
  await popup.getByLabel("Login").fill(LOGIN);
  await popup.getByLabel("Password").fill(PASSWORD);
  await popup.getByRole("button", { name: "Submit" }).click();
  await expect.poll(() => popup.isClosed()).toBe(true);
}

// → docs/scenarios/web-session/001-session-lifecycle.md
test("session lifecycle: refresh, logout, and logout all devices", async ({
  browser,
  page,
}) => {
  await page.goto("/session-test");
  await ensureSetupUser(page);
  await addServerViaOAuth(page);

  const card = page.locator("li.card").filter({ hasText: SERVER_URL });
  await expect(card).toBeVisible();

  const statusBefore = await page.request.get(`${SERVER_URL}/api/session/status`);
  expect(statusBefore.ok()).toBeTruthy();

  await card.getByRole("button", { name: "Force refresh" }).click();
  await card.getByRole("button", { name: "Check status" }).click();
  await expect(card.getByText("sessionId:")).toBeVisible();

  const secondContext = await browser.newContext({ ignoreHTTPSErrors: true });
  const secondPage = await secondContext.newPage();
  await secondPage.goto("/session-test");
  await addServerViaOAuth(secondPage);

  const secondStatusBefore = await secondPage.request.get(`${SERVER_URL}/api/session/status`);
  expect(secondStatusBefore.ok()).toBeTruthy();

  await card.getByRole("button", { name: "Logout all devices" }).click();
  await expect(page.locator("li.card").filter({ hasText: SERVER_URL })).toHaveCount(0);

  const secondStatusAfter = await secondPage.request.get(`${SERVER_URL}/api/session/status`);
  expect(secondStatusAfter.status()).toBe(401);

  await addServerViaOAuth(page);
  const reloginCard = page.locator("li.card").filter({ hasText: SERVER_URL });
  await reloginCard.getByRole("button", { name: "Logout", exact: true }).click();
  await expect(page.locator("li.card").filter({ hasText: SERVER_URL })).toHaveCount(0);
  const statusAfterSingleLogout = await page.request.get(`${SERVER_URL}/api/session/status`);
  expect(statusAfterSingleLogout.status()).toBe(401);

  await secondContext.close();
});
