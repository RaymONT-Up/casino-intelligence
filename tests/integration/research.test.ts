import { beforeAll, afterAll, it, expect } from "vitest";
import { randomUUID } from "node:crypto";
import { readFile } from "node:fs/promises";
import { connect } from "../../packages/database/client";
import {
  ingestObservation,
  reviewResearch,
  publishedResearch,
  researchState,
} from "../../packages/research/service";
import { observation, termsHtml, directoryHtml } from "../research-fixtures";
const root = connect();
const schema = `research_${randomUUID().replaceAll("-", "")}`;
const url = new URL(process.env.DATABASE_URL!);
url.searchParams.set("options", `-csearch_path=${schema}`);
const connection = connect(url.toString());
const db = connection.db;
beforeAll(async () => {
  await root.pool.query(`CREATE SCHEMA "${schema}"`);
  for (const file of ["001_initial", "002_capture_results", "003_research"])
    await connection.pool.query(
      await readFile(
        new URL(`../../packages/database/${file}.sql`, import.meta.url),
        "utf8",
      ),
    );
});
afterAll(async () => {
  await connection.pool.end();
  await root.pool.query(`DROP SCHEMA "${schema}" CASCADE`);
  await root.pool.end();
});
const terms = (age: number) =>
  observation(termsHtml(age), "https://www.northstarbets.ca/terms-conditions");
it("preserves publication, idempotency, conflicts, immutable history and old evidence", async () => {
  const first = await ingestObservation(
    db,
    "northstar-terms",
    "first",
    terms(19),
  );
  expect(await publishedResearch(db)).toHaveLength(0);
  const approved = await Promise.all(
    [1, 2].map(() =>
      reviewResearch(
        db,
        first.proposal!.id,
        "approved",
        "test",
        "Evidence checked",
      ),
    ),
  );
  expect(approved[0].id).toBe(approved[1].id);
  const a = await ingestObservation(db, "northstar-terms", "a", terms(20));
  const b = await ingestObservation(db, "northstar-terms", "b", terms(21));
  expect((await publishedResearch(db))[0].captureId).toBe(first.captureId);
  await reviewResearch(
    db,
    a.proposal!.id,
    "approved",
    "test",
    "Evidence checked",
  );
  await expect(
    reviewResearch(db, b.proposal!.id, "approved", "test", "Evidence checked"),
  ).rejects.toThrow("baseline changed");
  await reviewResearch(
    db,
    b.proposal!.id,
    "rejected",
    "test",
    "Stale proposal rejected",
  );
  const rejected = await ingestObservation(
    db,
    "northstar-terms",
    "reject",
    terms(22),
  );
  await reviewResearch(
    db,
    rejected.proposal!.id,
    "rejected",
    "test",
    "Unsupported interpretation",
  );
  expect(
    (await ingestObservation(db, "northstar-terms", "reject-again", terms(22)))
      .proposal!.status,
  ).toBe("rejected");
  expect(
    (await ingestObservation(db, "northstar-terms", "first", terms(19)))
      .captureId,
  ).toBe(first.captureId);
  await expect(
    ingestObservation(db, "northstar-terms", "first", terms(25)),
  ).rejects.toThrow("different content");
  const failed = await ingestObservation(db, "northstar-home", "failed", {
    ...observation("Access denied"),
    error: "HTTP 403",
    httpStatus: 403,
  });
  expect(failed.proposal).toBeNull();
  for (let i = 0; i < 51; i++)
    await ingestObservation(db, "northstar-terms", `unchanged-${i}`, terms(20));
  const state = await researchState(db);
  expect(state.captures.some((c) => c.id === first.captureId)).toBe(true);
  expect(state.captures.every((c) => !("raw" in c))).toBe(true);
  await expect(
    connection.pool.query("DELETE FROM research_captures"),
  ).rejects.toThrow();
});
it("serializes opposite decisions and rolls back partial publication", async () => {
  const entry = await ingestObservation(
    db,
    "igo-directory",
    "race",
    observation(directoryHtml()),
  );
  const race = await Promise.allSettled(
    ["approved", "rejected"].map((d) =>
      reviewResearch(
        db,
        entry.proposal!.id,
        d as "approved" | "rejected",
        "test",
        "Concurrent review",
      ),
    ),
  );
  expect(race.filter((r) => r.status === "fulfilled")).toHaveLength(1);
  const next = await ingestObservation(
    db,
    "igo-directory",
    "rollback",
    observation(directoryHtml("B")),
  );
  await connection.pool.query(
    `CREATE FUNCTION fail_pointer() RETURNS trigger LANGUAGE plpgsql AS $$ BEGIN RAISE EXCEPTION 'test pointer failure'; END; $$`,
  );
  await connection.pool.query(
    "CREATE TRIGGER fail_pointer BEFORE UPDATE ON research_sources FOR EACH ROW EXECUTE FUNCTION fail_pointer()",
  );
  await expect(
    reviewResearch(
      db,
      next.proposal!.id,
      "approved",
      "test",
      "Atomic failure test",
    ),
  ).rejects.toThrow();
  const state = await researchState(db);
  expect(state.proposals.find((p) => p.id === next.proposal!.id)!.status).toBe(
    "pending",
  );
  expect(state.decisions.some((d) => d.proposalId === next.proposal!.id)).toBe(
    false,
  );
});
