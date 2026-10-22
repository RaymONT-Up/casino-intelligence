import { describe, it, expect } from "vitest";
import {
  indexingMode,
  robotsMeta,
  buildRobots,
  buildSitemap,
  operatorJsonLd,
  directoryJsonLd,
  serializeJsonLd,
} from "../../apps/web/lib/seo";
import type { PublishedResearch } from "../../apps/web/lib/server";
const record = (payload: unknown) =>
  ({
    sourceId: "igo-directory",
    capturedAt: "2026-10-21T07:27:25.000Z",
    payload,
  }) as unknown as PublishedResearch[number];
const records = [
  record({
    kind: "directory",
    operators: [
      { slug: "bet99", name: "Bet99", operator: "Legal Entity Ltd." },
      { slug: "a b", name: "Space Name", operator: "Other Ltd." },
    ],
  }),
];
const on = { SEO_INDEXING: "enabled", APP_ORIGIN: "https://example.com/path" };
describe("indexing switch", () => {
  it.each([
    {},
    { SEO_INDEXING: "" },
    { SEO_INDEXING: "true" },
    { SEO_INDEXING: "ENABLED" },
    { SEO_INDEXING: "disabled", APP_ORIGIN: "https://example.com" },
  ])("is off for %j", (env) => expect(indexingMode(env).on).toBe(false));
  it.each([
    "https://example.com",
    "https://www.example.co.uk",
    "https://xn--e1afmkfd.xn--p1ai",
  ])("accepts a public https origin %s", (origin) =>
    expect(
      indexingMode({ SEO_INDEXING: "enabled", APP_ORIGIN: origin }).on,
    ).toBe(true),
  );
  it("is on only for the exact value and a public https origin", () => {
    expect(indexingMode(on)).toEqual({
      on: true,
      origin: "https://example.com",
    });
  });
  it.each([
    "http://example.com",
    "https://localhost:3000",
    "https://127.0.0.1",
    "https://127.0.0.2",
    "https://10.0.0.5",
    "https://192.168.1.10",
    "https://169.254.169.254",
    "https://[::1]",
    "https://[::ffff:7f00:1]",
    "https://localhost.",
    "https://app.localhost",
    "https://printer.local",
    "https://svc.internal",
    "https://intranet",
    "https://example.test",
    "https://user:pass@example.com",
    "not a url",
    undefined,
  ])("fails closed and explains when APP_ORIGIN is %s", (origin) => {
    const mode = indexingMode({ SEO_INDEXING: "enabled", APP_ORIGIN: origin });
    expect(mode.on).toBe(false);
    expect(mode.on === false && mode.reason).toMatch(/APP_ORIGIN/);
  });
});
describe("robots and sitemap", () => {
  it("keeps the legacy output when off", () => {
    const off = indexingMode({});
    expect(buildRobots(off)).toEqual({
      rules: { userAgent: "*", disallow: "/" },
    });
    expect(robotsMeta(off)).toEqual({ index: false, follow: false });
    expect(buildSitemap(off, records)).toEqual([]);
  });
  it("allows crawling but never the admin area when on", () => {
    const mode = indexingMode(on);
    const robots = buildRobots(mode);
    expect(robots.rules.disallow).toEqual(["/admin", "/api/"]);
    expect(robots.sitemap).toBe("https://example.com/sitemap.xml");
    expect(robotsMeta(mode)).toEqual({ index: true, follow: true });
  });
  it("lists only published operators with the capture time", () => {
    const urls = buildSitemap(indexingMode(on), records).map((e) => e.url);
    expect(urls).toEqual([
      "https://example.com/",
      "https://example.com/casinos",
      "https://example.com/casinos/bet99",
      "https://example.com/casinos/a%20b",
    ]);
    expect(buildSitemap(indexingMode(on), records)[0].lastModified).toBe(
      "2026-10-21T07:27:25.000Z",
    );
  });
  it("does not invent URLs or dates without a published directory", () => {
    const entries = buildSitemap(indexingMode(on), [
      record({ kind: "document" }),
    ]);
    expect(entries).toEqual([
      { url: "https://example.com/" },
      { url: "https://example.com/casinos" },
    ]);
  });
});
describe("structured data", () => {
  it("uses confirmed fields only", () => {
    const data = operatorJsonLd("https://example.com", records, "bet99")!;
    expect(data.name).toBe("Bet99");
    expect(data.about.name).toBe("Legal Entity Ltd.");
    const text = JSON.stringify([
      data,
      directoryJsonLd("https://example.com", records),
    ]);
    for (const word of [
      "Review",
      "Rating",
      "Offer",
      "license",
      "licence",
      "bonus",
      "trusted",
      "safe",
      "best",
    ])
      expect(text).not.toContain(word);
  });
  it("returns nothing for an unknown slug or missing directory", () => {
    expect(operatorJsonLd("https://example.com", records, "nope")).toBeNull();
    expect(directoryJsonLd("https://example.com", [])).toBeNull();
  });
  it("escapes source text so it cannot end the script block", () => {
    const text = serializeJsonLd({ name: "</script><script>alert(1)&\u2028" });
    expect(text).not.toMatch(/[<>&\u2028]/);
    expect(JSON.parse(text).name).toBe("</script><script>alert(1)&\u2028");
  });
});
