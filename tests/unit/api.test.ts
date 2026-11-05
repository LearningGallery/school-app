import request from "supertest";
import { describe, expect, it } from "vitest";
import { hashPassword } from "../../backend/src/auth.js";
import { build, tokenFor } from "./helpers.js";

const UUID = "7d9b6c0e-3f1a-4b8e-9c55-2a1f6e0d4b11";

describe("auth", () => {
  it("rejects requests without a token", async () => {
    const { app } = build();
    await request(app).get("/api/students").expect(401);
  });

  it("rejects a token signed with another secret", async () => {
    const { app } = build();
    await request(app)
      .get("/api/students")
      .set("Authorization", "Bearer abc.def.ghi")
      .expect(401);
  });

  it("logs in with the right password and refuses the wrong one", async () => {
    const { app, query } = build();
    const hash = await hashPassword("correct-horse");
    query.mockResolvedValue({
      rows: [{ id: UUID, password_hash: hash, role: "admin" }],
    });
    const ok = await request(app)
      .post("/api/auth/login")
      .send({ email: "a@example.com", password: "correct-horse" });
    expect(ok.status).toBe(200);
    expect(ok.body.token).toBeTruthy();
    await request(app)
      .post("/api/auth/login")
      .send({ email: "a@example.com", password: "nope" })
      .expect(401);
  });

  it("teachers cannot create students", async () => {
    const { app } = build();
    await request(app)
      .post("/api/students")
      .set("Authorization", `Bearer ${tokenFor("teacher")}`)
      .send({ displayName: "Ada", email: "ada@example.com", gradeLevel: 5 })
      .expect(403);
  });
});

describe("validation and errors", () => {
  it("returns 400 on invalid input", async () => {
    const { app } = build();
    await request(app)
      .post("/api/students")
      .set("Authorization", `Bearer ${tokenFor("admin")}`)
      .send({ displayName: "", email: "not-an-email", gradeLevel: 99 })
      .expect(400);
  });

  it("maps a unique violation to 409", async () => {
    const { app, query } = build();
    query.mockRejectedValue(Object.assign(new Error("dup"), { code: "23505" }));
    await request(app)
      .post("/api/students")
      .set("Authorization", `Bearer ${tokenFor("admin")}`)
      .send({ displayName: "Ada", email: "ada@example.com", gradeLevel: 5 })
      .expect(409);
  });
});

