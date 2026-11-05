import request from "supertest";
import { pino } from "pino";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { createApp } from "../../backend/src/app.js";
import { hashPassword } from "../../backend/src/auth.js";
import { createPool } from "../../backend/src/db.js";
import { EnvFlagProvider } from "../../backend/src/flags.js";

const db = createPool(process.env.DATABASE_URL!);
const app = createApp({
  config: {
    JWT_SECRET: "integration-secret-integration-secret-1",
    JWT_TTL_SECONDS: 60,
  },
  db,
  flags: new EnvFlagProvider({ FLAG_GRADE_LETTERS: "true" }),
  logger: pino({ level: "silent" }),
  state: { started: true, shuttingDown: false },
});

let auth: string;

beforeAll(async () => {
  await db.query(
    "INSERT INTO users (email, password_hash, role) VALUES ($1, $2, 'admin')",
    ["admin@example.com", await hashPassword("integration-pass")],
  );
  const res = await request(app)
    .post("/api/auth/login")
    .send({ email: "admin@example.com", password: "integration-pass" });
  auth = `Bearer ${res.body.token}`;
});
afterAll(() => db.end());

describe("school flow against real Postgres", () => {
  it("readyz reports ready", async () => {
    await request(app).get("/readyz").expect(200);
  });

  it("creates, enrolls, marks attendance, grades and reports", async () => {
    const student = (
      await request(app)
        .post("/api/students")
        .set("Authorization", auth)
        .send({
          displayName: "Ada Lovelace",
          email: "ada@example.com",
          gradeLevel: 7,
        })
        .expect(201)
    ).body;
    const klass = (
      await request(app)
        .post("/api/classes")
        .set("Authorization", auth)
        .send({ name: "Maths" })
        .expect(201)
    ).body;

    await request(app)
      .post(`/api/classes/${klass.id}/enrollments`)
      .set("Authorization", auth)
      .send({ studentId: student.id })
      .expect(201);
    await request(app)
      .post(`/api/classes/${klass.id}/enrollments`)
      .set("Authorization", auth)
      .send({ studentId: student.id })
      .expect(409);

    await request(app)
      .post("/api/attendance")
      .set("Authorization", auth)
      .send({
        studentId: student.id,
        classId: klass.id,
        date: "2026-01-12",
        status: "present",
      })
      .expect(201);
    const att = await request(app)
      .get(`/api/attendance?classId=${klass.id}&date=2026-01-12`)
      .set("Authorization", auth)
      .expect(200);
    expect(att.body).toEqual([{ studentId: student.id, status: "present" }]);

    await request(app)
      .post("/api/grades")
      .set("Authorization", auth)
      .send({
        studentId: student.id,
        classId: klass.id,
        term: "T1",
        score: 88.5,
      })
      .expect(201);
    const report = (
      await request(app)
        .get(`/api/students/${student.id}/grades`)
        .set("Authorization", auth)
        .expect(200)
    ).body;
    expect(report.average).toBe(88.5);
    expect(report.grades[0]).toMatchObject({ className: "Maths", letter: "B" });
  });

  it("rejects a duplicate student email", async () => {
    await request(app)
      .post("/api/students")
      .set("Authorization", auth)
      .send({
        displayName: "Ada Again",
        email: "ada@example.com",
        gradeLevel: 7,
      })
      .expect(409);
  });

  it("records an enrollment failure for an unknown class", async () => {
    const student = (
      await request(app).get("/api/students").set("Authorization", auth)
    ).body[0];
    await request(app)
      .post("/api/classes/7d9b6c0e-3f1a-4b8e-9c55-2a1f6e0d4b11/enrollments")
      .set("Authorization", auth)
      .send({ studentId: student.id })
      .expect(404);
    expect((await request(app).get("/metrics")).text).toMatch(
      /enrollment_failures_total [1-9]/,
    );
  });
});

