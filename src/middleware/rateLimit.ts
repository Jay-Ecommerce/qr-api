import type { MiddlewareHandler } from "hono";

/**
 * Best-effort per-isolate rate limit as defense-in-depth behind RapidAPI's own
 * per-plan quota enforcement (which is the primary, durable rate limit). Workers
 * isolates are ephemeral and regionally distributed, so this window is NOT globally
 * consistent — it only guards against a single hot isolate being hammered, e.g. by a
 * misbehaving retry loop.
 */
const WINDOW_MS = 10_000;
const MAX_REQUESTS_PER_WINDOW = 50;

const hits = new Map<string, number[]>();

function pruneOld(timestamps: number[], now: number): number[] {
  return timestamps.filter((t) => now - t < WINDOW_MS);
}

export const localRateLimit: MiddlewareHandler = async (c, next) => {
  const identity = c.req.header("X-RapidAPI-User") ?? c.req.header("CF-Connecting-IP") ?? "unknown";
  const now = Date.now();

  const existing = pruneOld(hits.get(identity) ?? [], now);
  existing.push(now);
  hits.set(identity, existing);

  if (existing.length > MAX_REQUESTS_PER_WINDOW) {
    return c.json({ error: "rate_limited", message: "Too many requests, slow down." }, 429);
  }

  return next();
};
