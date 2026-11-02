import { z } from "zod";

const schema = z.object({
  NODE_ENV: z.string().default("development"),
  PORT: z.coerce.number().int().default(8080),
  DATABASE_URL: z.string().min(1),
  JWT_SECRET: z.string().min(32, "JWT_SECRET must be at least 32 characters"),
  JWT_TTL_SECONDS: z.coerce.number().int().default(3600),
  LOG_LEVEL: z.string().default("info"),
  // Time to keep serving after SIGTERM so the load balancer can deregister the pod.
  SHUTDOWN_DELAY_MS: z.coerce.number().int().default(5000),
});

export type Config = z.infer<typeof schema>;

export function loadConfig(env: NodeJS.ProcessEnv = process.env): Config {
  const parsed = schema.safeParse(env);
  if (!parsed.success) {
    throw new Error(`Invalid configuration: ${z.prettifyError(parsed.error)}`);
  }
  return parsed.data;
}
