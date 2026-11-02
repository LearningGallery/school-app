import { Router } from "express";
import type { Deps } from "../app.js";

/**
 * /healthz  liveness:  the process is up. Never touches dependencies, or a DB blip restarts every pod.
 * /startupz startup:   boot finished (DB reachable once).
 * /readyz   readiness: safe to send traffic now (DB reachable, not shutting down).
 */
export function healthRoutes({ db, state }: Deps) {
  const r = Router();
  r.get("/healthz", (_req, res) => res.json({ status: "ok" }));
  r.get("/startupz", (_req, res) =>
    state.started ? res.json({ status: "started" }) : res.status(503).json({ status: "starting" }),
  );
  r.get("/readyz", async (_req, res) => {
    if (state.shuttingDown) return res.status(503).json({ status: "shutting down" });
    try {
      await db.query("SELECT 1");
      res.json({ status: "ready" });
    } catch {
      res.status(503).json({ status: "database unavailable" });
    }
  });
  return r;
}
