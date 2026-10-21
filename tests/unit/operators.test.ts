import { describe, it, expect } from "vitest";
import { findOperator } from "../../apps/web/lib/operators";
import type { PublishedResearch } from "../../apps/web/lib/server";
const record = (payload: unknown) =>
  ({
    sourceId: "igo-directory",
    payload,
  }) as unknown as PublishedResearch[number];
const directory = record({
  kind: "directory",
  operators: [{ slug: "bet99", name: "Bet99", operator: "Legal Entity Ltd." }],
});
describe("casino page operator lookup", () => {
  it("returns the brand name separately from the legal operator", () => {
    const found = findOperator([directory], "bet99");
    expect(found?.operator.name).toBe("Bet99");
    expect(found?.operator.operator).toBe("Legal Entity Ltd.");
  });
  it("returns null for an unknown slug", () => {
    expect(findOperator([directory], "unknown-slug")).toBeNull();
  });
  it("returns null when nothing is published or only documents exist", () => {
    expect(findOperator([], "bet99")).toBeNull();
    expect(findOperator([record({ kind: "document" })], "bet99")).toBeNull();
  });
});
