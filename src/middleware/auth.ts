import type { MiddlewareHandler } from "hono";

export interface AuthEnv {
  Bindings: {
    RAPIDAPI_PROXY_SECRET?: string;
    ALLOW_DIRECT_ACCESS?: string;
  };
}

/**
 * Rejects requests that didn't come through the RapidAPI proxy, so the API can't be
 * used for free by bypassing RapidAPI's billing/quota enforcement. RapidAPI signs every
 * proxied request with a per-app secret in X-RapidAPI-Proxy-Secret.
 *
 * ALLOW_DIRECT_ACCESS=true is intended for local development / self-hosted deployments
 * only — never set it in the production Worker.
 */
export const rapidApiAuth: MiddlewareHandler<AuthEnv> = async (c, next) => {
  if (c.env.ALLOW_DIRECT_ACCESS === "true") {
    return next();
  }

  const expected = c.env.RAPIDAPI_PROXY_SECRET;
  const provided = c.req.header("X-RapidAPI-Proxy-Secret");

  if (!expected || !provided || provided !== expected) {
    return c.json({ error: "unauthorized", message: "This API must be accessed via RapidAPI." }, 401);
  }

  return next();
};
