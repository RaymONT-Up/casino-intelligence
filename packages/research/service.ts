import { load } from "cheerio";
import { randomUUID } from "node:crypto";
import { and, eq, desc, inArray } from "drizzle-orm";
import type { Database } from "../database/client";
import { hash, Conflict } from "../domain";
import {
  sources,
  captures,
  researchProposals as proposals,
  results,
  reviews,
} from "./schema";
import {
  sourceDefinitions,
  type SourceId,
  type Observation,
  type ResearchPayload,
} from "./model";
import { parseDirectory, parseDocument } from "./parser";
import { fetchSource } from "./fetch";
export function comparePayload(
  before: ResearchPayload | null,
  after: ResearchPayload,
) {
  if (!before) return [{ field: "initial record", before: null, after }];
  if (before.kind !== after.kind) throw new Error("Source type changed");
  if (before.kind === "directory" && after.kind === "directory") {
    return after.operators.flatMap((operator) => {
      const old = before.operators.find((o) => o.slug === operator.slug);
      return (Object.keys(operator) as (keyof typeof operator)[])
        .filter(
          (key) => JSON.stringify(old?.[key]) !== JSON.stringify(operator[key]),
        )
        .map((key) => ({
          field: `${operator.name}.${key}`,
          before: old?.[key] ?? null,
          after: operator[key],
        }));
    });
  }
  return hash(before) === hash(after)
    ? []
    : [{ field: "source document", before, after }];
}
export async function ingestObservation(
  db: Database,
  sourceId: SourceId,
  captureKey: string,
  observation: Observation,
) {
  const definition = sourceDefinitions.find((s) => s.id === sourceId)!;
  await db.insert(sources).values({ id: sourceId }).onConflictDoNothing();
  return db.transaction(async (tx) => {
    const [source] = await tx
      .select()
      .from(sources)
      .where(eq(sources.id, sourceId))
      .for("update");
    const [prior] = await tx
      .select()
      .from(captures)
      .where(
        and(
          eq(captures.sourceId, sourceId),
          eq(captures.captureKey, captureKey),
        ),
      );
    if (prior) {
      if (prior.contentHash !== hash(observation.raw))
        throw new Conflict("Capture key already used for different content");
      const [result] = await tx
        .select()
        .from(results)
        .where(eq(results.captureId, prior.id));
      const [proposal] = result?.proposalId
        ? await tx
            .select()
            .from(proposals)
            .where(eq(proposals.id, result.proposalId))
        : [];
      return {
        captureId: prior.id,
        proposal: proposal ?? null,
        errors: prior.errors,
        repeated: true,
      };
    }
    const errors = observation.error ? [observation.error] : [];
    let payload: ResearchPayload | null = null;
    if (!errors.length) {
      try {
        payload =
          definition.kind === "directory"
            ? parseDirectory(observation.raw)
            : parseDocument(observation.raw, observation.finalUrl);
        if (
          payload.kind === "document" &&
          payload.document.status === "unavailable"
        )
          errors.push(payload.document.reason!);
      } catch (error) {
        errors.push((error as Error).message);
      }
    }
    const { raw, ...metadata } = observation;
    const [capture] = await tx
      .insert(captures)
      .values({
        id: randomUUID(),
        sourceId,
        captureKey,
        contentHash: hash(raw),
        raw,
        observation: metadata,
        payload,
        errors,
      })
      .returning();
    const finish = async (proposal: typeof proposals.$inferSelect | null) => {
      await tx
        .insert(results)
        .values({ captureId: capture.id, proposalId: proposal?.id ?? null });
      return { captureId: capture.id, proposal, errors, repeated: false };
    };
    if (errors.length || !payload) return finish(null);
    const [baseline] = source.currentCaptureId
      ? await tx
          .select()
          .from(captures)
          .where(eq(captures.id, source.currentCaptureId))
      : [];
    const changes = comparePayload(baseline?.payload ?? null, payload);
    if (!changes.length) return finish(null);
    const identity = hash({
      sourceId,
      baseline: source.currentCaptureId,
      payload,
    });
    const [duplicate] = await tx
      .select()
      .from(proposals)
      .where(eq(proposals.identity, identity));
    if (duplicate) return finish(duplicate);
    const [proposal] = await tx
      .insert(proposals)
      .values({
        id: randomUUID(),
        sourceId,
        captureId: capture.id,
        baselineId: source.currentCaptureId,
        identity,
        changes,
        status: "pending",
      })
      .returning();
    return finish(proposal);
  });
}
const inFlight = new Set<string>();
export async function collectSource(db: Database, sourceId: SourceId) {
  if (inFlight.has(sourceId)) throw new Conflict("Collection already running");
  inFlight.add(sourceId);
  try {
    return await ingestObservation(
      db,
      sourceId,
      randomUUID(),
      await fetchSource(sourceId),
    );
  } finally {
    inFlight.delete(sourceId);
  }
}
export async function reviewResearch(
  db: Database,
  id: string,
  decision: "approved" | "rejected",
  actor: string,
  rationale: string,
) {
  return db.transaction(async (tx) => {
    const [lookup] = await tx
      .select()
      .from(proposals)
      .where(eq(proposals.id, id));
    if (!lookup) throw new Conflict("Proposal not found");
    const [source] = await tx
      .select()
      .from(sources)
      .where(eq(sources.id, lookup.sourceId))
      .for("update");
    const [proposal] = await tx
      .select()
      .from(proposals)
      .where(eq(proposals.id, id))
      .for("update");
    if (proposal.status !== "pending") {
      if (proposal.status !== decision)
        throw new Conflict("Proposal already decided differently");
      return (
        await tx.select().from(reviews).where(eq(reviews.proposalId, id))
      )[0];
    }
    if (
      decision === "approved" &&
      proposal.baselineId !== source.currentCaptureId
    )
      throw new Conflict(
        "Published baseline changed. Collect again and review the new comparison.",
      );
    const [capture] = await tx
      .select()
      .from(captures)
      .where(eq(captures.id, proposal.captureId));
    if (
      decision === "approved" &&
      (capture.errors.length ||
        !capture.payload ||
        capture.sourceId !== source.id)
    )
      throw new Conflict("Invalid capture cannot be published");
    const [review] = await tx
      .insert(reviews)
      .values({ id: randomUUID(), proposalId: id, decision, actor, rationale })
      .returning();
    if (decision === "approved")
      await tx
        .update(sources)
        .set({ currentCaptureId: capture.id })
        .where(eq(sources.id, source.id));
    await tx
      .update(proposals)
      .set({ status: decision })
      .where(eq(proposals.id, id));
    return review;
  });
}
export async function researchState(db: Database) {
  const [sourceRows, captureRows, proposalRows, decisions] = await Promise.all([
    db.select().from(sources),
    db
      .select({
        id: captures.id,
        sourceId: captures.sourceId,
        contentHash: captures.contentHash,
        observation: captures.observation,
        payload: captures.payload,
        errors: captures.errors,
        capturedAt: captures.capturedAt,
      })
      .from(captures)
      .orderBy(desc(captures.capturedAt))
      .limit(50),
    db.select().from(proposals).orderBy(desc(proposals.createdAt)),
    db.select().from(reviews).orderBy(desc(reviews.createdAt)).limit(30),
  ]);
  const requiredIds = [
    ...new Set([
      ...proposalRows.flatMap((p) => [
        p.captureId,
        ...(p.baselineId ? [p.baselineId] : []),
      ]),
      ...sourceRows.flatMap((s) =>
        s.currentCaptureId ? [s.currentCaptureId] : [],
      ),
    ]),
  ];
  const missingIds = requiredIds.filter(
    (id) => !captureRows.some((c) => c.id === id),
  );
  if (missingIds.length) {
    const older = await db
      .select({
        id: captures.id,
        sourceId: captures.sourceId,
        contentHash: captures.contentHash,
        observation: captures.observation,
        payload: captures.payload,
        errors: captures.errors,
        capturedAt: captures.capturedAt,
      })
      .from(captures)
      .where(inArray(captures.id, missingIds));
    captureRows.push(...older);
  }
  return {
    sources: sourceDefinitions.map((d) => ({
      ...d,
      currentCaptureId:
        sourceRows.find((s) => s.id === d.id)?.currentCaptureId ?? null,
    })),
    captures: captureRows,
    proposals: proposalRows,
    decisions,
  };
}
export async function publishedResearch(db: Database) {
  const published = await db
    .select({ capture: captures, review: reviews })
    .from(sources)
    .innerJoin(captures, eq(sources.currentCaptureId, captures.id))
    .innerJoin(
      proposals,
      and(
        eq(proposals.captureId, captures.id),
        eq(proposals.status, "approved"),
      ),
    )
    .innerJoin(
      reviews,
      and(
        eq(reviews.proposalId, proposals.id),
        eq(reviews.decision, "approved"),
      ),
    );
  return published.map(({ capture, review }) => ({
    sourceId: capture.sourceId,
    sourceUrl: capture.observation.finalUrl,
    captureId: capture.id,
    capturedAt: capture.capturedAt,
    hash: capture.contentHash,
    method: capture.observation.method,
    region: "Collector location not verified",
    payload: capture.payload!,
    reviewedAt: review.createdAt,
  }));
}

export async function captureEvidence(db: Database, id: string) {
  const [capture] = await db.select().from(captures).where(eq(captures.id, id));
  if (!capture) throw new Conflict("Capture not found");
  const $ = load(capture.raw);
  $("script,style,noscript,iframe").remove();
  return {
    id: capture.id,
    sourceUrl: capture.observation.finalUrl,
    capturedAt: capture.capturedAt,
    hash: capture.contentHash,
    text: $("body").text().replace(/\s+/g, " ").trim(),
  };
}
