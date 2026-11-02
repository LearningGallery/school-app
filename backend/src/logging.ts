import { pino, type LoggerOptions } from "pino";

// Secrets must never reach logs: request credentials and anything shaped like a password or connection string.
export const REDACT_PATHS = [
  "req.headers.authorization",
  "req.headers.cookie",
  "res.headers['set-cookie']",
  "*.password",
  "*.passwordHash",
  "*.token",
  "*.DATABASE_URL",
  "*.JWT_SECRET",
];

export function loggerOptions(level: string): LoggerOptions {
  return { level, redact: { paths: REDACT_PATHS, censor: "[redacted]" } };
}

export const createLogger = (level: string) => pino(loggerOptions(level));
