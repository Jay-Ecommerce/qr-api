import { describe, it, expect } from "vitest";
import app from "../src/index.js";

const TEST_ENV = { RAPIDAPI_PROXY_SECRET: "test-secret" };
const AUTH_HEADERS = { "X-RapidAPI-Proxy-Secret": "test-secret" };

/** Test-only helper: response bodies are untyped JSON, so read them as `any` here. */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
async function readJson(res: Response): Promise<any> {
  return res.json();
}

describe("GET /health", () => {
  it("responds ok without requiring auth", async () => {
    const res = await app.request("/health", {}, {});
    expect(res.status).toBe(200);
    const body = await readJson(res);
    expect(body.status).toBe("ok");
  });
});

describe("RapidAPI auth middleware", () => {
  it("rejects /v1 requests missing the proxy secret", async () => {
    const res = await app.request("/v1/qr?data=test", {}, TEST_ENV);
    expect(res.status).toBe(401);
  });

  it("allows requests with the correct proxy secret", async () => {
    const res = await app.request("/v1/qr?data=test", { headers: AUTH_HEADERS }, TEST_ENV);
    expect(res.status).toBe(200);
  });

  it("allows direct access when ALLOW_DIRECT_ACCESS=true", async () => {
    const res = await app.request("/v1/qr?data=test", {}, { ALLOW_DIRECT_ACCESS: "true" });
    expect(res.status).toBe(200);
  });
});

describe("GET /v1/qr", () => {
  it("returns an SVG image for valid data", async () => {
    const res = await app.request("/v1/qr?data=hello", { headers: AUTH_HEADERS }, TEST_ENV);
    expect(res.status).toBe(200);
    expect(res.headers.get("Content-Type")).toBe("image/svg+xml");
    const body = await res.text();
    expect(body).toMatch(/^<svg /);
  });

  it("rejects a missing data parameter", async () => {
    const res = await app.request("/v1/qr", { headers: AUTH_HEADERS }, TEST_ENV);
    expect(res.status).toBe(400);
  });

  it("rejects data over the length limit", async () => {
    const longData = "a".repeat(2001);
    const res = await app.request(`/v1/qr?data=${longData}`, { headers: AUTH_HEADERS }, TEST_ENV);
    expect(res.status).toBe(400);
  });

  it("rejects an invalid cellSize", async () => {
    const res = await app.request("/v1/qr?data=test&cellSize=999", { headers: AUTH_HEADERS }, TEST_ENV);
    expect(res.status).toBe(400);
  });

  it("rejects a malicious color parameter instead of embedding it unescaped", async () => {
    const res = await app.request(
      `/v1/qr?data=test&color=${encodeURIComponent('red"/><script>alert(1)</script>')}`,
      { headers: AUTH_HEADERS },
      TEST_ENV,
    );
    expect(res.status).toBe(400);
  });

  it("accepts a valid custom color and cellSize", async () => {
    const res = await app.request("/v1/qr?data=test&color=ff0000&bgColor=fff&cellSize=12", { headers: AUTH_HEADERS }, TEST_ENV);
    expect(res.status).toBe(200);
    const body = await res.text();
    expect(body).toContain("#ff0000");
  });
});

describe("GET /v1/qr/matrix", () => {
  it("returns a JSON matrix", async () => {
    const res = await app.request("/v1/qr/matrix?data=hello", { headers: AUTH_HEADERS }, TEST_ENV);
    expect(res.status).toBe(200);
    const body = await readJson(res);
    expect(body.size).toBeGreaterThan(0);
    expect(body.matrix).toHaveLength(body.size);
  });

  it("respects the ecc parameter", async () => {
    const res = await app.request("/v1/qr/matrix?data=hello&ecc=H", { headers: AUTH_HEADERS }, TEST_ENV);
    const body = await readJson(res);
    expect(body.ecc).toBe("H");
  });

  it("defaults invalid ecc values to M", async () => {
    const res = await app.request("/v1/qr/matrix?data=hello&ecc=invalid", { headers: AUTH_HEADERS }, TEST_ENV);
    const body = await readJson(res);
    expect(body.ecc).toBe("M");
  });
});

describe("unknown route", () => {
  it("returns 404 json", async () => {
    const res = await app.request("/v1/does-not-exist", { headers: AUTH_HEADERS }, TEST_ENV);
    expect(res.status).toBe(404);
  });
});
