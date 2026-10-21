import { describe, it, expect } from "vitest";
import { normalize, diff } from "../../packages/domain";
import { fixture } from "../../fixtures/catalog";
describe("normalization and comparison", () => {
  it("normalizes decimal strings into integer minor units", () => {
    expect(normalize({ ...fixture("v1"), bonus: "125.49" }).bonusMinor).toBe(
      12549,
    );
    expect(normalize(fixture("v1")).wagering).toBe(35);
  });
  it.each([
    null,
    { ...fixture("v1"), bonus: 1.005 },
    {},
    { ...fixture("v1"), wagering: null },
    { ...fixture("v1"), bonus: "" },
    { ...fixture("v1"), wagering: -1 },
    { ...fixture("v1"), jurisdiction: "CA" },
    fixture("invalid"),
  ])("rejects missing or invalid source %j", (raw) =>
    expect(() => normalize(raw)).toThrow(),
  );
  it("does not invent a license claim", () =>
    expect(normalize(fixture("v1")).licenseStatus).toBe("not_checked"));
  it("distinguishes no change, single change and multiple changes", () => {
    const baseline = normalize(fixture("v1"));
    expect(diff(baseline, normalize(fixture("v1")))).toEqual([]);
    expect(diff(baseline, normalize(fixture("v2")))).toEqual([
      { field: "wagering", before: 35, after: 40 },
    ]);
    expect(
      diff(baseline, { ...baseline, wagering: 45, bonusMinor: 20000 }),
    ).toHaveLength(2);
  });
});
