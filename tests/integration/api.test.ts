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
          fullName: "Ada Lovelace",
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
      .send({ fullName: "Ada Again", email: "ada@example.com", gradeLevel: 7 })
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
