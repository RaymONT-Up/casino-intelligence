import { test, expect } from "@playwright/test";
test("indexing stays off by default", async ({ page, request }) => {
  const robots = await request.get("/robots.txt");
  expect(robots.status()).toBe(200);
  const text = await robots.text();
  expect(text).toMatch(/^Disallow: \/$/m);
  expect(text).not.toMatch(/Allow:|Sitemap:/);
  const sitemap = await request.get("/sitemap.xml");
  expect(sitemap.status()).toBe(200);
  expect(await sitemap.text()).not.toContain("/casinos/");
  for (const path of [
    "/",
    "/casinos",
    "/casinos/bet99",
    "/workflow",
    "/admin",
    "/no-such-page",
  ]) {
    await page.goto(path);
    const robotsMeta = await page
      .locator('meta[name="robots"]')
      .evaluateAll((nodes) => nodes.map((n) => n.getAttribute("content")));
    expect(robotsMeta.length, path).toBeGreaterThan(0);
    for (const content of robotsMeta) expect(content, path).toMatch(/noindex/);
    await expect(
      page.locator('script[type="application/ld+json"]'),
    ).toHaveCount(0);
  }
});
