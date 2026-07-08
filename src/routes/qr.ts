import { Hono } from "hono";
import { buildQrMatrix, matrixToSvg, isValidHexColor, type ErrorCorrectionLevel } from "../lib/qr.js";

export const qrRoute = new Hono();

const VALID_ECC = new Set(["L", "M", "Q", "H"]);
const MAX_DATA_LENGTH = 2000;

function parseEcc(value: string | undefined): ErrorCorrectionLevel {
  const upper = value?.toUpperCase();
  return upper && VALID_ECC.has(upper) ? (upper as ErrorCorrectionLevel) : "M";
}

function validateData(data: string | undefined): { error: string } | { data: string } {
  if (!data) return { error: "Query parameter 'data' is required" };
  if (data.length > MAX_DATA_LENGTH) return { error: `'data' must be ${MAX_DATA_LENGTH} characters or fewer` };
  return { data };
}

qrRoute.get("/v1/qr", (c) => {
  const validated = validateData(c.req.query("data"));
  if ("error" in validated) return c.json({ error: "bad_request", message: validated.error }, 400);

  const ecc = parseEcc(c.req.query("ecc"));

  const cellSizeParam = c.req.query("cellSize");
  const cellSize = cellSizeParam ? Number(cellSizeParam) : 8;
  if (!Number.isFinite(cellSize) || cellSize < 1 || cellSize > 50) {
    return c.json({ error: "bad_request", message: "'cellSize' must be a number between 1 and 50" }, 400);
  }

  const colorParam = c.req.query("color") ?? "000000";
  const bgColorParam = c.req.query("bgColor") ?? "ffffff";
  if (!isValidHexColor(colorParam) || !isValidHexColor(bgColorParam)) {
    return c.json({ error: "bad_request", message: "'color'/'bgColor' must be a 3 or 6 digit hex color, without '#'" }, 400);
  }

  let matrix: boolean[][];
  try {
    matrix = buildQrMatrix(validated.data, ecc).matrix;
  } catch (err) {
    return c.json({ error: "bad_request", message: err instanceof Error ? err.message : "Could not encode data as a QR code" }, 400);
  }

  const svg = matrixToSvg(matrix, cellSize, 4, colorParam, bgColorParam);
  c.header("Content-Type", "image/svg+xml");
  return c.body(svg);
});

qrRoute.get("/v1/qr/matrix", (c) => {
  const validated = validateData(c.req.query("data"));
  if ("error" in validated) return c.json({ error: "bad_request", message: validated.error }, 400);

  const ecc = parseEcc(c.req.query("ecc"));

  try {
    const { size, matrix } = buildQrMatrix(validated.data, ecc);
    return c.json({ size, ecc, matrix });
  } catch (err) {
    return c.json({ error: "bad_request", message: err instanceof Error ? err.message : "Could not encode data as a QR code" }, 400);
  }
});
