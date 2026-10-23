import { afterEach, describe, expect, it, vi } from "vitest";
import { describeCaptureError } from "../../packages/research/errors";

vi.mock("../../packages/research/network", () => ({
  assertPublicTarget: async () => {},
}));
vi.mock("playwright", () => ({
  chromium: {
    launch: async () => {
      throw new Error(
        "browserType.launch: Executable doesn't exist at /p\n╔═══╗\n║ Looks like Playwright was just installed ║\n╚═══╝",
      );
    },
  },
}));

const undici = (code: string) =>
  Object.assign(new TypeError("fetch failed"), {
    cause: Object.assign(new Error(`getaddrinfo ${code} secret.internal`), {
      code,
    }),
  });

describe("describeCaptureError", () => {
  it("adds the cause code but not the cause message", () => {
    const text = describeCaptureError(undici("ENOTFOUND"), "x");
    expect(text).toBe("fetch failed (ENOTFOUND)");
    expect(text).not.toContain("secret.internal");
  });
  it("reads the code from an AggregateError cause", () => {
    const error = Object.assign(new TypeError("fetch failed"), {
      cause: new AggregateError([
        Object.assign(new Error("a"), { code: "ECONNREFUSED" }),
      ]),
    });
    expect(describeCaptureError(error, "x")).toBe(
      "fetch failed (ECONNREFUSED)",
    );
  });
  it("keeps only the first line of a multi-line message", () => {
    expect(describeCaptureError(new Error("first\n╔═╗\nrest"), "x")).toBe(
      "first",
    );
  });
  it("labels timeouts", () => {
    const error = new DOMException("timed out", "TimeoutError");
    expect(describeCaptureError(error, "x")).toBe("timed out (TimeoutError)");
  });
  it("leaves plain messages unchanged and falls back otherwise", () => {
    expect(describeCaptureError(new Error("Too many redirects"), "x")).toBe(
      "Too many redirects",
    );
    expect(describeCaptureError("boom", "fallback")).toBe("fallback");
    expect(describeCaptureError(new Error(""), "fallback")).toBe("fallback");
  });
  it("terminates on cyclic causes and caps length", () => {
    const a: Error & { cause?: unknown } = new Error("a");
    a.cause = a;
    expect(describeCaptureError(a, "x")).toBe("a");
    expect(describeCaptureError(new Error("y".repeat(900)), "x")).toHaveLength(
      300,
    );
  });
});

describe("fetchSource failures", () => {
  afterEach(() => vi.unstubAllGlobals());
  it("reports the network cause code", async () => {
    vi.stubGlobal("fetch", async () => {
      throw undici("ENOTFOUND");
    });
    const { fetchSource } = await import("../../packages/research/fetch");
    const result = await fetchSource("northstar-home");
    expect(result).toMatchObject({
      raw: "",
      httpStatus: 0,
      method: "http-html/v1",
      error: "fetch failed (ENOTFOUND)",
    });
  });
  it("reports a missing browser on one line", async () => {
    const { fetchSource } = await import("../../packages/research/fetch");
    const result = await fetchSource("northstar-terms");
    expect(result.method).toBe("playwright-chromium/northstar-v1");
    expect(result.error).toBe(
      "browserType.launch: Executable doesn't exist at /p",
    );
  });
});
