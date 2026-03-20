import { expect, test } from "@playwright/test";

test("session test page signs in, checks and signs out", async ({ page }) => {
  await page.goto("/session-test");

  await page.getByRole("button", { name: "signin" }).click();
  await expect(page.getByRole("status")).toContainText("Запрос выполняется...");
  await expect(page.getByTestId("session-state")).toContainText("\"fullname\": \"User 1\"");

  await page.getByRole("button", { name: "check" }).click();
  await expect(page.getByTestId("session-state")).toContainText("\"fullname\": \"User 1\"");

  await page.getByRole("button", { name: "signout" }).click();
  await expect(page.getByTestId("session-state")).toContainText("null");
});
