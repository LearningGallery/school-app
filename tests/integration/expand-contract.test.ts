import { runner } from "node-pg-migrate";
import pg from "pg";
import { fileURLToPath } from "node:url";
import { afterAll, beforeAll, describe, expect, it } from "vitest";

/**
 * The expand/contract exercise (module 19), executed against a real PostgreSQL.
 * Each "app version" is just the SQL it runs; the schema moves one migration at a time.
 *   v1: reads and writes full_name
 *   v2: writes BOTH columns, reads COALESCE(display_name, full_name)   (compatible with v1 and with the new schema)
 *   v3: reads and writes display_name only                             (only safe after the contract step)
 */
const MIGRATIONS = fileURLToPath(
  new URL("../../database/migrations", import.meta.url),
);
const base = new URL(process.env.DATABASE_URL!);
const dbName = "school_expand_contract";
const url = (name: string) => {
  const u = new URL(base);
  u.pathname = `/${name}`;
  return u.toString();
};

const v1 = {
  insert: (db: pg.Pool, name: string, n: number) =>
    db.query(
      "INSERT INTO students (full_name, email, grade_level) VALUES ($1, $2, 5)",
      [name, `v1-${n}@example.com`],
    ),
  read: (db: pg.Pool) =>
    db.query("SELECT full_name AS name FROM students ORDER BY 1"),
};
const v2 = {
  insert: (db: pg.Pool, name: string, n: number) =>
    db.query(
      "INSERT INTO students (full_name, display_name, email, grade_level) VALUES ($1, $1, $2, 5)",
      [name, `v2-${n}@example.com`],
    ),
  read: (db: pg.Pool) =>
    db.query(
      "SELECT COALESCE(display_name, full_name) AS name FROM students ORDER BY 1",
    ),
};

const v3 = {
  insert: (db: pg.Pool, name: string, n: number) =>
    db.query(
      "INSERT INTO students (display_name, email, grade_level) VALUES ($1, $2, 5)",
      [name, `v3-${n}@example.com`],
    ),
  read: (db: pg.Pool) =>
    db.query("SELECT display_name AS name FROM students ORDER BY 1"),
};

let admin: pg.Pool;
let db: pg.Pool;

async function migrate(count: number) {
  await runner({
    databaseUrl: url(dbName),
    dir: MIGRATIONS,
    direction: "up",
    migrationsTable: "pgmigrations",
    count,
    log: () => {},
  });
}

beforeAll(async () => {
  admin = new pg.Pool({ connectionString: url("postgres") });
  await admin.query(`DROP DATABASE IF EXISTS ${dbName} WITH (FORCE)`);
  await admin.query(`CREATE DATABASE ${dbName}`);
  db = new pg.Pool({ connectionString: url(dbName) });
});
afterAll(async () => {
  await db.end();
  await admin.query(`DROP DATABASE IF EXISTS ${dbName} WITH (FORCE)`);
  await admin.end();
});

describe("expand and contract: full_name -> display_name", () => {
  it("phase 0 (v1 schema): v1 works, v2 cannot run yet because the new column does not exist", async () => {
    await migrate(1);
    await v1.insert(db, "Ada", 1);
    expect((await v1.read(db)).rows).toEqual([{ name: "Ada" }]);
    await expect(v2.read(db)).rejects.toThrow(/display_name/);
  });

  it("phase 1 (EXPAND): old and new app versions both work on the same database", async () => {
    await migrate(1); // 1700000001000_v2-expand-add-display-name
    await v1.insert(db, "Grace", 2); // a v1 pod still running during the rollout
    await v2.insert(db, "Alan", 3); // a v2 pod
    expect((await v1.read(db)).rows.map((r) => r.name)).toEqual([
      "Ada",
      "Alan",
      "Grace",
    ]);
    // v2 falls back to full_name for rows that have no display_name yet
    expect((await v2.read(db)).rows.map((r) => r.name)).toEqual([
      "Ada",
      "Alan",
      "Grace",
    ]);
  });

  it("phase 2 (BACKFILL): existing rows get display_name; rows written by v1 afterwards still need it", async () => {
    await migrate(1); // 1700000002000_v2-backfill-display-name
    const filled = await db.query(
      "SELECT count(*)::int AS n FROM students WHERE display_name IS NULL",
    );
    expect(filled.rows[0].n).toBe(0);
    await v1.insert(db, "Barbara", 4); // v1 does not know display_name, so it leaves it NULL
    const gap = await db.query(
      "SELECT count(*)::int AS n FROM students WHERE display_name IS NULL",
    );
    expect(gap.rows[0].n).toBe(1); // run the backfill again before the contract step
    await db.query(
      "UPDATE students SET display_name = full_name WHERE display_name IS NULL",
    );
  });

  it("phase 3 (CONTRACT): v3 works; v1 and v2 break at once, and so does rolling back to them", async () => {
    await migrate(1); // 1700000003000_v3-contract-drop-full-name
    await v3.insert(db, "Margaret", 5);
    expect((await v3.read(db)).rows.map((r) => r.name)).toEqual([
      "Ada",
      "Alan",
      "Barbara",
      "Grace",
      "Margaret",
    ]);
    await expect(v1.insert(db, "Late", 6)).rejects.toThrow(/full_name/); // a straggling v1 pod
    await expect(v2.insert(db, "Rollback", 7)).rejects.toThrow(/full_name/); // roll back v3 -> v2: still broken
    await expect(v2.read(db)).rejects.toThrow(/full_name/);
  });
});

describe("dropping the column too early", () => {
  it("breaks the running v1 version immediately: the contract step must wait for the last old pod", async () => {
    await admin.query(`DROP DATABASE IF EXISTS ${dbName} WITH (FORCE)`);
    await admin.query(`CREATE DATABASE ${dbName}`);
    const fresh = new pg.Pool({ connectionString: url(dbName) });
    await migrate(4); // v1 schema, expand, backfill, contract in one go: what skipping the staged rollout does
    await expect(
      fresh.query(
        "INSERT INTO students (full_name, email, grade_level) VALUES ('X', 'x@example.com', 5)",
      ),
    ).rejects.toThrow(/full_name/);
    await fresh.end();
  });
});
