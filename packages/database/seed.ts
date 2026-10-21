import { connect } from "./client";
import { casinos } from "./schema";
import { catalog, fixture } from "../../fixtures/catalog";
import { ingest, decide } from "../data-ingestion/service";
const { db, pool } = connect();
try {
  for (const casino of catalog) {
    await db.insert(casinos).values(casino).onConflictDoNothing();
    const result = await ingest(
      db,
      casino.id,
      "demo-bootstrap-v1",
      fixture("v1"),
    );
    if (result.proposal?.status === "pending")
      await decide(
        db,
        result.proposal.id,
        "approved",
        "demo-bootstrap (simulated)",
        "Synthetic baseline for the demonstration. No real operator or license has been verified.",
      );
  }
  console.log(
    "Three fictional operators seeded. Baseline decisions explicitly marked simulated.",
  );
} finally {
  await pool.end();
}
