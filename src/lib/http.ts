import type { Context } from "hono";

/** Parses the JSON body, returning null on any parse failure instead of throwing. */
export async function parseJsonBody<T>(c: Context): Promise<T | null> {
  try {
    return await c.req.json<T>();
  } catch {
    return null;
  }
}
