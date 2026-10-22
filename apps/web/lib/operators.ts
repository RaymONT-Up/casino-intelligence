import type { PublishedResearch } from "./server";
export function publishedDirectory(records: PublishedResearch) {
  const record = records.find((r) => r.payload.kind === "directory");
  return record && record.payload.kind === "directory"
    ? { record, operators: record.payload.operators }
    : null;
}
export function findOperator(records: PublishedResearch, slug: string) {
  const directory = publishedDirectory(records);
  const operator = directory?.operators.find((o) => o.slug === slug);
  return directory && operator
    ? { directory: directory.record, operator }
    : null;
}
