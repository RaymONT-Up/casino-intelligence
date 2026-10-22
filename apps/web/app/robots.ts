import { buildRobots, indexingMode } from "../lib/seo";
export const dynamic = "force-dynamic";
export default function robots() {
  const mode = indexingMode();
  if (!mode.on && mode.reason) console.warn(mode.reason);
  return buildRobots(mode);
}