describe("Edusync modules against real Postgres", () => {
  it("class, student with enrollment, attendance summary, grades list, fees, announcements, dashboard", async () => {
    const klass = (
      await request(app)
        .post("/api/classes")
        .set("Authorization", auth)
        .send({ name: "Physics 10-A", grade: "10", section: "A", capacity: 30 })
        .expect(201)
    ).body;
    const student = (
      await request(app)
        .post("/api/students")
        .set("Authorization", auth)
        .send({
          displayName: "Grace Hopper",
          email: "grace@example.com",
          gradeLevel: 10,
          gender: "Female",
          dateOfBirth: "2009-12-09",
          phoneNumber: "+1 555 0100",
          classId: klass.id,
        })
        .expect(201)
    ).body;
    expect(student.studentNumber).toMatch(/^S\d{8}$/);

    const listed = (
      await request(app).get("/api/students").set("Authorization", auth)
    ).body;
    expect(
      listed.find((s: { id: string }) => s.id === student.id),
    ).toMatchObject({
      className: "Physics 10-A",
      dateOfBirth: "2009-12-09",
    });

    const classes = (
      await request(app).get("/api/classes").set("Authorization", auth)
    ).body;
    expect(
      classes.find((c: { id: string }) => c.id === klass.id),
    ).toMatchObject({
      grade: "10",
      capacity: 30,
      studentCount: 1,
    });

    await request(app)
      .post("/api/attendance")
      .set("Authorization", auth)
      .send({
        studentId: student.id,
        classId: klass.id,
        date: "2026-02-02",
        status: "late",
      })
      .expect(201);
    const summary = (
      await request(app)
        .get("/api/attendance/summary?date=2026-02-02")
        .set("Authorization", auth)
        .expect(200)
    ).body;
    expect(summary).toEqual([
      expect.objectContaining({
        className: "Physics 10-A",
        total: 1,
        present: 0,
        late: 1,
        absent: 0,
      }),
    ]);

    await request(app)
      .post("/api/grades")
      .set("Authorization", auth)
      .send({
        studentId: student.id,
        classId: klass.id,
        term: "Q1",
        score: 95,
        remarks: "Excellent",
      })
      .expect(201);
    const grades = (
      await request(app)
        .get("/api/grades")
        .set("Authorization", auth)
        .expect(200)
    ).body;
    expect(grades).toContainEqual(
      expect.objectContaining({
        studentName: "Grace Hopper",
        term: "Q1",
        remarks: "Excellent",
        letter: "A",
      }),
    );

    const past = (
      await request(app)
        .post("/api/fees")
        .set("Authorization", auth)
        .send({
          studentId: student.id,
          feeType: "Tuition",
          amount: 1200.5,
          dueDate: "2020-01-01",
        })
        .expect(201)
    ).body;
    expect(past).toMatchObject({
      status: "overdue",
      amount: 1200.5,
      studentName: "Grace Hopper",
    });
    const paid = (
      await request(app)
        .patch(`/api/fees/${past.id}/pay`)
        .set("Authorization", auth)
        .expect(200)
    ).body;
    expect(paid.status).toBe("paid");
    await request(app)
      .patch("/api/fees/7d9b6c0e-3f1a-4b8e-9c55-2a1f6e0d4b11/pay")
      .set("Authorization", auth)
      .expect(404);

    await request(app)
      .post("/api/announcements")
      .set("Authorization", auth)
      .send({ title: "Mid-terms", content: "March 15-20", priority: "high" })
      .expect(201);
    const news = (
      await request(app).get("/api/announcements").set("Authorization", auth)
    ).body;
    expect(news[0]).toMatchObject({ title: "Mid-terms", priority: "high" });

    const dash = (
      await request(app)
        .get("/api/dashboard")
        .set("Authorization", auth)
        .expect(200)
    ).body;
    expect(dash.students).toBeGreaterThanOrEqual(2);
    expect(dash.announcements).toBe(1);
    expect(dash.activity.map((a: { kind: string }) => a.kind)).toEqual(
      expect.arrayContaining(["student", "announcement", "fee"]),
    );
  });
});
