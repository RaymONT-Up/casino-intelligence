import { pgTable, text, uuid, jsonb, timestamp } from "drizzle-orm/pg-core";
import type { Observation, ResearchPayload } from "./model";
export const sources = pgTable("research_sources", {
  id: text().primaryKey(),
  currentCaptureId: uuid(),
});
export const captures = pgTable("research_captures", {
  id: uuid().primaryKey(),
  sourceId: text().notNull(),
  captureKey: text().notNull(),
  contentHash: text().notNull(),
  raw: text().notNull(),
  observation: jsonb().$type<Omit<Observation, "raw">>().notNull(),
  payload: jsonb().$type<ResearchPayload>(),
  errors: jsonb().$type<string[]>().notNull(),
  capturedAt: timestamp({ withTimezone: true }).defaultNow().notNull(),
});
export const researchProposals = pgTable("research_proposals", {
  id: uuid().primaryKey(),
  sourceId: text().notNull(),
  captureId: uuid().notNull(),
  baselineId: uuid(),
  identity: text().notNull(),
  changes: jsonb()
    .$type<{ field: string; before: unknown; after: unknown }[]>()
    .notNull(),
  status: text().notNull().default("pending"),
  createdAt: timestamp({ withTimezone: true }).defaultNow().notNull(),
});
export const results = pgTable("research_results", {
  captureId: uuid().primaryKey(),
  proposalId: uuid(),
});
export const reviews = pgTable("research_decisions", {
  id: uuid().primaryKey(),
  proposalId: uuid().notNull(),
  decision: text().notNull(),
  actor: text().notNull(),
  rationale: text().notNull(),
  createdAt: timestamp({ withTimezone: true }).defaultNow().notNull(),
});
