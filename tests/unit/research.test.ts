import { describe, it, expect } from "vitest";
import { parseDirectory, parseDocument } from "../../packages/research/parser";
import { comparePayload } from "../../packages/research/service";
import {
  assertPublicTarget,
  isPublicAddress,
} from "../../packages/research/network";
import { directoryHtml, termsHtml } from "../research-fixtures";
const url = "https://www.northstarbets.ca/terms-conditions";
describe("source parsing and network boundary", () => {
  it("extracts identities and source date without claiming licences", () => {
    const p = parseDirectory(directoryHtml());
    expect(p.kind).toBe("directory");
    if (p.kind === "directory") {
      expect(p.operators).toHaveLength(5);
      expect(p.sourceAsOf).toBe("September 1, 2026");
      expect(p.operators[0]).not.toHaveProperty("licence");
    }
  });
  it("fails closed on missing directory entries", () => {
    expect(() =>
      parseDirectory(directoryHtml().replace("Play Betty", "Play Missing")),
    ).toThrow("missing");
  });
  it("tracks same-length changes beyond extracted claims", () => {
    const a = parseDocument(termsHtml(), url);
    const b = parseDocument(termsHtml().replace("isolated", "separate"), url);
    expect(comparePayload(a, b)).not.toHaveLength(0);
  });
  it("records actual matching offsets and leaves absent values absent", () => {
    const p = parseDocument(termsHtml(), url);
    if (p.kind === "document") {
      expect(p.document.claims[0].value).toBe("19");
      expect(p.document.claims[0].location).toMatch(/characters \d+-\d+/);
      expect(p.document.claims.some((c) => c.field.includes("Wager"))).toBe(
        false,
      );
    }
  });
  it("does not interpret block pages as terms", () => {
    const p = parseDocument("<body>Access denied</body>", url);
    if (p.kind === "document") expect(p.document.status).toBe("unavailable");
  });
  it("rejects private, loopback and mapped addresses", () => {
    for (const ip of [
      "127.0.0.1",
      "10.0.0.1",
      "169.254.169.254",
      "::1",
      "::ffff:127.0.0.1",
      "fc00::1",
    ])
      expect(isPublicAddress(ip)).toBe(false);
    expect(isPublicAddress("1.1.1.1")).toBe(true);
  });
  it("validates scheme, host and every resolved address", async () => {
    await expect(
      assertPublicTarget(
        "https://allowed.example/",
        ["allowed.example"],
        async () => ["1.1.1.1", "10.0.0.1"],
      ),
    ).rejects.toThrow("non-public");
    await expect(
      assertPublicTarget(
        "https://other.example/",
        ["allowed.example"],
        async () => ["1.1.1.1"],
      ),
    ).rejects.toThrow("allowlist");
    await expect(
      assertPublicTarget(
        "http://allowed.example/",
        ["allowed.example"],
        async () => ["1.1.1.1"],
      ),
    ).rejects.toThrow("allowlist");
  });
});
