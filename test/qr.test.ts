import { describe, it, expect } from "vitest";
import { buildQrMatrix, matrixToSvg, isValidHexColor } from "../src/lib/qr.js";

describe("buildQrMatrix", () => {
  it("produces a square matrix", () => {
    const { size, matrix } = buildQrMatrix("hello world");
    expect(size).toBeGreaterThan(0);
    expect(matrix).toHaveLength(size);
    for (const row of matrix) expect(row).toHaveLength(size);
  });

  it("produces a larger matrix for longer data", () => {
    const short = buildQrMatrix("a");
    const long = buildQrMatrix("a".repeat(500));
    expect(long.size).toBeGreaterThan(short.size);
  });

  it("produces a larger matrix for higher error correction at the same data", () => {
    const low = buildQrMatrix("a".repeat(100), "L");
    const high = buildQrMatrix("a".repeat(100), "H");
    expect(high.size).toBeGreaterThanOrEqual(low.size);
  });

  it("throws for data that overflows the maximum QR capacity", () => {
    expect(() => buildQrMatrix("a".repeat(5000), "H")).toThrow();
  });

  it("contains at least one dark module for non-trivial data", () => {
    const { matrix } = buildQrMatrix("https://example.com");
    const hasDark = matrix.some((row) => row.some((cell) => cell === true));
    expect(hasDark).toBe(true);
  });
});

describe("matrixToSvg", () => {
  it("produces a valid SVG string sized to the matrix and cellSize", () => {
    const { matrix, size } = buildQrMatrix("test");
    const svg = matrixToSvg(matrix, 10, 4, "000000", "ffffff");
    expect(svg).toMatch(/^<svg /);
    expect(svg).toContain(`width="${(size + 8) * 10}"`);
    expect(svg).toContain("#000000");
    expect(svg).toContain("#ffffff");
  });

  it("draws no path for an all-light matrix", () => {
    const svg = matrixToSvg([[false, false], [false, false]], 10, 0, "000000", "ffffff");
    expect(svg).toContain('d=""');
  });
});

describe("isValidHexColor", () => {
  it("accepts 6-digit hex", () => {
    expect(isValidHexColor("1a2b3c")).toBe(true);
  });

  it("accepts 3-digit hex", () => {
    expect(isValidHexColor("abc")).toBe(true);
  });

  it("rejects a leading #", () => {
    expect(isValidHexColor("#ffffff")).toBe(false);
  });

  it("rejects SVG/markup injection attempts", () => {
    expect(isValidHexColor('red" onclick="alert(1)')).toBe(false);
    expect(isValidHexColor("000\"/><script>alert(1)</script>")).toBe(false);
  });

  it("rejects wrong-length input", () => {
    expect(isValidHexColor("ff")).toBe(false);
    expect(isValidHexColor("fffffff")).toBe(false);
  });
});