describe("students: contract phase (v3)", () => {
  const row = {
    id: UUID,
    displayName: "Ada",
    email: "ada@example.com",
    gradeLevel: 5,
  };

  it("writes only display_name", async () => {
    const { app, query } = build();
    query.mockResolvedValue({ rows: [row] });
    await request(app)
      .post("/api/students")
      .set("Authorization", `Bearer ${tokenFor("admin")}`)
      .send({ displayName: "Ada", email: "ada@example.com", gradeLevel: 5 })
      .expect(201);
    const sql = (query.mock.calls[0] as [string])[0];
    expect(sql).toMatch(/INSERT INTO students \(display_name,/);
    expect(sql).not.toMatch(/full_name/);
  });

  it("no longer accepts the v1 field fullName", async () => {
    const { app } = build();
    await request(app)
      .post("/api/students")
      .set("Authorization", `Bearer ${tokenFor("admin")}`)
      .send({ fullName: "Ada", email: "ada@example.com", gradeLevel: 5 })
      .expect(400);
  });
});

describe("feature flag and metrics", () => {
  const grades = {
    rows: [{ classId: UUID, className: "Maths", term: "T1", score: 91 }],
  };

  it("hides letter grades by default", async () => {
    const { app, query } = build();
    query.mockResolvedValue(grades);
    const res = await request(app)
      .get(`/api/students/${UUID}/grades`)
      .set("Authorization", `Bearer ${tokenFor("admin")}`);
    expect(res.body.grades[0].letter).toBeUndefined();
    expect(res.body.average).toBe(91);
  });

  it("shows letter grades when FLAG_GRADE_LETTERS=true", async () => {
    const { app, query } = build({ env: { FLAG_GRADE_LETTERS: "true" } });
    query.mockResolvedValue(grades);
    const res = await request(app)
      .get(`/api/students/${UUID}/grades`)
      .set("Authorization", `Bearer ${tokenFor("admin")}`);
    expect(res.body.grades[0].letter).toBe("A");
  });

  it("counts failed enrollments and exposes them on /metrics", async () => {
    const { app, query } = build();
    query.mockRejectedValue(Object.assign(new Error("fk"), { code: "23503" }));
    await request(app)
      .post(`/api/classes/${UUID}/enrollments`)
      .set("Authorization", `Bearer ${tokenFor("admin")}`)
      .send({ studentId: UUID })
      .expect(404);
    const metrics = await request(app).get("/metrics");
    expect(metrics.text).toMatch(/enrollment_failures_total 1/);
    expect(metrics.text).toMatch(/http_request_duration_seconds_bucket/);
  });
});

describe("Edusync modules", () => {
  const admin = () => `Bearer ${tokenFor("admin")}`;
  const teacher = () => `Bearer ${tokenFor("teacher")}`;

  it("login returns the profile next to the token", async () => {
    const { app, query } = build();
    query.mockResolvedValue({
      rows: [
        {
          id: UUID,
          email: "a@example.com",
          password_hash: await hashPassword("pw"),
          role: "admin",
          first_name: "Ada",
          last_name: null,
        },
      ],
    });
    const res = await request(app)
      .post("/api/auth/login")
      .send({ email: "a@example.com", password: "pw" })
      .expect(200);
    expect(res.body.user).toEqual({
      id: UUID,
      email: "a@example.com",
      role: "admin",
      firstName: "Ada",
      lastName: "",
    });
  });

  it("creating a student with a class enrolls in the same statement", async () => {
    const { app, query } = build();
    query.mockResolvedValue({ rows: [{ id: UUID }] });
    await request(app)
      .post("/api/students")
      .set("Authorization", admin())
      .send({
        displayName: "Ada",
        email: "ada@example.com",
        gradeLevel: 5,
        classId: UUID,
      })
      .expect(201);
    expect(query).toHaveBeenCalledTimes(1);
    const [sql, params] = query.mock.calls[0] as [string, unknown[]];
    expect(sql).toMatch(/INSERT INTO enrollments/);
    expect(params[7]).toBe(UUID);
  });

  it("fees are admin only", async () => {
    const { app } = build();
    await request(app)
      .get("/api/fees")
      .set("Authorization", teacher())
      .expect(403);
    await request(app)
      .post("/api/fees")
      .set("Authorization", teacher())
      .send({
        studentId: UUID,
        feeType: "Tuition",
        amount: 10,
        dueDate: "2026-01-01",
      })
      .expect(403);
  });

  it("rejects a non-positive fee amount", async () => {
    const { app } = build();
    await request(app)
      .post("/api/fees")
      .set("Authorization", admin())
      .send({
        studentId: UUID,
        feeType: "Tuition",
        amount: 0,
        dueDate: "2026-01-01",
      })
      .expect(400);
  });

  it("paying an unknown fee is a 404", async () => {
    const { app, query } = build();
    query.mockResolvedValue({ rows: [] });
    await request(app)
      .patch(`/api/fees/${UUID}/pay`)
      .set("Authorization", admin())
      .expect(404);
  });

  it("teachers can post announcements; an unknown priority is rejected", async () => {
    const { app, query } = build();
    query.mockResolvedValue({ rows: [{ id: UUID, title: "Hi" }] });
    await request(app)
      .post("/api/announcements")
      .set("Authorization", teacher())
      .send({ title: "Hi", content: "Exams on Monday" })
      .expect(201);
    await request(app)
      .post("/api/announcements")
      .set("Authorization", teacher())
      .send({ title: "Hi", content: "x", priority: "urgent" })
      .expect(400);
  });

  it("dashboard computes the attendance percentage, and null when nothing is marked", async () => {
    const { app, query } = build();
    query
      .mockResolvedValueOnce({
        rows: [
          { students: 4, classes: 2, marked: 8, present: 6, announcements: 1 },
        ],
      })
      .mockResolvedValueOnce({ rows: [] });
    const res = await request(app)
      .get("/api/dashboard")
      .set("Authorization", admin())
      .expect(200);
    expect(res.body).toMatchObject({
      students: 4,
      attendanceTodayPercent: 75,
      activity: [],
    });

    query
      .mockResolvedValueOnce({
        rows: [
          { students: 0, classes: 0, marked: 0, present: 0, announcements: 0 },
        ],
      })
      .mockResolvedValueOnce({ rows: [] });
    const empty = await request(app)
      .get("/api/dashboard")
      .set("Authorization", admin());
    expect(empty.body.attendanceTodayPercent).toBeNull();
  });

  it("the all-grades list honours the grade_letters flag", async () => {
    const rows = [
      { studentName: "Ada", className: "Maths", term: "T1", score: 82 },
    ];
    const off = build();
    off.query.mockResolvedValue({ rows });
    expect(
      (await request(off.app).get("/api/grades").set("Authorization", admin()))
        .body[0].letter,
    ).toBeUndefined();
    const on = build({ env: { FLAG_GRADE_LETTERS: "true" } });
    on.query.mockResolvedValue({ rows });
    expect(
      (await request(on.app).get("/api/grades").set("Authorization", admin()))
        .body[0].letter,
    ).toBe("B");
  });

  it("attendance summary needs a valid date", async () => {
    const { app } = build();
    await request(app)
      .get("/api/attendance/summary?date=nope")
      .set("Authorization", admin())
      .expect(400);
  });
});
