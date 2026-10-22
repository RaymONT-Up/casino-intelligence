import { connect } from "../../../packages/database/client";
import { buildApp } from "./app";
const { db, pool } = connect();
const app = buildApp(db, process.env.ADMIN_TOKEN ?? "", false);
await app.listen({
  host: process.env.API_HOST ?? "127.0.0.1",
  port: Number(process.env.API_PORT ?? 4000),
});
for (const signal of ["SIGINT", "SIGTERM"])
  process.on(signal, async () => {
    await app.close();
    await pool.end();
    process.exit(0);
  });
