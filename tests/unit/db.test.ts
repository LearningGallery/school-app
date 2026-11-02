import { describe, expect, it } from "vitest";
import { createPool } from "../../backend/src/db.js";

describe("database pool", () => {
  it("survives an error on an idle connection instead of crashing the process", async () => {
    const seen: Error[] = [];
    const pool = createPool("postgres://u:p@127.0.0.1:1/none", (e) =>
      seen.push(e),
    );
    expect(() =>
      (pool as unknown as NodeJS.EventEmitter).emit(
        "error",
        new Error("terminating connection"),
      ),
    ).not.toThrow();
    expect(seen).toHaveLength(1);
    await pool.end();
  });
});
