import { hash } from "../domain";
import { load } from "cheerio";
import { z } from "zod";
import { trackedBrands, type ResearchPayload, type Operator } from "./model";
const operatorSchema = z.object({
  slug: z.string().min(1),
  name: z.string().min(1),
  operator: z.string().min(1),
  website: z.url().refine((url) => new URL(url).protocol === "https:"),
  categories: z.array(z.string()).min(1),
  jurisdiction: z.literal("CA-ON"),
  sourceAsOf: z.string().min(1),
  excerpt: z.string(),
  locator: z.string(),
});
export function parseDirectory(raw: string): ResearchPayload {
  const $ = load(raw);
  $("script,style,noscript").remove();
  const text = $("body").text().replace(/\s+/g, " ");
  const sourceAsOf = text
    .match(/listing is accurate as of\s+([^\.]+)\./i)?.[1]
    ?.trim();
  if (!sourceAsOf)
    throw new Error(
      "Directory freshness date missing; source layout needs review",
    );
  const operators: Operator[] = [];
  const rows = $("li.operator-item");
  if (rows.length < 5)
    throw new Error(
      "Incomplete directory response; refusing to infer removals",
    );
  rows.each((_index, element) => {
    const row = $(element);
    const link = row.find(".views-field-title-1 a");
    const name = link
      .text()
      .trim()
      .replace(/^Play\s+/, "");
    if (!trackedBrands.includes(name)) return;
    const operator = row
      .closest("ul.operator-list-operators")
      .parent()
      .children("h3")
      .text()
      .trim();
    const categories = row
      .find(".views-field-field-offerings li")
      .map((_i, e) => $(e).text().trim())
      .get();
    operators.push(
      operatorSchema.parse({
        slug: name.toLowerCase().replace(/[^a-z0-9]+/g, "-"),
        name,
        operator,
        website: link.attr("href"),
        categories,
        jurisdiction: "CA-ON",
        sourceAsOf,
        excerpt: `${operator} / ${name} / ${categories.join(", ")}`,
        locator: `li.operator-item: ${name}`,
      }),
    );
  });
  if (
    operators.length !== trackedBrands.length ||
    new Set(operators.map((o) => o.slug)).size !== operators.length
  )
    throw new Error(
      "Tracked operator missing or duplicated; manual source review required",
    );
  return {
    parserVersion: "igo-directory/v1",
    kind: "directory",
    operators: operators.sort((a, b) => a.slug.localeCompare(b.slug)),
    sourceAsOf,
    totalListed: rows.length,
  };
}
export function parseDocument(raw: string, sourceUrl: string): ResearchPayload {
  const $ = load(raw);
  const title = $("title").text().trim();
  $("script,style,noscript,iframe").remove();
  const text = $("body").text().replace(/\s+/g, " ").trim();
  const unavailable =
    text.length < 150 ||
    /access denied|verify you are human|not available in your (region|location)|just a moment/i.test(
      `${title} ${text.slice(0, 1000)}`,
    );
  const links: { label: string; url: string }[] = [];
  $("a[href]").each((_i, e) => {
    const label = $(e).text().trim();
    const href = $(e).attr("href")!;
    if (!/terms|privacy|responsible|complaint/i.test(`${label} ${href}`))
      return;
    try {
      const url = new URL(href, sourceUrl);
      if (url.protocol === "https:" && !links.some((l) => l.url === url.href))
        links.push({ label: label || url.pathname, url: url.href });
    } catch {
      /* malformed source link */
    }
  });
  const claims: {
    field: string;
    value: string;
    excerpt: string;
    location: string;
  }[] = [];
  if (sourceUrl.includes("/terms-conditions") && !unavailable) {
    const age = text.match(/You are at least (\d+) years of age/i);
    if (age)
      claims.push({
        field: "Minimum account age",
        value: age[1],
        excerpt: `at least ${age[1]} years of age`,
        location: `Normalized body characters ${age.index}-${(age.index ?? 0) + age[0].length}`,
      });
    const locationMatch = text.match(
      /only play Games while physically in Ontario/i,
    );
    if (locationMatch)
      claims.push({
        field: "Location required to play",
        value: "Ontario",
        excerpt: "only play Games while physically in Ontario",
        location: `Normalized body characters ${locationMatch.index}-${(locationMatch.index ?? 0) + locationMatch[0].length}`,
      });
  }
  return {
    parserVersion: "source-document/v2",
    kind: "document",
    document: {
      title,
      textLength: text.length,
      textHash: hash(text),
      excerpt:
        unavailable || claims.length
          ? ""
          : text.split(/\s+/).slice(0, 18).join(" "),
      claims,
      links: links.slice(0, 12),
      status: unavailable ? "unavailable" : "observed",
      ...(unavailable
        ? {
            reason:
              "Readable content unavailable. JavaScript, access restrictions or source layout may be responsible; no terms inferred.",
          }
        : {}),
    },
  };
}
