import {
  pgTable,
  text,
  jsonb,
  timestamp,
  uuid,
  uniqueIndex,
  index,
} from "drizzle-orm/pg-core";
import type { Offer, Provenance } from "../domain";
export const casinos = pgTable("casinos", {
  id: text().primaryKey(),
  name: text().notNull(),
  description: text().notNull(),
  currentVersionId: uuid(),
});
export const snapshots = pgTable(
  "snapshots",
  {
    id: uuid().primaryKey(),
    casinoId: text()
      .notNull()
      .references(() => casinos.id),
    captureKey: text().notNull(),
    contentHash: text().notNull(),
    raw: jsonb().notNull(),
    sourceUrl: text().notNull(),
    capturedAt: timestamp({ withTimezone: true }).notNull(),
  },
  (t) => [uniqueIndex("snapshot_capture").on(t.casinoId, t.captureKey)],
);
export const extractions = pgTable(
  "extractions",
  {
    id: uuid().primaryKey(),
    snapshotId: uuid()
      .notNull()
      .references(() => snapshots.id),
    method: text().notNull(),
    normalized: jsonb().$type<Offer>(),
    errors: jsonb().$type<string[]>().notNull(),
  },
  (t) => [uniqueIndex("extraction_identity").on(t.snapshotId, t.method)],
);
export const proposals = pgTable(
  "proposals",
  {
    id: uuid().primaryKey(),
    casinoId: text()
      .notNull()
      .references(() => casinos.id),
    snapshotId: uuid()
      .notNull()
      .references(() => snapshots.id),
    baselineId: uuid(),
    candidate: jsonb().$type<Offer>().notNull(),
    provenance: jsonb().$type<Provenance>().notNull(),
    changes: jsonb()
      .$type<ReturnType<typeof import("../domain").diff>>()
      .notNull(),
    identity: text().notNull().unique(),
    status: text().notNull().default("pending"),
    createdAt: timestamp({ withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [index("review_queue").on(t.status, t.createdAt, t.id)],
);
export const decisions = pgTable("decisions", {
  id: uuid().primaryKey(),
  proposalId: uuid()
    .notNull()
    .unique()
    .references(() => proposals.id),
  decision: text().notNull(),
  actor: text().notNull(),
  rationale: text().notNull(),
  createdAt: timestamp({ withTimezone: true }).notNull().defaultNow(),
});
export const versions = pgTable("versions", {
  id: uuid().primaryKey(),
  casinoId: text()
    .notNull()
    .references(() => casinos.id),
  proposalId: uuid()
    .notNull()
    .unique()
    .references(() => proposals.id),
  previousId: uuid(),
  offer: jsonb().$type<Offer>().notNull(),
  provenance: jsonb().$type<Provenance>().notNull(),
  createdAt: timestamp({ withTimezone: true }).notNull().defaultNow(),
});
export const audit = pgTable("audit", {
  id: uuid().primaryKey(),
  casinoId: text()
    .notNull()
    .references(() => casinos.id),
  action: text().notNull(),
  actor: text().notNull(),
  details: jsonb().notNull(),
  createdAt: timestamp({ withTimezone: true }).notNull().defaultNow(),
});
export const captureResults = pgTable("capture_results", {
  snapshotId: uuid()
    .primaryKey()
    .references(() => snapshots.id),
  proposalId: uuid().references(() => proposals.id),
});
