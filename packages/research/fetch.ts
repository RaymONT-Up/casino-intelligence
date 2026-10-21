import { assertPublicTarget } from "./network";
import { sourceDefinitions, type SourceId, type Observation } from "./model";
export async function fetchSource(id: SourceId): Promise<Observation> {
  if (id === "northstar-terms") return fetchRenderedTerms();
  const source = sourceDefinitions.find((s) => s.id === id)!;
  let url: string = source.url;
  const redirects: string[] = [];
  try {
    for (let hop = 0; hop < 4; hop++) {
      await assertPublicTarget(url, source.hosts);
      const response = await fetch(url, {
        redirect: "manual",
        signal: AbortSignal.timeout(20000),
        headers: {
          "User-Agent":
            "CasinoIntelligenceResearch/0.2 (local source research)",
          Accept: "text/html",
        },
      });
      if (response.status >= 300 && response.status < 400) {
        const location = response.headers.get("location");
        if (!location) throw new Error("Redirect has no location");
        url = new URL(location, url).href;
        redirects.push(url);
        await response.body?.cancel();
        continue;
      }
      if (!response.ok) {
        await response.body?.cancel();
        return {
          raw: "",
          finalUrl: url,
          httpStatus: response.status,
          method: "http-html/v1",
          redirects,
          error: `Source returned HTTP ${response.status}`,
        };
      }
      if (!response.headers.get("content-type")?.includes("text/html")) {
        await response.body?.cancel();
        throw new Error("Expected HTML source");
      }
      const reader = response.body!.getReader();
      const chunks: Uint8Array[] = [];
      let size = 0;
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        size += value.length;
        if (size > 2_000_000) {
          await reader.cancel();
          throw new Error("Source exceeds 2 MB capture limit");
        }
        chunks.push(value);
      }
      return {
        raw: Buffer.concat(chunks).toString("utf8"),
        finalUrl: url,
        httpStatus: response.status,
        method: "http-html/v1",
        redirects,
      };
    }
    throw new Error("Too many redirects");
  } catch (error) {
    return {
      raw: "",
      finalUrl: url,
      httpStatus: 0,
      method: "http-html/v1",
      redirects,
      error: error instanceof Error ? error.message : "Capture failed",
    };
  }
}
async function fetchRenderedTerms(): Promise<Observation> {
  const url = sourceDefinitions.find((s) => s.id === "northstar-terms")!.url;
  let browser;
  try {
    const { chromium } = await import("playwright");
    browser = await chromium.launch();
    const context = await browser.newContext({
      serviceWorkers: "block",
      acceptDownloads: false,
    });
    const navigationHosts = ["www.northstarbets.ca", "northstarbets.ca"];
    const resourceHosts = [
      ...navigationHosts,
      "oapi-cur.techonlinecorp.com",
      "login.northstarbets.ca",
      "widgets.northstarbets.ca",
    ];
    await context.route("**/*", async (route) => {
      const request = route.request();
      try {
        if (["image", "font", "media"].includes(request.resourceType()))
          return await route.abort();
        const hosts = request.isNavigationRequest()
          ? navigationHosts
          : resourceHosts;
        await assertPublicTarget(request.url(), hosts);
        const response = await route.fetch({ maxRedirects: 0, timeout: 15000 });
        const location = response.headers()["location"];
        if (response.status() >= 300 && response.status() < 400 && location)
          await assertPublicTarget(
            new URL(location, request.url()).href,
            hosts,
          );
        await route.fulfill({ response });
      } catch {
        await route.abort().catch(() => {});
      }
    });
    await context.routeWebSocket("**/*", (socket) => socket.close());
    const page = await context.newPage();
    const response = await page.goto(url, {
      waitUntil: "domcontentloaded",
      timeout: 25000,
    });
    if (!response?.ok())
      throw new Error(`Source returned HTTP ${response?.status() ?? 0}`);
    await page
      .locator("body")
      .filter({ hasText: "1.02 Eligibility and Location" })
      .waitFor({ timeout: 15000 });
    if (
      !["www.northstarbets.ca", "northstarbets.ca"].includes(
        new URL(page.url()).hostname,
      )
    )
      throw new Error("Unexpected navigation destination");
    const raw = await page.content();
    if (Buffer.byteLength(raw) > 2_000_000)
      throw new Error("Rendered document too large");
    return {
      raw,
      finalUrl: page.url(),
      httpStatus: response?.status() ?? 0,
      method: "playwright-chromium/northstar-v1",
      redirects: page.url() === url ? [] : [page.url()],
    };
  } catch (error) {
    return {
      raw: "",
      finalUrl: url,
      httpStatus: 0,
      method: "playwright-chromium/northstar-v1",
      redirects: [],
      error: error instanceof Error ? error.message : "Browser capture failed",
    };
  } finally {
    await browser?.close();
  }
}
