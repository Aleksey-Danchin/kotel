import { expect, test, type Page } from "@playwright/test";

const PRIMARY_SERVER = "https://kotel.localhost";
const SECONDARY_SERVER = "https://katel.localhost";
const PRIMARY_LOGIN = "kotel_e2e_root";
const PRIMARY_PASSWORD = "kotel_e2e_pass";
const SECONDARY_LOGIN = "katel_e2e_root";
const SECONDARY_PASSWORD = "katel_e2e_pass";

async function ensureSetupUser(
  page: Page,
  serverUrl: string,
  credentials: { login: string; password: string },
): Promise<void> {
  const statusResponse = await page.request.get(`${serverUrl}/api/setup/status`);
  expect(statusResponse.ok()).toBeTruthy();
  const statusBody = (await statusResponse.json()) as { available: boolean };

  if (!statusBody.available) {
    return;
  }

  const initResponse = await page.request.post(`${serverUrl}/api/setup/init`, {
    data: {
      login: credentials.login,
      password: credentials.password,
      fullname: credentials.login,
    },
  });
  if (initResponse.ok()) {
    return;
  }

  const nextStatusResponse = await page.request.get(`${serverUrl}/api/setup/status`);
  expect(nextStatusResponse.ok()).toBeTruthy();
  const nextStatusBody = (await nextStatusResponse.json()) as { available: boolean };
  expect(nextStatusBody.available).toBe(false);
}

async function addServerViaOAuth(
  page: Page,
  serverUrl: string,
  credentials: { login: string; password: string },
): Promise<void> {
  const sessionForm = page
    .locator("form")
    .filter({ has: page.getByRole("button", { name: "Add server" }) })
    .first();

  await sessionForm.getByPlaceholder("https://kotel.localhost").fill(serverUrl);
  const [popup] = await Promise.all([
    page.waitForEvent("popup"),
    sessionForm.getByRole("button", { name: "Add server" }).click(),
  ]);

  await popup.getByLabel("Login").fill(credentials.login);
  await popup.getByLabel("Password").fill(credentials.password);
  await popup.getByRole("button", { name: "Submit" }).click();
  await expect.poll(() => popup.isClosed()).toBe(true);
}

test("OAuth popup flow supports multi-server and invalid credentials", async ({
  page,
}) => {
  await page.goto("/session-test");
  await expect(page.getByRole("heading", { name: "Session test" })).toBeVisible();

  await ensureSetupUser(page, PRIMARY_SERVER, {
    login: PRIMARY_LOGIN,
    password: PRIMARY_PASSWORD,
  });
  await ensureSetupUser(page, SECONDARY_SERVER, {
    login: SECONDARY_LOGIN,
    password: SECONDARY_PASSWORD,
  });

  await addServerViaOAuth(page, PRIMARY_SERVER, {
    login: PRIMARY_LOGIN,
    password: PRIMARY_PASSWORD,
  });

  const primaryCard = page.locator("li.card").filter({ hasText: PRIMARY_SERVER });
  await expect(primaryCard).toBeVisible();
  await primaryCard.getByRole("button", { name: "Check status" }).click();
  await expect(primaryCard.getByText("sessionId:")).toBeVisible();

  await addServerViaOAuth(page, SECONDARY_SERVER, {
    login: SECONDARY_LOGIN,
    password: SECONDARY_PASSWORD,
  });

  await expect(page.locator("li.card").filter({ hasText: PRIMARY_SERVER })).toBeVisible();
  await expect(page.locator("li.card").filter({ hasText: SECONDARY_SERVER })).toBeVisible();
  await page
    .getByRole("button", { name: /kotel\.localhost .* ROOT/ })
    .first()
    .click();
  await page
    .getByRole("button", { name: /katel\.localhost .* ROOT/ })
    .first()
    .click();

  const sessionForm = page
    .locator("form")
    .filter({ has: page.getByRole("button", { name: "Add server" }) })
    .first();

  await sessionForm.getByPlaceholder("https://kotel.localhost").fill(PRIMARY_SERVER);
  const [invalidPopup] = await Promise.all([
    page.waitForEvent("popup"),
    sessionForm.getByRole("button", { name: "Add server" }).click(),
  ]);
  await invalidPopup.getByLabel("Login").fill(PRIMARY_LOGIN);
  await invalidPopup.getByLabel("Password").fill("wrong-password");
  await invalidPopup.getByRole("button", { name: "Submit" }).click();
  await expect(invalidPopup.getByRole("alert")).toContainText("Invalid credentials");
  await invalidPopup.close();
});
