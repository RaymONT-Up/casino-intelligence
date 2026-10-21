import { randomUUID } from "node:crypto";
import { connect } from "../../packages/database/client";
import { buildApp } from "../../apps/api/src/app";
import {
  ingestObservation,
  reviewResearch,
} from "../../packages/research/service";
import { directoryHtml, termsHtml, observation } from "../research-fixtures";
const { db, pool } = connect();
for (const sourceId of ["igo-directory", "northstar-terms"] as const) {
  const item = await ingestObservation(
    db,
    sourceId,
    randomUUID(),
    sourceId === "igo-directory"
      ? observation(directoryHtml())
      : observation(
          termsHtml(),
          "https://www.northstarbets.ca/terms-conditions",
        ),
  );
  await reviewResearch(
    db,
    item.proposal!.id,
    "approved",
    "test-setup",
    "Isolated fixture baseline for browser assertions",
  );
}
const app = buildApp(
  db,
  process.env.ADMIN_TOKEN!,
  false,
  async (database, sourceId) => {
    if (sourceId === "northstar-home")
      return ingestObservation(database, sourceId, randomUUID(), {
        ...observation(""),
        httpStatus: 403,
        error: "Source returned HTTP 403",
      });
    return ingestObservation(
      database,
      sourceId,
      randomUUID(),
      sourceId === "igo-directory"
        ? observation(directoryHtml("B"))
        : observation(
            termsHtml(21),
            "https://www.northstarbets.ca/terms-conditions",
          ),
    );
  },
);
await app.listen({ host: "127.0.0.1", port: 4001 });
for (const signal of ["SIGINT", "SIGTERM"])
  process.on(signal, async () => {
    await app.close();
    await pool.end();
    process.exit(0);
  });
