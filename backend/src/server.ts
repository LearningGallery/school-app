import { createApp, type RuntimeState } from "./app.js";
import { loadConfig } from "./config.js";
import { createPool } from "./db.js";
import { EnvFlagProvider } from "./flags.js";
import { createLogger } from "./logging.js";

const config = loadConfig();
const logger = createLogger(config.LOG_LEVEL);
const db = createPool(config.DATABASE_URL, (err) =>
  logger.error({ err }, "idle database connection failed"),
);
const state: RuntimeState = { started: false, shuttingDown: false };

const app = createApp({ config, db, flags: new EnvFlagProvider(), logger, state });
const server = app.listen(config.PORT, () => logger.info({ port: config.PORT }, "listening"));

// Startup: listen first so probes get answers, flip `started` once the DB is reachable.
(async () => {
  for (let attempt = 1; ; attempt++) {
    try {
      await db.query("SELECT 1");
      state.started = true;
      logger.info("startup complete");
      return;
    } catch (err) {
      logger.warn({ err, attempt }, "database not reachable yet");
      await new Promise((r) => setTimeout(r, 2000));
    }
  }
})();

// Graceful shutdown: fail readiness first, keep serving while the load balancer deregisters, then drain.
let stopping = false;
async function shutdown(signal: string) {
  if (stopping) return;
  stopping = true;
  logger.info({ signal }, "shutting down");
  state.shuttingDown = true;
  await new Promise((r) => setTimeout(r, config.SHUTDOWN_DELAY_MS));
  server.close(async () => {
    await db.end();
    process.exit(0);
  });
  setTimeout(() => process.exit(1), 10000).unref();
}
process.on("SIGTERM", () => void shutdown("SIGTERM"));
process.on("SIGINT", () => void shutdown("SIGINT"));
