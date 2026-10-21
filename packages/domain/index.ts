import { createHash } from "node:crypto";
import { z } from "zod";

export const claimStatuses = [
  "unknown",
  "not_checked",
  "not_found",
  "confirmed",
  "rejected",
  "outdated",
] as const;
const decimal = z
  .union([z.number(), z.string().regex(/^\d+(\.\d{1,2})?$/)])
  .transform(Number)
  .pipe(z.number().finite().nonnegative().max(1000000))
  .refine(
    (value) => Math.abs(value * 100 - Math.round(value * 100)) < 0.000001,
    "At most two decimal places",
  );
export const sourceSchema = z
  .object({
    currency: z.literal("CAD"),
    jurisdiction: z.literal("CA-ON"),
    bonus: decimal,
    wagering: decimal.pipe(z.number().int().max(1000)),
    minimumDeposit: decimal,
    licenseStatus: z.enum(claimStatuses),
  })
  .strict();
export type Offer = {
  currency: "CAD";
  jurisdiction: "CA-ON";
  bonusMinor: number;
  wagering: number;
  minimumDepositMinor: number;
  licenseStatus: (typeof claimStatuses)[number];
};
export type Evidence = {
  snapshotId: string;
  capturedAt: string;
  sourceUrl: string;
  method: string;
  excerpt: string;
  location: string;
};
export type Provenance = Record<keyof Offer, Evidence>;
export const fields: (keyof Offer)[] = [
  "currency",
  "jurisdiction",
  "bonusMinor",
  "wagering",
  "minimumDepositMinor",
  "licenseStatus",
];
export function normalize(input: unknown): Offer {
  const value = sourceSchema.parse(input);
  return {
    currency: value.currency,
    jurisdiction: value.jurisdiction,
    bonusMinor: Math.round(value.bonus * 100),
    wagering: value.wagering,
    minimumDepositMinor: Math.round(value.minimumDeposit * 100),
    licenseStatus: value.licenseStatus,
  };
}
export function hash(value: unknown) {
  return createHash("sha256").update(JSON.stringify(value)).digest("hex");
}
export function diff(before: Offer | null, after: Offer) {
  return fields
    .filter((key) => before?.[key] !== after[key])
    .map((field) => ({
      field,
      before: before?.[field] ?? null,
      after: after[field],
    }));
}
export class Conflict extends Error {}
