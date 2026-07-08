# QR API

Stateless QR code generation API — SVG image or raw module matrix, no
database, deployed on Cloudflare Workers. Built as a standalone sibling
project to [Validate API](https://github.com/Jay-Ecommerce/validate-api),
same architecture and conventions.

## Endpoints

| Endpoint | Query params | Notes |
|---|---|---|
| `GET /v1/qr` | `data` (required), `ecc` (`L`/`M`/`Q`/`H`, default `M`), `cellSize` (1-50, default 8), `color`/`bgColor` (hex, no `#`) | Returns an `image/svg+xml` QR code |
| `GET /v1/qr/matrix` | `data` (required), `ecc` | Returns `{ size, ecc, matrix }` — the raw boolean module grid, for callers who want to render it themselves |
| `GET /health` | — | No API key required |

```bash
curl "https://qr-api.<your-subdomain>.workers.dev/v1/qr?data=https://example.com" \
  -H "X-RapidAPI-Key: <your-rapidapi-key>" \
  -H "X-RapidAPI-Host: qr-api.p.rapidapi.com" \
  -o qr.svg
```

Data is capped at 2000 characters (well under the QR spec's own ~2900-character
ceiling at the lowest error-correction level, to fail fast with a clear error
before hitting the encoder's own capacity limit).

## Architecture

Same pattern as `validate-api`: Hono on Cloudflare Workers, RapidAPI proxy-secret
auth on all `/v1/*` routes, best-effort per-isolate rate limiting as
defense-in-depth behind RapidAPI's own quota enforcement, structured JSON
request logging, no persistent storage.

QR matrix computation (version selection, Reed-Solomon error correction, mask
evaluation) uses [`qrcode-generator`](https://github.com/kazuhikoarase/qrcode-generator) —
that part of the spec is genuinely complex and this library is small,
dependency-free, and widely used, unlike the simple checksum logic (IBAN,
Luhn) that's worth hand-rolling in the sibling project. SVG rendering from
the resulting matrix is custom, with strict hex-color validation on the
`color`/`bgColor` params since they're embedded directly into SVG attributes.

## Development

```bash
npm install
npm run dev     # wrangler dev, local Worker
npm test
npm run lint
npm run build    # tsc --noEmit
npm run deploy   # wrangler deploy
```

## Security & privacy

`data` is encoded into the QR image and returned directly — never stored,
logged, or sent anywhere else. No external network calls are made; the QR
matrix is computed entirely in-process.
