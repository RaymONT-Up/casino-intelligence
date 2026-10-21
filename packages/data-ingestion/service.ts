import { randomUUID } from "node:crypto";
import { eq, desc } from "drizzle-orm";
import { ZodError } from "zod";
import type { Database } from "../database/client";
import {
  casinos,
  snapshots,
  extractions,
  proposals,
  versions,
  decisions,
  audit,
  captureResults,
} from "../database/schema";
import {
  Conflict,
  normalize,
  hash,
  diff,
  fields,
  type Provenance,
} from "../domain";
export const METHOD = "fixture-json/v1";

export async function ingest(
  db: Database,
  casinoId: string,
  captureKey: string,
  raw: unknown,
) {
  return db.transaction(async (tx) => {
    const [casino] = await tx
      .select()
      .from(casinos)
      .where(eq(casinos.id, casinoId))
      .for("update");
    if (!casino) throw new Error("Casino not found");
    const existing = await tx
      .select()
      .from(snapshots)
      .where(eq(snapshots.casinoId, casinoId));
    const prior = existing.find((s) => s.captureKey === captureKey);
    if (prior) {
      if (prior.contentHash !== hash(raw))
        throw new Conflict("Capture key already belongs to different content");
      const [extraction] = await tx
        .select()
        .from(extractions)
        .where(eq(extractions.snapshotId, prior.id));
      const [savedResult] = await tx
        .select()
        .from(captureResults)
        .where(eq(captureResults.snapshotId, prior.id));
      const [proposal] = savedResult?.proposalId
        ? await tx
            .select()
            .from(proposals)
            .where(eq(proposals.id, savedResult.proposalId))
        : [];
      return {
        snapshot: prior,
        extraction,
        proposal: proposal ?? null,
        repeated: true,
      };
    }
    const [snapshot] = await tx
      .insert(snapshots)
      .values({
        id: randomUUID(),
        casinoId,
        captureKey,
        raw,
        contentHash: hash(raw),
        sourceUrl: `https://${casinoId}.example/terms/welcome`,
        capturedAt: new Date(),
      })
      .returning();
    let candidate;
    let errors: string[] = [];
    try {
      candidate = normalize(raw);
    } catch (error) {
      if (!(error instanceof ZodError)) throw error;
      errors = error.issues.map(
        (issue) => `${issue.path.join(".")}: ${issue.message}`,
      );
    }
    const [extraction] = await tx
      .insert(extractions)
      .values({
        id: randomUUID(),
        snapshotId: snapshot.id,
        method: METHOD,
        normalized: candidate,
        errors,
      })
      .returning();
    await tx.insert(audit).values({
      id: randomUUID(),
      casinoId,
      action: "capture",
      actor: "fixture-collector",
      details: { snapshotId: snapshot.id, valid: !!candidate },
    });
    const finish = async (proposal: typeof proposals.$inferSelect | null) => {
      await tx
        .insert(captureResults)
        .values({ snapshotId: snapshot.id, proposalId: proposal?.id ?? null });
      return { snapshot, extraction, proposal, repeated: false };
    };
    if (!candidate) return finish(null);
    const [baseline] = casino.currentVersionId
      ? await tx
          .select()
          .from(versions)
          .where(eq(versions.id, casino.currentVersionId))
      : [];
    const changes = diff(baseline?.offer ?? null, candidate);
    if (!changes.length) return finish(null);
    const identity = hash({
      casinoId,
      scope: "CA-ON/welcome",
      baseline: baseline?.id ?? null,
      candidate,
    });
    const [duplicate] = await tx
      .select()
      .from(proposals)
      .where(eq(proposals.identity, identity));
    if (duplicate) return finish(duplicate);
    const provenance = Object.fromEntries(
      fields.map((field) => [
        field,
        baseline && !changes.some((change) => change.field === field)
          ? baseline.provenance[field]
          : {
              snapshotId: snapshot.id,
              capturedAt: snapshot.capturedAt.toISOString(),
              sourceUrl: snapshot.sourceUrl,
              method: METHOD,
              excerpt: JSON.stringify(raw),
              location: `JSON field: ${field === "bonusMinor" ? "bonus" : field === "minimumDepositMinor" ? "minimumDeposit" : field}`,
            },
      ]),
    ) as Provenance;
    const [proposal] = await tx
      .insert(proposals)
      .values({
        id: randomUUID(),
        casinoId,
        snapshotId: snapshot.id,
        baselineId: baseline?.id ?? null,
        candidate,
        provenance,
        changes,
        identity,
      })
      .returning();
    return finish(proposal);
  });
}

export async function decide(
  db: Database,
  proposalId: string,
  decision: "approved" | "rejected",
  actor: string,
  rationale: string,
) {
  return db.transaction(async (tx) => {
    const [lookup] = await tx
      .select()
      .from(proposals)
      .where(eq(proposals.id, proposalId));
    if (!lookup) throw new Conflict("Proposal not found");
    const [casino] = await tx
      .select()
      .from(casinos)
      .where(eq(casinos.id, lookup.casinoId))
      .for("update");
    const [proposal] = await tx
      .select()
      .from(proposals)
      .where(eq(proposals.id, proposalId))
      .for("update");
    if (proposal.status !== "pending") {
      if (proposal.status !== decision)
        throw new Conflict("Proposal already has a different decision");
      const [saved] = await tx
        .select()
        .from(decisions)
        .where(eq(decisions.proposalId, proposalId));
      return saved;
    }
    if (
      decision === "approved" &&
      casino.currentVersionId !== proposal.baselineId
    )
      throw new Conflict(
        "Published baseline changed. Collect a new observation and review it.",
      );
    const [result] = await tx
      .insert(decisions)
      .values({ id: randomUUID(), proposalId, decision, actor, rationale })
      .returning();
    if (decision === "approved") {
      const [version] = await tx
        .insert(versions)
        .values({
          id: randomUUID(),
          casinoId: casino.id,
          proposalId,
          previousId: casino.currentVersionId,
          offer: proposal.candidate,
          provenance: proposal.provenance,
        })
        .returning();
      await tx
        .update(casinos)
        .set({ currentVersionId: version.id })
        .where(eq(casinos.id, casino.id));
    }
    await tx
      .update(proposals)
      .set({ status: decision })
      .where(eq(proposals.id, proposalId));
    await tx.insert(audit).values({
      id: randomUUID(),
      casinoId: casino.id,
      action: decision,
      actor,
      details: { proposalId, rationale },
    });
    return result;
  });
}

export async function publicCatalog(db: Database) {
  return db
    .select({
      id: casinos.id,
      name: casinos.name,
      description: casinos.description,
      versionId: versions.id,
      offer: versions.offer,
      provenance: versions.provenance,
      publishedAt: versions.createdAt,
    })
    .from(casinos)
    .leftJoin(versions, eq(casinos.currentVersionId, versions.id))
    .orderBy(casinos.name);
}
export async function adminState(db: Database) {
  const [items, captures, history] = await Promise.all([
    db.select().from(proposals).orderBy(desc(proposals.createdAt)),
    db
      .select({ snapshot: snapshots, extraction: extractions })
      .from(snapshots)
      .leftJoin(extractions, eq(snapshots.id, extractions.snapshotId))
      .orderBy(desc(snapshots.capturedAt))
      .limit(30),
    db.select().from(audit).orderBy(desc(audit.createdAt)).limit(30),
  ]);
  return { proposals: items, captures, history };
}
