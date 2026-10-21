import { drizzle } from "drizzle-orm/node-postgres";
import pg from "pg";
import * as schema from "./schema";
export function connect(url = process.env.DATABASE_URL) {
  if (!url) throw new Error("DATABASE_URL is required");
  const pool = new pg.Pool({ connectionString: url, max: 8 });
  return { db: drizzle(pool, { schema, casing: "snake_case" }), pool };
}
export type Database = ReturnType<typeof connect>["db"];
