import type { PublishedResearch } from "./server";
import { publishedDirectory } from "./operators";
type Env = Record<string, string | undefined>;
type Mode = { on: true; origin: string } | { on: false; reason?: string };
const reserved = [
  "local",
  "localhost",
  "internal",
  "test",
  "example",
  "invalid",
  "lan",
  "home.arpa",
];
// A public origin is https with a plain DNS name ending in a letter-based zone (this
// rules out IP literals): no single-label or trailing-dot host, no reserved or
// internal zone, no credentials.
const dnsName = /^[a-z0-9-]+(\.[a-z0-9-]+)*\.[a-z][a-z0-9-]*[a-z0-9]$/;
function isPublicOrigin(url: URL) {
  const host = url.hostname;
  return (
    url.protocol === "https:" &&
    !url.username &&
    !url.password &&
    dnsName.test(host) &&
    !reserved.some((zone) => host === zone || host.endsWith(`.${zone}`))
  );
}
// Indexing is OFF unless SEO_INDEXING is exactly "enabled" and APP_ORIGIN is a public
// https origin. A misconfigured switch fails closed (OFF) and reports why.
export function indexingMode(env: Env = process.env): Mode {
  if (env.SEO_INDEXING !== "enabled") return { on: false };
  const reason =
    "SEO_INDEXING is enabled but APP_ORIGIN is not a public https origin";
  try {
    const url = new URL(env.APP_ORIGIN ?? "");
    if (!isPublicOrigin(url)) return { on: false, reason };
    return { on: true, origin: url.origin };
  } catch {
    return { on: false, reason };
  }
}
export const robotsMeta = (mode: Mode) =>
  mode.on ? { index: true, follow: true } : { index: false, follow: false };
export function buildRobots(mode: Mode) {
  if (!mode.on) return { rules: { userAgent: "*", disallow: "/" } };
  return {
    rules: {
      userAgent: "*",
      allow: "/",
      disallow: ["/admin", "/api/"],
    },
    sitemap: `${mode.origin}/sitemap.xml`,
  };
}
type SitemapEntry = { url: string; lastModified?: string | Date };
export function buildSitemap(
  mode: Mode,
  records: PublishedResearch,
): SitemapEntry[] {
  if (!mode.on) return [];
  const directory = publishedDirectory(records);
  const lastModified = directory?.record.capturedAt;
  return [
    { url: `${mode.origin}/`, lastModified },
    { url: `${mode.origin}/casinos`, lastModified },
    ...(directory?.operators ?? []).map((o) => ({
      url: `${mode.origin}/casinos/${encodeURIComponent(o.slug)}`,
      lastModified,
    })),
  ].map((entry) => (entry.lastModified ? entry : { url: entry.url }));
}
const site = (origin: string) => ({
  "@type": "WebSite",
  name: "Casino Intelligence",
  url: origin,
});
// Only confirmed fields: brand name, legal operator as listed by iGO, capture time.
// No ratings, offers, licences or bonus claims.
export function operatorJsonLd(
  origin: string,
  records: PublishedResearch,
  slug: string,
) {
  const directory = publishedDirectory(records);
  const operator = directory?.operators.find((o) => o.slug === slug);
  if (!directory || !operator) return null;
  return {
    "@context": "https://schema.org",
    "@type": "WebPage",
    name: operator.name,
    url: `${origin}/casinos/${encodeURIComponent(operator.slug)}`,
    dateModified: directory.record.capturedAt,
    about: { "@type": "Organization", name: operator.operator },
    isPartOf: site(origin),
  };
}
export function directoryJsonLd(origin: string, records: PublishedResearch) {
  const directory = publishedDirectory(records);
  if (!directory) return null;
  return {
    "@context": "https://schema.org",
    "@type": "CollectionPage",
    name: "Online casino operators in Ontario",
    url: `${origin}/casinos`,
    dateModified: directory.record.capturedAt,
    isPartOf: site(origin),
    mainEntity: {
      "@type": "ItemList",
      itemListElement: directory.operators.map((o, index) => ({
        "@type": "ListItem",
        position: index + 1,
        name: o.name,
        url: `${origin}/casinos/${encodeURIComponent(o.slug)}`,
      })),
    },
  };
}
// Source text is untrusted: escape everything that can end or alter a script block.
export const serializeJsonLd = (data: unknown) =>
  JSON.stringify(data)
    .replace(/</g, "\\u003c")
    .replace(/>/g, "\\u003e")
    .replace(/&/g, "\\u0026")
    .replace(/\u2028/g, "\\u2028")
    .replace(/\u2029/g, "\\u2029");
