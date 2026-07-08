import type { MiddlewareHandler } from "hono";

/**
 * Structured JSON request logging to stdout, which Cloudflare Workers ships to the
 * dashboard's "Logs" tab (and to Logpush if configured later). Never logs request or
 * response bodies — those may contain passwords, card numbers, or VAT/IBAN PII.
 */
export const requestLogger: MiddlewareHandler = async (c, next) => {
  const start = Date.now();
  const requestId = crypto.randomUUID();
  c.set("requestId" as never, requestId as never);

  await next();

  const durationMs = Date.now() - start;
  const logLine = {
    ts: new Date().toISOString(),
    requestId,
    method: c.req.method,
    path: new URL(c.req.url).pathname,
    status: c.res.status,
    durationMs,
  };

  console.log(JSON.stringify(logLine));
};
