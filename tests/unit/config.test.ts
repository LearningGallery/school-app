import { describe, expect, it } from "vitest";
import { loadConfig } from "../../backend/src/config.js";

describe("loadConfig", () => {
  it("applies defaults", () => {
    const c = loadConfig({
      DATABASE_URL: "postgres://x",
      JWT_SECRET: "x".repeat(32),
    });
    expect(c.PORT).toBe(8080);
  });

  it("refuses a short JWT secret", () => {
    expect(() =>
      loadConfig({ DATABASE_URL: "postgres://x", JWT_SECRET: "short" }),
    ).toThrow(/JWT_SECRET/);
  });

  it("requires DATABASE_URL", () => {
    expect(() => loadConfig({ JWT_SECRET: "x".repeat(32) })).toThrow(
      /DATABASE_URL/,
    );
  });
});
