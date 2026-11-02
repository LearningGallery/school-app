import { pino } from "pino";
import { describe, expect, it } from "vitest";
import { loggerOptions } from "../../backend/src/logging.js";

describe("log redaction", () => {
  it("never writes credentials to the log line", () => {
    const lines: string[] = [];
    const log = pino(loggerOptions("info"), {
      write: (s: string) => lines.push(s),
    });
    log.info(
      {
        req: {
          headers: { authorization: "Bearer secret-token", cookie: "sid=abc" },
        },
        user: { password: "hunter2", token: "t0k3n" },
      },
      "request",
    );
    const out = lines.join("");
    for (const secret of ["secret-token", "sid=abc", "hunter2", "t0k3n"])
      expect(out).not.toContain(secret);
    expect(out).toContain("[redacted]");
  });
});
