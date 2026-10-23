const maxLength = 300;

function findCode(error: unknown, depth = 0): string | undefined {
  if (depth > 3 || typeof error !== "object" || error === null) return;
  const { code, name, cause, errors } = error as {
    code?: unknown;
    name?: unknown;
    cause?: unknown;
    errors?: unknown;
  };
  if (typeof code === "string" && code) return code;
  if (name === "TimeoutError") return name;
  if (Array.isArray(errors)) {
    const inner = findCode(errors[0], depth + 1);
    if (inner) return inner;
  }
  return findCode(cause, depth + 1);
}

// One-line, secret-free description of a failed capture. Keeps the cause code
// (e.g. ENOTFOUND) but not the cause message, which can carry hosts and paths.
export function describeCaptureError(error: unknown, fallback: string): string {
  if (!(error instanceof Error)) return fallback;
  const first = error.message
    .split("\n")
    .map((line) => line.trim())
    .find(Boolean);
  if (!first) return fallback;
  const code = findCode(error);
  const text = code && !first.includes(code) ? `${first} (${code})` : first;
  return text.length > maxLength ? `${text.slice(0, maxLength - 1)}…` : text;
}
