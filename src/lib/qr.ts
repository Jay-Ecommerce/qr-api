/**
 * QR code generation. Matrix computation (version selection, Reed-Solomon error
 * correction, mask evaluation) is delegated to `qrcode-generator` — that part of
 * the QR spec is genuinely complex and this library is small, dependency-free,
 * and battle-tested, unlike the simple checksum logic elsewhere in this project
 * that's worth hand-rolling. SVG rendering from the resulting matrix is ours.
 */
import qrcodeFactory from "qrcode-generator";

export type ErrorCorrectionLevel = "L" | "M" | "Q" | "H";

export interface QrMatrixResult {
  size: number;
  matrix: boolean[][];
}

export function buildQrMatrix(data: string, ecc: ErrorCorrectionLevel = "M"): QrMatrixResult {
  const qr = qrcodeFactory(0, ecc);
  qr.addData(data);
  qr.make();

  const size = qr.getModuleCount();
  const matrix: boolean[][] = [];
  for (let row = 0; row < size; row++) {
    const line: boolean[] = [];
    for (let col = 0; col < size; col++) {
      line.push(qr.isDark(row, col));
    }
    matrix.push(line);
  }
  return { size, matrix };
}

const HEX_COLOR_PATTERN = /^[0-9a-fA-F]{3}$|^[0-9a-fA-F]{6}$/;

/** Rejects anything that isn't a plain 3/6-digit hex color — these values get
 * embedded directly into an SVG attribute, so unvalidated input would be an XSS vector. */
export function isValidHexColor(value: string): boolean {
  return HEX_COLOR_PATTERN.test(value);
}

export function matrixToSvg(
  matrix: boolean[][],
  cellSize: number,
  margin: number,
  darkColor: string,
  lightColor: string,
): string {
  const size = matrix.length;
  const dimension = (size + margin * 2) * cellSize;

  let path = "";
  matrix.forEach((line, row) => {
    line.forEach((dark, col) => {
      if (dark) {
        const x = (col + margin) * cellSize;
        const y = (row + margin) * cellSize;
        path += `M${x},${y}h${cellSize}v${cellSize}h-${cellSize}z`;
      }
    });
  });

  return (
    `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${dimension} ${dimension}" width="${dimension}" height="${dimension}" role="img">` +
    `<rect width="100%" height="100%" fill="#${lightColor}"/>` +
    `<path d="${path}" fill="#${darkColor}"/>` +
    `</svg>`
  );
}
