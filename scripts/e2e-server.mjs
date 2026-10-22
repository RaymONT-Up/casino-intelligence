import pg from "pg";
import { randomUUID } from "node:crypto";
import { spawn } from "node:child_process";
const schema = `e2e_${randomUUID().replaceAll("-", "")}`;
const pool = new pg.Pool({ connectionString: process.env.DATABASE_URL });
await pool.query(`CREATE SCHEMA "${schema}"`);
const url = new URL(process.env.DATABASE_URL);
url.searchParams.set("options", `-csearch_path=${schema}`);
const env = {
  ...process.env,
  DATABASE_URL: url.toString(),
  API_PORT: "4001",
  API_URL: "http://127.0.0.1:4001",
  APP_ORIGIN: "http://127.0.0.1:3001",
  SEO_INDEXING: "disabled",
};
const children = [];
let closing = false;
async function cleanup(code = 0) {
  if (closing) return;
  closing = true;
  await Promise.all(
    children.map(
      (child) =>
        new Promise((resolve) => {
          if (child.exitCode !== null) return resolve();
          child.once("exit", resolve);
          child.kill("SIGTERM");
        }),
    ),
  );
  await pool.query(`DROP SCHEMA "${schema}" CASCADE`);
  await pool.end();
  process.exit(code);
}
for (const signal of ["SIGINT", "SIGTERM"]) process.on(signal, () => cleanup());
function run(args) {
  return new Promise((resolve, reject) => {
    const child = spawn("pnpm", args, { env, stdio: "inherit" });
    child.on("error", reject);
    child.on("exit", (code) =>
      code === 0
        ? resolve()
        : reject(new Error(`pnpm ${args.join(" ")} failed`)),
    );
  });
}
try {
  await run(["db:migrate"]);
  children.push(
    spawn("node", ["--import", "tsx", "tests/e2e/server.ts"], {
      env,
      stdio: "inherit",
    }),
  );
  children.push(
    spawn(
      "node",
      [
        "node_modules/next/dist/bin/next",
        "dev",
        "apps/web",
        "--hostname",
        "127.0.0.1",
        "--port",
        "3001",
      ],
      { env, stdio: "inherit" },
    ),
  );
  for (const child of children)
    child.on("exit", (code) => {
      if (!closing) void cleanup(code ?? 1);
    });
} catch (error) {
  console.error(error);
  await cleanup(1);
}
