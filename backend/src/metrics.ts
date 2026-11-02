import client from "prom-client";

export function createMetrics() {
  const registry = new client.Registry();
  client.collectDefaultMetrics({ register: registry });

  const httpRequests = new client.Counter({
    name: "http_requests_total",
    help: "HTTP requests by method, route and status code",
    labelNames: ["method", "route", "status"],
    registers: [registry],
  });
  const httpDuration = new client.Histogram({
    name: "http_request_duration_seconds",
    help: "HTTP request latency",
    labelNames: ["method", "route", "status"],
    buckets: [0.005, 0.01, 0.025, 0.05, 0.1, 0.25, 0.5, 1, 2.5],
    registers: [registry],
  });
  // Business signal used by the canary AnalysisTemplate in a later module.
  const enrollmentFailures = new client.Counter({
    name: "enrollment_failures_total",
    help: "Failed attempts to enroll a student in a class",
    registers: [registry],
  });

  return { registry, httpRequests, httpDuration, enrollmentFailures };
}

export type Metrics = ReturnType<typeof createMetrics>;
