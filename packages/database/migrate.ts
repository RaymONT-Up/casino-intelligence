import { readFile } from "node:fs/promises";
import { connect } from "./client";
const { pool } = connect();
const client = await pool.connect();
try {
  await client.query("BEGIN");
  await client.query("SELECT pg_advisory_xact_lock(8102026)");
  await client.query(
    "CREATE TABLE IF NOT EXISTS migrations (name text PRIMARY KEY)",
  );
  for (const name of ["001_initial", "002_capture_results", "003_research"]) {
    const found = await client.query(
      "SELECT name FROM migrations WHERE name = $1",
      [name],
    );
    if (!found.rowCount) {
      await client.query(
        await readFile(new URL(`./${name}.sql`, import.meta.url), "utf8"),
      );
      await client.query("INSERT INTO migrations(name) VALUES ($1)", [name]);
    }
  }
  await client.query("COMMIT");
  console.log("Migrations applied");
} catch (error) {
  await client.query("ROLLBACK");
  throw error;
} finally {
  client.release();
  await pool.end();
}
