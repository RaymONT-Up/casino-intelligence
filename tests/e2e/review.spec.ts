import { test, expect } from "@playwright/test";
test("real-source workflow keeps pending observations private and records decisions", async ({
  page,
}) => {
  await page.goto("/");
  await expect(
    page.getByRole("heading", { name: /Online casino operators in Ontario/ }),
  ).toBeVisible();
  await expect(page.getByText("FICTIONAL DATA")).toHaveCount(0);
  await page
    .getByRole("searchbox", { name: "Search operators" })
    .fill("betmgm");
  await expect(page.locator(".research-table tbody tr")).toHaveCount(1);
  await expect(page.locator(".research-table tbody tr")).toContainText(
    "BetMGM Casino",
  );
  await page
    .getByRole("searchbox", { name: "Search operators" })
    .fill("no such operator");
  await expect(page.getByText("No operators match")).toBeVisible();
  await page.getByRole("searchbox", { name: "Search operators" }).clear();
  await expect(page.locator(".research-table tbody tr")).toHaveCount(5);
  await page.screenshot({
    path: "test-results/research-home.png",
    fullPage: true,
  });
  await page.goto("/casinos/northstar-bets");
  await expect(page.getByTestId("claim-Minimum account age")).toHaveText("19");
  await page.goto("/admin");
  await page.getByLabel("Editor password").fill(process.env.ADMIN_PASSWORD!);
  await page.getByRole("button", { name: "Enter workspace" }).click();
  await expect(
    page.getByRole("heading", { name: "Collection & review" }),
  ).toBeVisible();
  await page
    .getByTestId("source-northstar-terms")
    .getByRole("button", { name: "Collect source" })
    .click();
  await expect(page.locator(".review-detail h2")).toHaveText("northstar-terms");
  await page.getByRole("button", { name: "Read saved copies" }).click();
  await expect(page.locator(".saved-source").first()).toContainText(
    "at least 19 years",
  );
  await expect(page.locator(".saved-source").last()).toContainText(
    "at least 21 years",
  );
  const publicPage = await page.context().newPage();
  await publicPage.goto("/casinos/northstar-bets");
  await expect(publicPage.getByTestId("claim-Minimum account age")).toHaveText(
    "19",
  );
  await page
    .getByLabel("Decision rationale")
    .fill("Confirmed the changed age in the isolated test source.");
  await page.getByRole("button", { name: "Approve & publish" }).click();
  await expect(page.getByRole("status")).toContainText("Approved.");
  await publicPage.reload();
  await expect(publicPage.getByTestId("claim-Minimum account age")).toHaveText(
    "21",
  );
  await publicPage.close();
  await page
    .getByTestId("source-igo-directory")
    .getByRole("button", { name: "Collect source" })
    .click();
  await expect(page.locator(".review-detail h2")).toHaveText("igo-directory");
  await page.screenshot({
    path: "test-results/research-workspace.png",
    fullPage: true,
  });
  await page
    .getByLabel("Decision rationale")
    .fill("Reject changed operator identity for test coverage.");
  await page.getByRole("button", { name: "Reject change" }).click();
  await expect(page.getByRole("status")).toContainText("Rejected.");
  await page
    .getByTestId("source-northstar-home")
    .getByRole("button", { name: "Collect source" })
    .click();
  await expect(page.getByRole("status")).toContainText("HTTP 403");
  await expect(page.locator(".log-row .error")).toContainText(["HTTP 403"]);
  await page.goto("/casinos/bet99");
  await expect(
    page.getByText("Test Operator 0 A", { exact: true }).first(),
  ).toBeVisible();
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/");
  await expect(
    page.getByRole("heading", { name: /Online casino operators in Ontario/ }),
  ).toBeVisible();
  await page.screenshot({
    path: "test-results/research-mobile.png",
    fullPage: true,
  });
});
test("write routes enforce origin and session", async ({ request }) => {
  const data = {
    action: "research-collect",
    payload: { sourceId: "igo-directory" },
  };
  expect(
    (
      await request.post("/api/editor", {
        data,
        headers: { origin: "https://attacker.example" },
      })
    ).status(),
  ).toBe(403);
  expect(
    (
      await request.post("/api/editor", {
        data,
        headers: { origin: "http://127.0.0.1:3001" },
      })
    ).status(),
  ).toBe(401);
});
