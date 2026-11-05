import { Router } from "express";
import { z } from "zod";
import type { Deps } from "../app.js";
import { requireAuth, requireRole, signToken, verifyPassword, type Claims } from "../auth.js";
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
      email: string;
      password_hash: string;
      role: "admin" | "teacher";
      first_name: string | null;
      last_name: string | null;
    }>("SELECT id, email, password_hash, role, first_name, last_name FROM users WHERE email = $1", [
      body.email.toLowerCase(),
    ]);
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
      user: {
        id: user.id,
        email: user.email,
        role: user.role,
        firstName: user.first_name ?? "",
        lastName: user.last_name ?? "",
      },
    });
  });

  // ---- students: v3 = CONTRACT phase of full_name -> display_name (module 19) ----
  // Only display_name exists now. This version must not be deployed until every v1 and v2 pod is gone.
  // v4 adds optional profile columns; the same list works on the students table and on an INSERT ... RETURNING CTE.
  const studentCols = `id, display_name AS "displayName", email, grade_level AS "gradeLevel",
    student_number AS "studentNumber", gender, phone_number AS "phoneNumber",
    to_char(date_of_birth, 'YYYY-MM-DD') AS "dateOfBirth", address`;
  r.get("/students", authed, async (req, res) => {
    const { limit, offset } = page.parse(req.query);
    const { rows } = await db.query(
      `SELECT ${studentCols},
         (SELECT c.name FROM enrollments e JOIN classes c ON c.id = e.class_id
           WHERE e.student_id = students.id ORDER BY c.name LIMIT 1) AS "className"
         FROM students ORDER BY display_name LIMIT $1 OFFSET $2`,
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
        gender: z.enum(["Male", "Female", "Other"]).optional(),
        dateOfBirth: z.iso.date().optional(),
        phoneNumber: z.string().max(40).optional(),
        address: z.string().max(500).optional(),
        classId: id.optional(),
      })
      .parse(req.body);
    // One statement: the student and the optional enrollment commit together or not at all.
    const { rows } = await db.query(
      `WITH s AS (
         INSERT INTO students (display_name, email, grade_level, gender, date_of_birth, phone_number, address)
         VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING *
       ), e AS (
         INSERT INTO enrollments (student_id, class_id) SELECT id, $8::uuid FROM s WHERE $8::uuid IS NOT NULL
       )
       SELECT ${studentCols} FROM s`,
      [
        b.displayName,
        b.email.toLowerCase(),
        b.gradeLevel,
        b.gender ?? null,
        b.dateOfBirth ?? null,
        b.phoneNumber ?? null,
        b.address ?? null,
        b.classId ?? null,
      ],
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
      `SELECT c.id, c.name, c.grade, c.section, c.capacity, c.is_active AS "isActive",
              c.teacher_id AS "teacherId", t.full_name AS "teacherName",
              (SELECT count(*) FROM enrollments e WHERE e.class_id = c.id)::int AS "studentCount"
         FROM classes c LEFT JOIN teachers t ON t.id = c.teacher_id
        ORDER BY c.name LIMIT $1 OFFSET $2`,
      [limit, offset],
    );
    res.json(rows);
  });
  r.post("/classes", authed, admin, async (req, res) => {
    const b = z
      .object({
        name: z.string().min(1).max(100),
        teacherId: id.optional(),
        grade: z.string().max(10).optional(),
        section: z.string().max(10).optional(),
        capacity: z.number().int().min(1).max(500).optional(),
      })
      .parse(req.body);
    const { rows } = await db.query(
      `INSERT INTO classes (name, teacher_id, grade, section, capacity) VALUES ($1, $2, $3, $4, COALESCE($5, 40))
       RETURNING id, name, grade, section, capacity, is_active AS "isActive", teacher_id AS "teacherId"`,
      [b.name, b.teacherId ?? null, b.grade ?? null, b.section ?? null, b.capacity ?? null],
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
  r.get("/attendance/summary", authed, async (req, res) => {
    const q = z.object({ date: z.iso.date() }).parse(req.query);
    const { rows } = await db.query(
      `SELECT c.id AS "classId", c.name AS "className", t.full_name AS "teacherName",
              count(*)::int AS total,
              (count(*) FILTER (WHERE a.status = 'present'))::int AS present,
              (count(*) FILTER (WHERE a.status = 'late'))::int AS late,
              (count(*) FILTER (WHERE a.status = 'absent'))::int AS absent
         FROM attendance a JOIN classes c ON c.id = a.class_id LEFT JOIN teachers t ON t.id = c.teacher_id
        WHERE a.date = $1 GROUP BY c.id, c.name, t.full_name ORDER BY c.name`,
      [q.date],
    );
    res.json(rows);
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
        remarks: z.string().max(500).optional(),
      })
      .parse(req.body);
    const { rows } = await db.query(
      `INSERT INTO grades (student_id, class_id, term, score, remarks) VALUES ($1, $2, $3, $4, $5)
       ON CONFLICT (student_id, class_id, term) DO UPDATE SET score = EXCLUDED.score, remarks = EXCLUDED.remarks
       RETURNING student_id AS "studentId", class_id AS "classId", term, score::float8 AS score, remarks`,
      [b.studentId, b.classId, b.term, b.score, b.remarks ?? null],
    );
    res.status(201).json(rows[0]);
  });
  r.get("/grades", authed, staff, async (req, res) => {
    const { limit, offset } = page.parse(req.query);
    const { rows } = await db.query<{ score: number }>(
      `SELECT g.student_id AS "studentId", s.display_name AS "studentName", s.student_number AS "studentNumber",
              g.class_id AS "classId", c.name AS "className", g.term, g.score::float8 AS score, g.remarks
         FROM grades g JOIN students s ON s.id = g.student_id JOIN classes c ON c.id = g.class_id
        ORDER BY s.display_name, g.term, c.name LIMIT $1 OFFSET $2`,
      [limit, offset],
    );
    const withLetters = flags.isEnabled("grade_letters");
    res.json(withLetters ? rows.map((g) => ({ ...g, letter: letter(g.score) })) : rows);
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

  // ---- announcements ----
  const announcementCols = `id, title, content, priority, target_audience AS "targetAudience",
    publish_date AS "publishDate"`;
  r.get("/announcements", authed, async (req, res) => {
    const { limit, offset } = page.parse(req.query);
    const { rows } = await db.query(
      `SELECT ${announcementCols} FROM announcements
        WHERE is_active AND publish_date <= now() AND (expiry_date IS NULL OR expiry_date > now())
        ORDER BY publish_date DESC LIMIT $1 OFFSET $2`,
      [limit, offset],
    );
    res.json(rows);
  });
  r.post("/announcements", authed, staff, async (req, res) => {
    const b = z
      .object({
        title: z.string().min(1).max(200),
        content: z.string().min(1).max(5000),
        priority: z.enum(["low", "medium", "high"]).default("medium"),
        targetAudience: z.enum(["all", "students", "teachers"]).default("all"),
      })
      .parse(req.body);
    const claims = res.locals.claims as Claims;
    const { rows } = await db.query(
      `INSERT INTO announcements (title, content, priority, target_audience, created_by)
       VALUES ($1, $2, $3, $4, $5) RETURNING ${announcementCols}`,
      [b.title, b.content, b.priority, b.targetAudience, claims.sub],
    );
    res.status(201).json(rows[0]);
  });

  // ---- fees (admin only) ----
  // "overdue" is derived on read from a pending fee past its due date, so no job has to flip a status.
  const feeCols = `f.id, f.student_id AS "studentId", s.display_name AS "studentName",
    s.student_number AS "studentNumber", f.fee_type AS "feeType", f.amount::float8 AS amount,
    CASE WHEN f.status = 'pending' AND f.due_date < current_date THEN 'overdue' ELSE f.status END AS status,
    to_char(f.due_date, 'YYYY-MM-DD') AS "dueDate", f.paid_date AS "paidDate"`;
  r.get("/fees", authed, admin, async (req, res) => {
    const { limit, offset } = page.parse(req.query);
    const { rows } = await db.query(
      `SELECT ${feeCols} FROM fee_payments f JOIN students s ON s.id = f.student_id
        ORDER BY f.due_date DESC, s.display_name LIMIT $1 OFFSET $2`,
      [limit, offset],
    );
    res.json(rows);
  });
  r.post("/fees", authed, admin, async (req, res) => {
    const b = z
      .object({
        studentId: id,
        feeType: z.string().min(1).max(100),
        amount: z.number().positive().max(99999999),
        dueDate: z.iso.date(),
      })
      .parse(req.body);
    const { rows } = await db.query(
      `WITH f AS (
         INSERT INTO fee_payments (student_id, fee_type, amount, due_date) VALUES ($1, $2, $3, $4) RETURNING *
       ) SELECT ${feeCols} FROM f JOIN students s ON s.id = f.student_id`,
      [b.studentId, b.feeType, b.amount, b.dueDate],
    );
    res.status(201).json(rows[0]);
  });
  r.patch("/fees/:id/pay", authed, admin, async (req, res) => {
    const { rows } = await db.query(
      `WITH f AS (
         UPDATE fee_payments SET status = 'paid', paid_date = now() WHERE id = $1 RETURNING *
       ) SELECT ${feeCols} FROM f JOIN students s ON s.id = f.student_id`,
      [id.parse(req.params.id)],
    );
    if (!rows[0]) return res.status(404).json({ error: "not found" });
    res.json(rows[0]);
  });

  // ---- dashboard ----
  r.get("/dashboard", authed, async (_req, res) => {
    const [stats, activity] = await Promise.all([
      db.query<{ marked: number; present: number }>(
        `SELECT (SELECT count(*) FROM students)::int AS students,
                (SELECT count(*) FROM classes WHERE is_active)::int AS classes,
                (SELECT count(*) FROM attendance WHERE date = current_date)::int AS marked,
                (SELECT count(*) FROM attendance WHERE date = current_date AND status IN ('present', 'late'))::int AS present,
                (SELECT count(*) FROM announcements WHERE is_active AND publish_date <= now())::int AS announcements`,
      ),
      db.query(
        `(SELECT 'student' AS kind, 'New student enrolled' AS title, display_name AS detail, created_at AS at
            FROM students ORDER BY created_at DESC LIMIT 5)
         UNION ALL
         (SELECT 'announcement', 'Announcement posted', title, created_at
            FROM announcements ORDER BY created_at DESC LIMIT 5)
         UNION ALL
         (SELECT 'fee', 'Fee payment received', s.display_name || ' · ' || f.fee_type, f.paid_date
            FROM fee_payments f JOIN students s ON s.id = f.student_id
           WHERE f.paid_date IS NOT NULL ORDER BY f.paid_date DESC LIMIT 5)
         ORDER BY at DESC LIMIT 6`,
      ),
    ]);
    const s = stats.rows[0]!;
    res.json({
      ...s,
      attendanceTodayPercent: s.marked ? Math.round((s.present / s.marked) * 100) : null,
      activity: activity.rows,
    });
  });

  return r;
}
