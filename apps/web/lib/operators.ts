import type { PublishedResearch } from "./server";
export function findOperator(records: PublishedResearch, slug: string) {
  const directory = records.find((r) => r.payload.kind === "directory");
  if (!directory || directory.payload.kind !== "directory") return null;
  const operator = directory.payload.operators.find((o) => o.slug === slug);
  return operator ? { directory, operator } : null;
}
