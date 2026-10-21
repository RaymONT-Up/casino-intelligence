import { beforeAll, afterAll, describe, it, expect } from "vitest";
import { randomUUID } from "node:crypto";
import { readFile } from "node:fs/promises";
import { eq } from "drizzle-orm";
import { connect } from "../../packages/database/client";
import {
  casinos,
  decisions,
  proposals,
  versions,
  audit,
} from "../../packages/database/schema";
import {
  ingest,
  decide,
  publicCatalog,
} from "../../packages/data-ingestion/service";
import { fixture } from "../../fixtures/catalog";
import { buildApp } from "../../apps/api/src/app";
const connection = connect();
const schema = `test_${randomUUID().replaceAll("-", "")}`;
const url = new URL(process.env.DATABASE_URL!);
url.searchParams.set("options", `-csearch_path=${schema}`);
const isolated = connect(url.toString());
const db = isolated.db;
beforeAll(async () => {
  await connection.pool.query(`CREATE SCHEMA "${schema}"`);
  const client = await isolated.pool.connect();
  try {
    await client.query(
      await readFile(
        new URL("../../packages/database/001_initial.sql", import.meta.url),
        "utf8",
      ),
    );
    await client.query(
      await readFile(
        new URL(
          "../../packages/database/002_capture_results.sql",
          import.meta.url,
        ),
        "utf8",
      ),
    );
    await client.query(
      await readFile(
        new URL("../../packages/database/003_research.sql", import.meta.url),
        "utf8",
      ),
    );
  } finally {
    client.release();
  }
});
afterAll(async () => {
  await isolated.pool.end();
  await connection.pool.query(`DROP SCHEMA "${schema}" CASCADE`);
  await connection.pool.end();
});
async function baseline() {
  const id = `test-${randomUUID()}`;
  await db
    .insert(casinos)
    .values({ id, name: id, description: "Synthetic test" });
  const collected = await ingest(db, id, "v1", fixture("v1"));
  await decide(
    db,
    collected.proposal!.id,
    "approved",
    "test-editor",
    "Synthetic baseline accepted",
  );
  return id;
}
async function published(id: string) {
  return (await publicCatalog(db)).find((c) => c.id === id)!;
}
describe("real PostgreSQL publication boundary", () => {
  it("keeps pending changes private; approval is persistent and idempotent", async () => {
    const id = await baseline();
    const candidate = await ingest(db, id, "v2", fixture("v2"));
    expect((await published(id)).offer!.wagering).toBe(35);
    const results = await Promise.all([
      decide(
        db,
        candidate.proposal!.id,
        "approved",
        "editor",
        "Evidence checked against fixture",
      ),
      decide(
        db,
        candidate.proposal!.id,
        "approved",
        "editor",
        "Evidence checked against fixture",
      ),
    ]);
    expect(results[0].id).toBe(results[1].id);
    expect(
      await db
        .select()
        .from(decisions)
        .where(eq(decisions.proposalId, candidate.proposal!.id)),
    ).toHaveLength(1);
    expect(
      await db
        .select()
        .from(versions)
        .where(eq(versions.proposalId, candidate.proposal!.id)),
    ).toHaveLength(1);
    expect((await published(id)).offer!.wagering).toBe(40);
    const again = await ingest(db, id, "v2", fixture("v2"));
    expect(again.repeated).toBe(true);
    expect(again.proposal!.id).toBe(candidate.proposal!.id);
  });
  it("preserves evidence on unchanged fields", async () => {
    const id = await baseline();
    const before = await published(id);
    const result = await ingest(db, id, "v2", fixture("v2"));
    await decide(
      db,
      result.proposal!.id,
      "approved",
      "editor",
      "Checked changed wagering only",
    );
    const after = await published(id);
    expect(after.provenance!.bonusMinor).toEqual(before.provenance!.bonusMinor);
    expect(after.provenance!.wagering.snapshotId).toBe(result.snapshot.id);
  });
  it("deduplicates semantic candidates across captures including rejected changes", async () => {
    const id = await baseline();
    const a = await ingest(db, id, "capture-a", fixture("v2"));
    const b = await ingest(db, id, "capture-b", fixture("v2"));
    expect(a.snapshot.id).not.toBe(b.snapshot.id);
    expect(a.proposal!.id).toBe(b.proposal!.id);
    expect(
      (await ingest(db, id, "capture-b", fixture("v2"))).proposal!.id,
    ).toBe(a.proposal!.id);
    await decide(
      db,
      a.proposal!.id,
      "rejected",
      "editor",
      "Evidence insufficient for publication",
    );
    expect(
      (await ingest(db, id, "capture-c", fixture("v2"))).proposal!.status,
    ).toBe("rejected");
    expect((await published(id)).offer!.wagering).toBe(35);
    await expect(ingest(db, id, "capture-a", fixture("v3"))).rejects.toThrow(
      "different content",
    );
  });
  it("rejects stale approvals without writing a decision", async () => {
    const id = await baseline();
    const a = await ingest(db, id, "a", fixture("v2"));
    const b = await ingest(db, id, "b", fixture("v3"));
    await decide(
      db,
      a.proposal!.id,
      "approved",
      "editor",
      "Source checked for version two",
    );
    await expect(
      decide(
        db,
        b.proposal!.id,
        "approved",
        "editor",
        "Source checked for version three",
      ),
    ).rejects.toThrow("baseline changed");
    expect(
      await db
        .select()
        .from(decisions)
        .where(eq(decisions.proposalId, b.proposal!.id)),
    ).toHaveLength(0);
    expect((await published(id)).offer!.wagering).toBe(40);
  });
  it("serializes competing approve/reject decisions", async () => {
    const id = await baseline();
    const item = await ingest(db, id, "race", fixture("v2"));
    const results = await Promise.allSettled([
      decide(
        db,
        item.proposal!.id,
        "approved",
        "one",
        "Evidence accepted by first reviewer",
      ),
      decide(
        db,
        item.proposal!.id,
        "rejected",
        "two",
        "Evidence rejected by second reviewer",
      ),
    ]);
    expect(results.filter((r) => r.status === "fulfilled")).toHaveLength(1);
    const saved = await db
      .select()
      .from(decisions)
      .where(eq(decisions.proposalId, item.proposal!.id));
    expect(saved).toHaveLength(1);
    expect((await published(id)).offer!.wagering).toBe(
      saved[0].decision === "approved" ? 40 : 35,
    );
  });
  it("rolls back decision and version if audit insertion fails", async () => {
    const id = await baseline();
    const item = await ingest(db, id, "rollback", fixture("v2"));
    await isolated.pool.query(
      `CREATE FUNCTION fail_audit() RETURNS trigger LANGUAGE plpgsql AS $$ BEGIN IF NEW.actor = 'failure-test' THEN RAISE EXCEPTION 'simulated failure'; END IF; RETURN NEW; END; $$`,
    );
    await isolated.pool.query(
      "CREATE TRIGGER test_failure BEFORE INSERT ON audit FOR EACH ROW EXECUTE FUNCTION fail_audit()",
    );
    await expect(
      decide(
        db,
        item.proposal!.id,
        "approved",
        "failure-test",
        "Test atomic publication rollback",
      ),
    ).rejects.toThrow();
    expect(
      await db
        .select()
        .from(decisions)
        .where(eq(decisions.proposalId, item.proposal!.id)),
    ).toHaveLength(0);
    expect(
      await db
        .select()
        .from(versions)
        .where(eq(versions.proposalId, item.proposal!.id)),
    ).toHaveLength(0);
    expect((await published(id)).offer!.wagering).toBe(35);
    expect(
      (
        await db
          .select()
          .from(proposals)
          .where(eq(proposals.id, item.proposal!.id))
      )[0].status,
    ).toBe("pending");
  });
  it("keeps invalid data and unchanged captures out of review", async () => {
    const id = await baseline();
    expect((await ingest(db, id, "same", fixture("v1"))).proposal).toBeNull();
    const bad = await ingest(db, id, "bad", fixture("invalid"));
    expect(bad.proposal).toBeNull();
    expect(bad.extraction.errors.length).toBeGreaterThan(0);
    expect((await published(id)).offer!.currency).toBe("CAD");
  });
  it("enforces immutable history", async () => {
    const id = await baseline();
    await expect(
      db.delete(audit).where(eq(audit.casinoId, id)),
    ).rejects.toThrow();
  });
  it("authenticates admin reads and writes and disables fixture collection outside demo", async () => {
    const token = "a".repeat(40);
    const app = buildApp(db, token, false);
    expect((await app.inject({ url: "/admin/research" })).statusCode).toBe(401);
    expect(
      (await app.inject({ method: "POST", url: "/admin/decide", payload: {} }))
        .statusCode,
    ).toBe(401);
    expect(
      (
        await app.inject({
          method: "POST",
          url: "/admin/collect",
          headers: { authorization: `Bearer ${token}` },
          payload: {},
        })
      ).statusCode,
    ).toBe(404);
    expect(
      (
        await app.inject({
          url: "/admin/research",
          headers: { authorization: `Bearer ${token}` },
        })
      ).statusCode,
    ).toBe(200);
    await app.close();
  });
});
