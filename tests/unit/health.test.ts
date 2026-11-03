import request from "supertest";
import { describe, expect, it } from "vitest";
import { build } from "./helpers.js";

describe("health endpoints", () => {
  it("/healthz is up without touching the database", async () => {
    const { app, query } = build();
    await request(app).get("/healthz").expect(200);
    expect(query).not.toHaveBeenCalled();
  });

  it("/readyz is ready when the database answers", async () => {
    const { app, query } = build();
    query.mockResolvedValue({ rows: [] });
    await request(app).get("/readyz").expect(200);
  });

  it("/readyz fails when the database is down, while /healthz stays up", async () => {
    const { app, query } = build();
    query.mockRejectedValue(new Error("connection refused"));
    await request(app).get("/readyz").expect(503);
    await request(app).get("/healthz").expect(200);
  });

  it("/readyz fails while shutting down", async () => {
    const { app } = build({ state: { shuttingDown: true } });
    await request(app).get("/readyz").expect(503);
  });

  it("/startupz fails until startup finishes", async () => {
    const { app } = build({ state: { started: false } });
    await request(app).get("/startupz").expect(503);
  });
});

describe("request ids", () => {
  it("keeps a sane caller-provided x-request-id and returns it", async () => {
    const { app } = build();
    const res = await request(app)
      .get("/healthz")
      .set("x-request-id", "abc-123")
      .expect(200);
    expect(res.headers["x-request-id"]).toBe("abc-123");
  });

  it("replaces an unsafe or missing id with a fresh one", async () => {
    const { app } = build();
    const bad = await request(app)
      .get("/healthz")
      .set("x-request-id", "x y\tz<script>")
      .expect(200);
    expect(bad.headers["x-request-id"]).toMatch(/^[0-9a-f-]{36}$/);
    const none = await request(app).get("/healthz").expect(200);
    expect(none.headers["x-request-id"]).toMatch(/^[0-9a-f-]{36}$/);
  });
});
