import { connect } from "../packages/database/client";
import { sourceDefinitions } from "../packages/research/model";
import { collectSource } from "../packages/research/service";
const { db, pool } = connect();
try {
  for (const source of sourceDefinitions) {
    const result = await collectSource(db, source.id);
    console.log(JSON.stringify({ source: source.id, ...result }));
  }
} finally {
  await pool.end();
}
