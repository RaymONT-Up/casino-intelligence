import { existsSync, readFileSync, writeFileSync } from "node:fs";
import { randomBytes } from "node:crypto";
if (!existsSync(".env")) {
  let env = readFileSync(".env.example", "utf8");
  env = env.replaceAll("GENERATE_WITH_PNPM_SETUP", () =>
    randomBytes(24).toString("hex"),
  );
  writeFileSync(".env", env, { mode: 0o600 });
  console.log("Created private .env. Find ADMIN_PASSWORD there to sign in.");
} else console.log(".env already exists; preserved.");
