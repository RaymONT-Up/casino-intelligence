import "server-only";
import { createHmac, timingSafeEqual } from "node:crypto";
import { cookies } from "next/headers";
import type {
  publicCatalog,
  adminState,
} from "../../../packages/data-ingestion/service";
export type Casino = Awaited<ReturnType<typeof publicCatalog>>[number];
export type AdminState = Awaited<ReturnType<typeof adminState>>;
export class ApiError extends Error {
  constructor(
    message: string,
    public status: number,
  ) {
    super(message);
  }
}
export async function api<T>(path: string, init?: RequestInit): Promise<T> {
  const response = await fetch(
    `${process.env.API_URL ?? "http://127.0.0.1:4000"}${path}`,
    {
      ...init,
      cache: "no-store",
      headers: {
        "Content-Type": "application/json",
        ...(path.startsWith("/admin/")
          ? { Authorization: `Bearer ${process.env.ADMIN_TOKEN}` }
          : {}),
        ...init?.headers,
      },
    },
  );
  const result = await response.json();
  if (!response.ok)
    throw new ApiError(result.error ?? "Service unavailable", response.status);
  return result;
}
function sign(value: string) {
  const secret = process.env.SESSION_SECRET;
  if (!secret || secret.length < 32)
    throw new Error("SESSION_SECRET is not configured");
  return createHmac("sha256", secret).update(value).digest("hex");
}
export function equal(a: string, b: string) {
  const first = Buffer.from(a);
  const second = Buffer.from(b);
  return first.length === second.length && timingSafeEqual(first, second);
}
export function newSession() {
  const expiry = String(Date.now() + 8 * 60 * 60 * 1000);
  return `${expiry}.${sign(expiry)}`;
}
export async function isEditor() {
  const value = (await cookies()).get("ci_session")?.value;
  if (!value) return false;
  const [expiry, signature, extra] = value.split(".");
  return (
    !extra &&
    !!signature &&
    Number(expiry) > Date.now() &&
    equal(sign(expiry), signature)
  );
}

export type PublishedResearch = Awaited<
  ReturnType<
    typeof import("../../../packages/research/service").publishedResearch
  >
>;
export type ResearchState = Awaited<
  ReturnType<typeof import("../../../packages/research/service").researchState>
>;
