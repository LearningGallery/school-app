import { Router } from "express";
import { z } from "zod";
import type { Deps } from "../app.js";
import { requireAuth, requireRole, signToken, verifyPassword } from "../auth.js";
import type { Metrics } from "../metrics.js";

const id = z.uuid();
const page = z.object({
  limit: z.coerce.number().int().min(1).max(200).default(50),
  offset: z.coerce.number().int().min(0).default(0),
});

const letter = (score: number) =>
  score >= 90 ? "A" : score >= 80 ? "B" : score >= 70 ? "C" : score >= 60 ? "D" : "F";

export function apiRoutes({ config, db, flags }: Deps, metrics: Metrics) {
  const r = Router();
  const authed = requireAuth(config.JWT_SECRET);
  const admin = requireRole("admin");
  const staff = requireRole("admin", "teacher");

  r.post("/auth/login", async (req, res) => {
    const body = z.object({ email: z.email(), password: z.string().min(1) }).parse(req.body);
    const { rows } = await db.query<{
      id: string;
      password_hash: string;
      role: "admin" | "teacher";
    }>("SELECT id, password_hash, role FROM users WHERE email = $1", [body.email.toLowerCase()]);
    const user = rows[0];
    if (!user || !(await verifyPassword(body.password, user.password_hash))) {
      return res.status(401).json({ error: "invalid credentials" });
    }
    res.json({
      token: signToken(
        { sub: user.id, role: user.role },
        config.JWT_SECRET,
        config.JWT_TTL_SECONDS,
      ),
    });
  });

  // ---- students: v3 = CONTRACT phase of full_name -> display_name (module 19) ----
  // Only display_name exists now. This version must not be deployed until every v1 and v2 pod is gone.
  const studentCols = 'id, display_name AS "displayName", email, grade_level AS "gradeLevel"';
  r.get("/students", authed, async (req, res) => {
    const { limit, offset } = page.parse(req.query);
    const { rows } = await db.query(
      `SELECT ${studentCols} FROM students ORDER BY display_name LIMIT $1 OFFSET $2`,
      [limit, offset],
    );
    res.json(rows);
  });
  r.post("/students", authed, admin, async (req, res) => {
    const b = z
      .object({
        displayName: z.string().min(1).max(200),
        email: z.email(),
        gradeLevel: z.number().int().min(1).max(12),
      })
      .parse(req.body);
    const { rows } = await db.query(
      `INSERT INTO students (display_name, email, grade_level) VALUES ($1, $2, $3) RETURNING ${studentCols}`,
      [b.displayName, b.email.toLowerCase(), b.gradeLevel],
    );
    res.status(201).json(rows[0]);
  });
  r.get("/students/:id", authed, async (req, res) => {
    const { rows } = await db.query(`SELECT ${studentCols} FROM students WHERE id = $1`, [
      id.parse(req.params.id),
    ]);
    if (!rows[0]) return res.status(404).json({ error: "not found" });
    res.json(rows[0]);
  });

  // ---- teachers ----
  r.get("/teachers", authed, async (req, res) => {
    const { limit, offset } = page.parse(req.query);
    const { rows } = await db.query(
      'SELECT id, full_name AS "fullName", email FROM teachers ORDER BY full_name LIMIT $1 OFFSET $2',
      [limit, offset],
    );
    res.json(rows);
  });
  r.post("/teachers", authed, admin, async (req, res) => {
    const b = z.object({ fullName: z.string().min(1).max(200), email: z.email() }).parse(req.body);
    const { rows } = await db.query(
      'INSERT INTO teachers (full_name, email) VALUES ($1, $2) RETURNING id, full_name AS "fullName", email',
      [b.fullName, b.email.toLowerCase()],
    );
    res.status(201).json(rows[0]);
  });

  // ---- classes and enrollment ----
  r.get("/classes", authed, async (req, res) => {
    const { limit, offset } = page.parse(req.query);
    const { rows } = await db.query(
      'SELECT id, name, teacher_id AS "teacherId" FROM classes ORDER BY name LIMIT $1 OFFSET $2',
      [limit, offset],
    );
    res.json(rows);
  });
  r.post("/classes", authed, admin, async (req, res) => {
    const b = z
      .object({ name: z.string().min(1).max(100), teacherId: id.optional() })
      .parse(req.body);
    const { rows } = await db.query(
      'INSERT INTO classes (name, teacher_id) VALUES ($1, $2) RETURNING id, name, teacher_id AS "teacherId"',
      [b.name, b.teacherId ?? null],
    );
    res.status(201).json(rows[0]);
  });
  r.post("/classes/:id/enrollments", authed, staff, async (req, res) => {
    try {
      const classId = id.parse(req.params.id);
      const b = z.object({ studentId: id }).parse(req.body);
      await db.query("INSERT INTO enrollments (student_id, class_id) VALUES ($1, $2)", [
        b.studentId,
        classId,
      ]);
      res.status(201).json({ studentId: b.studentId, classId });
    } catch (err) {
      metrics.enrollmentFailures.inc();
      throw err;
    }
  });

  // ---- attendance ----
  r.post("/attendance", authed, staff, async (req, res) => {
    const b = z
      .object({
        studentId: id,
        classId: id,
        date: z.iso.date(),
        status: z.enum(["present", "absent", "late"]),
      })
      .parse(req.body);
    const { rows } = await db.query(
      `INSERT INTO attendance (student_id, class_id, date, status) VALUES ($1, $2, $3, $4)
       ON CONFLICT (student_id, class_id, date) DO UPDATE SET status = EXCLUDED.status
       RETURNING student_id AS "studentId", class_id AS "classId", to_char(date, 'YYYY-MM-DD') AS date, status`,
      [b.studentId, b.classId, b.date, b.status],
    );
    res.status(201).json(rows[0]);
  });
  r.get("/attendance", authed, async (req, res) => {
    const q = z.object({ classId: id, date: z.iso.date() }).parse(req.query);
    const { rows } = await db.query(
      `SELECT student_id AS "studentId", status FROM attendance WHERE class_id = $1 AND date = $2`,
      [q.classId, q.date],
    );
    res.json(rows);
  });

  // ---- grades ----
  r.post("/grades", authed, staff, async (req, res) => {
    const b = z
      .object({
        studentId: id,
        classId: id,
        term: z.string().min(1).max(20),
        score: z.number().min(0).max(100),
      })
      .parse(req.body);
    const { rows } = await db.query(
      `INSERT INTO grades (student_id, class_id, term, score) VALUES ($1, $2, $3, $4)
       ON CONFLICT (student_id, class_id, term) DO UPDATE SET score = EXCLUDED.score
       RETURNING student_id AS "studentId", class_id AS "classId", term, score::float8 AS score`,
      [b.studentId, b.classId, b.term, b.score],
    );
    res.status(201).json(rows[0]);
  });
  r.get("/students/:id/grades", authed, async (req, res) => {
    const studentId = id.parse(req.params.id);
    const { rows } = await db.query<{
      classId: string;
      className: string;
      term: string;
      score: number;
    }>(
      `SELECT g.class_id AS "classId", c.name AS "className", g.term, g.score::float8 AS score
         FROM grades g JOIN classes c ON c.id = g.class_id
        WHERE g.student_id = $1 ORDER BY g.term, c.name`,
      [studentId],
    );
    const withLetters = flags.isEnabled("grade_letters");
    const grades = rows.map((g) => (withLetters ? { ...g, letter: letter(g.score) } : g));
    const average = rows.length ? rows.reduce((s, g) => s + g.score, 0) / rows.length : null;
    res.json({ studentId, grades, average });
  });

  return r;
}
