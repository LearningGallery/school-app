import { runner } from "node-pg-migrate";
import pg from "pg";
import { fileURLToPath } from "node:url";

// Recreates the schema from the real migrations so tests run against what production will run.
export default async function setup() {
  const databaseUrl = process.env.DATABASE_URL;
  if (!databaseUrl)
    throw new Error("DATABASE_URL is required for integration tests");
  const pool = new pg.Pool({ connectionString: databaseUrl });
  await pool.query("DROP SCHEMA public CASCADE; CREATE SCHEMA public;");
  await pool.end();
  await runner({
    databaseUrl,
    dir: fileURLToPath(new URL("../../database/migrations", import.meta.url)),
    direction: "up",
    migrationsTable: "pgmigrations",
    log: () => {},
  });
}
