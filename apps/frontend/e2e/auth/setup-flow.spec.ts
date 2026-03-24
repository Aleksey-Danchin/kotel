import { expect, test, type Page } from "@playwright/test";

const SETUP_SERVER_URL = "https://katel.localhost";
const SETUP_LOGIN = "katel_e2e_root";
const SETUP_PASSWORD = "katel_e2e_pass";

async function addServerViaOAuth(
  page: Page,
  serverUrl: string,
  login: string,
  password: string,
): Promise<void> {
  const sidebarForm = page
    .locator("form")
    .filter({ has: page.getByRole("button", { name: "Добавить сервер" }) })
    .first();

  await sidebarForm.getByPlaceholder("https://kotel.localhost").fill(serverUrl);
  const [popup] = await Promise.all([
    page.waitForEvent("popup"),
    sidebarForm.getByRole("button", { name: "Добавить сервер" }).click(),
  ]);
  await popup.getByLabel("Login").fill(login);
  await popup.getByLabel("Password").fill(password);
  await popup.getByRole("button", { name: "Submit" }).click();
  await expect.poll(() => popup.isClosed()).toBe(true);
}

// → docs/scenarios/web-setup/001-setup-init.md
test("setup page supports init lockout and OAuth login", async ({ page }) => {
  await page.goto("/setup");
  await expect(
    page.getByRole("heading", { name: "Первичная настройка сервера" }),
  ).toBeVisible();

  await page.locator("#setup-server-url").fill(SETUP_SERVER_URL);
  await page.getByRole("button", { name: "Check availability" }).click();

  const statusResponse = await page.request.get(`${SETUP_SERVER_URL}/api/setup/status`);
  expect(statusResponse.ok()).toBeTruthy();
  const statusBody = (await statusResponse.json()) as { available: boolean };

  if (statusBody.available) {
    const setupForm = page
      .locator("form")
      .filter({ has: page.getByRole("heading", { name: "Создать root пользователя" }) });
    await expect(setupForm).toBeVisible();
    await setupForm.getByPlaceholder("Логин").fill(SETUP_LOGIN);
    await setupForm.getByPlaceholder("Пароль").fill(SETUP_PASSWORD);
    await setupForm.getByPlaceholder("ФИО").fill("Katel E2E Root");
    await setupForm.getByRole("button", { name: "Инициализировать" }).click();
    const createdAlert = page.getByText("Root user создан. Теперь можно добавить сервер.");
    const configuredAlert = page.getByText("Сервер уже настроен. Перейдите к обычному логину.");
    await expect(createdAlert.or(configuredAlert)).toBeVisible();
    if (await createdAlert.isVisible()) {
      await page.getByRole("button", { name: "Add server" }).click();
    }
  } else {
    await expect(page.getByText("Сервер уже настроен. Перейдите к обычному логину.")).toBeVisible();
  }

  const lockoutResponse = await page.request.post(`${SETUP_SERVER_URL}/api/setup/init`, {
    data: {
      login: `blocked_${Date.now()}`,
      password: "blocked_password",
      fullname: "Blocked User",
    },
  });
  expect(lockoutResponse.status()).toBe(403);

  await page.goto("/session-test");
  await addServerViaOAuth(page, SETUP_SERVER_URL, SETUP_LOGIN, SETUP_PASSWORD);
  await expect(page.locator("li.card").filter({ hasText: SETUP_SERVER_URL })).toBeVisible();
});
