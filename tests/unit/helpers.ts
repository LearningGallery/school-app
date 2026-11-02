import { pino } from "pino";
import { vi } from "vitest";
import { createApp, type RuntimeState } from "../../backend/src/app.js";
import { EnvFlagProvider } from "../../backend/src/flags.js";
import { signToken, type Role } from "../../backend/src/auth.js";

export const SECRET = "test-secret-test-secret-test-secret-123";

export function build(
  opts: { env?: NodeJS.ProcessEnv; state?: Partial<RuntimeState> } = {},
) {
  const query = vi.fn();
  const state: RuntimeState = {
    started: true,
    shuttingDown: false,
    ...opts.state,
  };
  const app = createApp({
    config: { JWT_SECRET: SECRET, JWT_TTL_SECONDS: 60 },
    db: { query, end: vi.fn() },
    flags: new EnvFlagProvider(opts.env ?? {}),
    logger: pino({ level: "silent" }),
    state,
  });
  return { app, query, state };
}

export const tokenFor = (role: Role) =>
  signToken({ sub: "u1", role }, SECRET, 60);
