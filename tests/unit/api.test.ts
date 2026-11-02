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
      .send({ fullName: "Ada", email: "ada@example.com", gradeLevel: 5 })
      .expect(403);
  });
});

describe("validation and errors", () => {
  it("returns 400 on invalid input", async () => {
    const { app } = build();
    await request(app)
      .post("/api/students")
      .set("Authorization", `Bearer ${tokenFor("admin")}`)
      .send({ fullName: "", email: "not-an-email", gradeLevel: 99 })
      .expect(400);
  });

  it("maps a unique violation to 409", async () => {
    const { app, query } = build();
    query.mockRejectedValue(Object.assign(new Error("dup"), { code: "23505" }));
    await request(app)
      .post("/api/students")
      .set("Authorization", `Bearer ${tokenFor("admin")}`)
      .send({ fullName: "Ada", email: "ada@example.com", gradeLevel: 5 })
      .expect(409);
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
