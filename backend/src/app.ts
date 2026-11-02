import express, { type NextFunction, type Request, type Response } from "express";
import helmet from "helmet";
import { pinoHttp } from "pino-http";
import type { Logger } from "pino";
import { ZodError } from "zod";
import type { Config } from "./config.js";
import type { Db } from "./db.js";
import type { FlagProvider } from "./flags.js";
import { createMetrics } from "./metrics.js";
import { healthRoutes } from "./routes/health.js";
import { apiRoutes } from "./routes/api.js";

export interface RuntimeState {
  started: boolean;
  shuttingDown: boolean;
}

export interface Deps {
  config: Pick<Config, "JWT_SECRET" | "JWT_TTL_SECONDS">;
  db: Db;
  flags: FlagProvider;
  logger: Logger;
  state: RuntimeState;
}

export function createApp(deps: Deps) {
  const metrics = createMetrics();
  const app = express();
  app.disable("x-powered-by");
  app.use(helmet());
  app.use(express.json({ limit: "100kb" }));
  app.use(pinoHttp({ logger: deps.logger, autoLogging: { ignore: (r) => r.url === "/metrics" } }));

  app.use((req, res, next) => {
    const end = metrics.httpDuration.startTimer();
    res.on("finish", () => {
      const route = req.route ? `${req.baseUrl}${req.route.path}` : "unmatched";
      const labels = { method: req.method, route, status: String(res.statusCode) };
      metrics.httpRequests.inc(labels);
      end(labels);
    });
    next();
  });

  app.use(healthRoutes(deps));
  app.get("/metrics", async (_req, res) => {
    res.set("Content-Type", metrics.registry.contentType);
    res.send(await metrics.registry.metrics());
  });
  // Mounted under /api so an ALB path rule (/api/* -> backend, /* -> frontend) needs no rewrite.
  app.use("/api", apiRoutes(deps, metrics));

  app.use((_req, res) => res.status(404).json({ error: "not found" }));
  app.use((err: unknown, req: Request, res: Response, _next: NextFunction) => {
    if (err instanceof ZodError) {
      return res.status(400).json({ error: "validation failed", issues: err.issues });
    }
    const code = (err as { code?: string }).code;
    if (code === "23505") return res.status(409).json({ error: "already exists" });
    if (code === "23503") return res.status(404).json({ error: "referenced record not found" });
    req.log.error({ err }, "unhandled error");
    res.status(500).json({ error: "internal error" });
  });

  return app;
}
