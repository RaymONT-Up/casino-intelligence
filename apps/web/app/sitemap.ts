import { api, type PublishedResearch } from "../lib/server";
import { buildSitemap, indexingMode } from "../lib/seo";
export const dynamic = "force-dynamic";
export default async function sitemap() {
  const mode = indexingMode();
  // A misconfigured switch is reported, not hidden behind an empty sitemap.
  if (!mode.on && mode.reason) throw new Error(mode.reason);
  if (!mode.on) return [];
  return buildSitemap(mode, await api<PublishedResearch>("/research"));
}
