import {
  captureEvidence,
  collectSource,
  researchState,
  publishedResearch,
  reviewResearch,
} from "../../../packages/research/service";
import { sourceDefinitions } from "../../../packages/research/model";
import Fastify from "fastify";
import rateLimit from "@fastify/rate-limit";
import { timingSafeEqual } from "node:crypto";
import { z, ZodError } from "zod";
import type { Database } from "../../../packages/database/client";
import {
  adminState,
  publicCatalog,
  ingest,
  decide,
} from "../../../packages/data-ingestion/service";
import { Conflict } from "../../../packages/domain";
import { catalog, fixture, fixtureNames } from "../../../fixtures/catalog";
export function buildApp(
  db: Database,
  token: string,
  demo = false,
  collector = collectSource,
) {
  if (token.length < 32)
    throw new Error("ADMIN_TOKEN must have at least 32 characters");
  const app = Fastify({
    logger: { redact: ["req.headers.authorization", "req.headers.cookie"] },
    bodyLimit: 16384,
  });
  app.register(rateLimit, { max: 100, timeWindow: "1 minute" });
  app.addHook("onRequest", async (req, reply) => {
    if (!req.url.startsWith("/admin/")) return;
    const supplied = Buffer.from(req.headers.authorization ?? "");
    const expected = Buffer.from(`Bearer ${token}`);
    if (
      supplied.length !== expected.length ||
      !timingSafeEqual(supplied, expected)
    ) {
      return reply.code(401).send({ error: "Unauthorized" });
    }
  });
  app.setErrorHandler((error, _req, reply) => {
    if (error instanceof ZodError)
      return reply
        .code(400)
        .send({ error: "Invalid input", issues: error.issues });
    if (error instanceof Conflict)
      return reply.code(409).send({ error: error.message });
    if (
      error instanceof Error &&
      "statusCode" in error &&
      typeof error.statusCode === "number" &&
      error.statusCode < 500
    )
      return reply.code(error.statusCode).send({ error: error.message });
    app.log.error(error);
    return reply.code(500).send({ error: "Internal error" });
  });
  app.get("/health", async () => ({
    status: "ok",
    collector: "allowlisted-public-sources",
  }));
  app.get("/research", () => publishedResearch(db));
  app.get("/admin/research", () => researchState(db));
  app.post("/admin/research-evidence", async (req) => {
    const { id } = z.object({ id: z.uuid() }).strict().parse(req.body);
    return captureEvidence(db, id);
  });
  app.post("/admin/research-collect", async (req) => {
    const { sourceId } = z
      .object({
        sourceId: z.enum(
          sourceDefinitions.map((s) => s.id) as [
            (typeof sourceDefinitions)[number]["id"],
            ...(typeof sourceDefinitions)[number]["id"][],
          ],
        ),
      })
      .strict()
      .parse(req.body);
    return collector(db, sourceId);
  });
  app.post("/admin/research-review", async (req) => {
    const input = z
      .object({
        id: z.uuid(),
        decision: z.enum(["approved", "rejected"]),
        rationale: z.string().trim().min(10).max(1000),
      })
      .strict()
      .parse(req.body);
    return reviewResearch(
      db,
      input.id,
      input.decision,
      "local-editor",
      input.rationale,
    );
  });
  if (demo) {
    app.get("/casinos", () => publicCatalog(db));
    app.get("/admin/state", () => adminState(db));
    app.post("/admin/collect", async (req, reply) => {
      if (!demo)
        return reply.code(404).send({ error: "Demo collection disabled" });
      const input = z
        .object({
          casinoId: z.enum(catalog.map((c) => c.id) as [string, ...string[]]),
          fixture: z.enum(fixtureNames),
          captureKey: z.string().min(1).max(100),
        })
        .strict()
        .parse(req.body);
      return ingest(
        db,
        input.casinoId,
        input.captureKey,
        fixture(input.fixture),
      );
    });
    app.post("/admin/decide", async (req) => {
      const input = z
        .object({
          proposalId: z.uuid(),
          decision: z.enum(["approved", "rejected"]),
          rationale: z.string().trim().min(10).max(1000),
        })
        .strict()
        .parse(req.body);
      return decide(
        db,
        input.proposalId,
        input.decision,
        "local-editor",
        input.rationale,
      );
    });
  }
  return app;
}
