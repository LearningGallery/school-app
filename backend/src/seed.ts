// Dev/test only: creates one synthetic admin. Never run against real data.
import pg from "pg";
import { hashPassword } from "./auth.js";

const url = process.env.DATABASE_URL;
const email = process.env.SEED_ADMIN_EMAIL ?? "admin@example.com";
const password = process.env.SEED_ADMIN_PASSWORD;
if (!url || !password) throw new Error("DATABASE_URL and SEED_ADMIN_PASSWORD are required");

const pool = new pg.Pool({ connectionString: url });
await pool.query(
  `INSERT INTO users (email, password_hash, role, first_name, last_name) VALUES ($1, $2, 'admin', 'School', 'Admin')
   ON CONFLICT (email) DO UPDATE SET password_hash = EXCLUDED.password_hash,
     first_name = COALESCE(users.first_name, EXCLUDED.first_name), last_name = COALESCE(users.last_name, EXCLUDED.last_name)`,
  [email, await hashPassword(password)],
);
await pool.end();
console.log(`seeded ${email}`);
