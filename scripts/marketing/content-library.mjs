// Rotating content pools for automated marketing scripts.
//
// Same pattern as validate-api/scripts/marketing/content-library.mjs (the
// reference implementation for this account): template-rotation, not
// LLM-generated — no paid LLM API in this project's budget, and predictable
// rotation through real, specific, technically-accurate posts beats generic
// AI-sounding text. Selection is by ISO week number so a script always
// advances through its pool in order and wraps around.
//
// Topics here are deliberately distinct from the QR-related article already
// in validate-api's own rotation ("How to generate QR codes for free with an
// API", a cross-promo piece) — these go deeper into QR-specific tradeoffs
// instead of repeating the same pitch on the same Dev.to account.

export function isoWeekNumber(date = new Date()) {
  const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
  const dayNum = d.getUTCDay() || 7;
  d.setUTCDate(d.getUTCDate() + 4 - dayNum);
  const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
  return Math.ceil(((d - yearStart) / 86400000 + 1) / 7);
}

export function pick(pool, offset = 0) {
  const idx = (isoWeekNumber() + offset) % pool.length;
  return pool[idx];
}

const QR_RAPIDAPI_HOST = "rapidapi.com/jonashaemecommerce/api/qr-api19";
const VALIDATE_RAPIDAPI_HOST = "rapidapi.com/jonashaemecommerce/api/validate7";
const CURRENCY_RAPIDAPI_HOST = "rapidapi.com/jonashaemecommerce/api/currency-api15";
const GITHUB_URL = "https://github.com/Jay-Ecommerce/qr-api";

export const DEVTO_ARTICLES = [
  {
    title: "QR code error correction levels: L vs M vs Q vs H, and when the tradeoff is actually worth it",
    tags: ["webdev", "api", "tutorial"],
    body: `Every QR code has a Reed-Solomon error-correction level baked in — L (~7% recovery), M (~15%), Q (~25%), H (~30%) — and picking the wrong one either wastes visual density or leaves you with a code that stops scanning the moment it gets a little damaged.

Here's the actual decision, not just the percentages:

- **L** — clean digital display only (a code shown on a screen, never printed, never overlaid with anything). Smallest, least dense module grid for a given payload.
- **M** — the safe default for most printed material. Handles minor print smudging or a slightly low-quality printer.
- **Q** — printed material that gets handled a lot (product packaging, shipping labels) or is at moderate risk of scuffing.
- **H** — anything with a logo or graphic overlaid on top of the code, since that overlay is itself "damage" the decoder has to recover from. Also the right call for outdoor/weather-exposed prints.

The mistake I see most often: defaulting to H everywhere "to be safe." Higher error correction means more modules for the same data, which means a denser, harder-to-scan-from-a-distance code with zero benefit if nothing's ever going to obscure it. Match the level to the actual damage risk, not to the theoretical maximum.

\`\`\`bash
curl "https://qr-api.p.rapidapi.com/v1/qr?data=https://example.com&ecc=Q" \\
  -H "X-RapidAPI-Key: <your-key>" \\
  -H "X-RapidAPI-Host: qr-api.p.rapidapi.com" \\
  --output qr.svg
\`\`\`

[QR API](https://${QR_RAPIDAPI_HOST}) exposes \`ecc\` as a plain query param (defaults to \`M\`) so you can set it per use case instead of hardcoding one level everywhere.`,
  },
  {
    title: "SVG output for QR codes: why vector beats raster once anyone screenshots or resizes it",
    tags: ["webdev", "api", "svg", "tutorial"],
    body: `Raster QR codes (PNG/JPEG) look fine at the size they were generated for and fall apart the moment someone resizes, screenshots, or prints them larger — the module edges blur, and blurred module edges are exactly what breaks a decoder's ability to read the grid.

SVG sidesteps this completely because a QR code is fundamentally vector data already — it's a grid of black/white squares, not a photograph. Rendering it as \`<rect>\` elements instead of a pixel bitmap means it stays crisp at any zoom level, print size, or screen density:

\`\`\`html
<img src="qr.svg" alt="Scan to open" width="600" />
\`\`\`

That's a 600px display of a code that could've been generated at any size — no upscaling artifacts, because there was never a fixed pixel grid to begin with.

A couple of practical notes if you're embedding these in a product:

- **Inline the SVG** (rather than referencing it as an \`<img src>\`) if you need to style fill colors with CSS at render time instead of baking colors in server-side.
- **Strict hex validation on any color params matters more than it looks** — if a QR generation endpoint lets you pass custom foreground/background colors and embeds them directly into SVG attributes, that's an injection surface if the values aren't validated as actual hex colors first.
- **Raw matrix output is still useful** — for canvas rendering, terminal output, or anything that isn't "embed an image," getting the boolean module grid directly beats parsing an SVG back into pixels.

[QR API](https://${QR_RAPIDAPI_HOST}) returns \`image/svg+xml\` by default from \`GET /v1/qr\`, with a \`/v1/qr/matrix\` variant returning the raw grid for exactly that second use case.`,
  },
  {
    title: "The QR code capacity cliff: why a shortened URL scans more reliably than a long one",
    tags: ["webdev", "api", "tutorial"],
    body: `QR codes don't degrade gracefully as you stuff more data into them — they hit a capacity ceiling per version/error-correction combination, and the module grid gets denser and denser as you approach it. Past a certain point you're not looking at a QR code you can scan from arm's length anymore, you're looking at one that needs to nearly touch the camera lens to resolve.

The numbers, roughly: at the lowest error correction level (L), a QR code tops out around 2,900 alphanumeric characters or ~4,300 numeric-only characters. That sounds like a lot until you remember two things:

1. **Every character costs more space than you'd think**, because the encoding also has to carry the error-correction payload alongside your data — that's not overhead you can opt out of, it's the whole point of the format being scannable at all.
2. **Real-world scanning distance matters more than theoretical capacity.** A QR code sized for a business card that's encoding near the character ceiling will produce a module grid so fine-grained that a phone camera needs to be uncomfortably close to resolve individual modules.

The fix is almost always: don't encode raw data, encode a short pointer to it. A URL-shortened link, a UUID that looks up a record server-side, a short numeric ID — anything that keeps the encoded payload well under a hundred characters keeps the module grid coarse enough to scan reliably from a normal distance, at a normal print size.

\`\`\`bash
# fine — short, scans easily even printed small
curl "https://qr-api.p.rapidapi.com/v1/qr?data=https://short.link/x7f2" ...

# avoid — encoding a full JSON payload directly makes the grid dense
# and print-size-sensitive for no real benefit over a lookup pointer
\`\`\`

If you're building this into a product, cap the accepted input length and fail with a clear error before hitting the encoder's own hard limit — silently truncating someone's data is worse than telling them up front. [QR API](https://${QR_RAPIDAPI_HOST}) caps \`data\` at 2000 characters for exactly this reason: comfortably under the spec's own ~2900-character ceiling at the lowest ECC level, with a clear 4xx instead of an encoder crash past it.`,
  },
  {
    title: "Batch-generating QR codes for events, inventory, or ticketing without hammering an API",
    tags: ["webdev", "api", "tutorial"],
    body: `Generating one QR code per attendee badge, warehouse bin, or ticket sounds like a simple loop until you're doing it for a few thousand items and either your own rate limiter or the API's kicks in halfway through a batch job.

A few things that make batch QR generation less painful:

**Concurrency, not sequential loops.** A single QR code generation call is fast (no external network dependency if the service computes the matrix in-process rather than calling out to render it), so the bottleneck is almost always your own request-issuing pattern, not the API. A small worker pool (5-10 concurrent requests) clears a few thousand codes in well under a minute instead of one-at-a-time sequential awaiting.

\`\`\`js
async function generateBatch(items, concurrency = 8) {
  const results = [];
  for (let i = 0; i < items.length; i += concurrency) {
    const batch = items.slice(i, i + concurrency);
    const responses = await Promise.all(
      batch.map((item) =>
        fetch(\`https://qr-api.p.rapidapi.com/v1/qr?data=\${encodeURIComponent(item.url)}\`, {
          headers: { "X-RapidAPI-Key": process.env.RAPIDAPI_KEY, "X-RapidAPI-Host": "qr-api.p.rapidapi.com" },
        }).then((r) => r.text())
      )
    );
    results.push(...responses);
  }
  return results;
}
\`\`\`

**Respect the tier's rate limit rather than discovering it via 429s.** If you know you're generating a few thousand codes in one job, check your plan's requests-per-month ceiling ahead of time rather than mid-batch — free tiers are usually sized for "generate codes as users request them," not "bulk-generate an entire event's worth in one run."

**Cache the output if the input doesn't change.** A QR code for a fixed URL/payload is deterministic — regenerating the same code repeatedly across job re-runs (a common failure mode when a batch job is re-triggered after a partial failure) wastes calls for zero benefit. Key your cache on the exact \`data\`+\`ecc\`+size params.

Stateless generation (no per-request server state, no database) is what makes this kind of batch job cheap to run in the first place — that's the whole design of [QR API](https://${QR_RAPIDAPI_HOST}): every call is a pure function of its query params, nothing persisted, nothing logged beyond the request path. Same account also runs [Validate](https://${VALIDATE_RAPIDAPI_HOST}) (IBAN/email/phone/etc. format checks) and [Currency API](https://${CURRENCY_RAPIDAPI_HOST}) (exchange rates) if useful for the rest of an onboarding/checkout pipeline.`,
  },
  {
    title: "Branded QR codes without a design tool: setting foreground/background color via query params",
    tags: ["webdev", "api", "tutorial"],
    body: `The default black-on-white QR code works fine functionally, but it clashes with pretty much every brand style guide the moment you drop it into a poster, product package, or app screen. Most "just generate a QR code" APIs don't expose color at all, which pushes color-matching into a separate image-editing step after the fact — recoloring an SVG's fill by hand, or worse, round-tripping through a design tool for something that should be a one-line request.

[QR API](https://${QR_RAPIDAPI_HOST}) takes \`color\` (module/foreground) and \`bgColor\` (background) as plain hex query params on \`GET /v1/qr\`, no leading \`#\`:

\`\`\`bash
curl "https://qr-api.p.rapidapi.com/v1/qr?data=https://example.com&color=1a2b3c&bgColor=f4f1ea" \\
  -H "X-RapidAPI-Key: <your-key>" \\
  -H "X-RapidAPI-Host: qr-api.p.rapidapi.com" \\
  --output qr.svg
\`\`\`

Both default to black-on-white (\`000000\`/\`ffffff\`) if omitted, so existing integrations don't need to change anything to keep their current output.

Two things worth knowing if you're picking colors instead of just accepting the defaults:

- **Contrast still has to survive a camera, not just a screen.** A QR decoder needs a clear light/dark distinction between modules and background — a pastel-on-pastel combination that looks fine in a design mockup can fail to scan reliably once printed or viewed under bad lighting. Keep real contrast between the two hex values, not just a stylistic difference.
- **Validate hex input server-side if you ever accept it from a user.** These values get embedded directly into SVG \`fill\` attributes, so strict 3/6-digit hex validation isn't optional — it's the difference between a color param and a markup-injection vector.

Same \`/v1/qr/matrix\` raw-grid endpoint is unaffected by color params since it returns boolean modules, not rendered output — colors only apply to the SVG path.`,
  },
];

export const REDDIT_STYLES = ["tutorial", "question", "case-study", "tip"];

export const REDDIT_SUBREDDITS = ["webdev", "SideProject", "APIs"];

const REDDIT_TEMPLATES = {
  tutorial: [
    {
      title: "QR error correction levels explained: stop defaulting to the highest one",
      body: `Quick writeup because I see this mistake constantly: QR codes have 4 error-correction levels (L/M/Q/H, roughly 7%/15%/25%/30% damage recovery), and defaulting to the highest one "to be safe" actually makes the code denser and harder to scan from a normal distance for zero benefit if nothing's ever going to obscure or damage it.

Match the level to actual risk: L for clean digital-only display, M as a safe print default, Q for handled/packaging material, H only if there's a logo overlay or serious wear risk. Higher isn't just "safer," it's a real tradeoff against scannability.`,
    },
  ],
  question: [
    {
      title: "How are people handling QR code generation server-side without pulling in a heavy image library?",
      body: `Been generating QR codes as SVG (vector, so no blur on resize/print) via a stateless endpoint instead of a local image library + canvas rendering. Curious what others are doing here — anyone found a lightweight local approach that doesn't drag in a big dependency, or is offloading it to an API/service the more common pattern once you factor in error-correction levels and per-country encoding edge cases?`,
    },
  ],
  "case-study": [
    {
      title: "Built a stateless QR code API on Cloudflare Workers — a few notes on what worked",
      body: `Been running a small QR generation API (SVG + raw matrix output) on Workers for a bit. Things that worked out well:

- No database, no per-request state — every call is a pure function of its query params, which makes it trivially horizontally scalable
- SVG output by default instead of PNG — no blur when someone screenshots or resizes it, since a QR code is vector data by nature anyway
- Capping input length well under the spec's actual capacity ceiling, with a clear error instead of letting the encoder choke on oversized input

Happy to go into more detail on the encoding/error-correction side if useful to anyone building something similar.`,
    },
  ],
  tip: [
    {
      title: "TIL: QR codes get exponentially denser as you approach their capacity ceiling, not linearly",
      body: `Learned this the hard way — encoding a full JSON payload into a QR code instead of a short lookup pointer/URL produces a code so dense it needs to nearly touch the camera to scan. The fix that actually works: encode a short pointer (shortened URL, UUID, short numeric ID) and look up the real data server-side, rather than cramming everything into the code itself.`,
    },
  ],
};

export function pickRedditDraft(subreddit, weekOffset = 0) {
  const style = pick(REDDIT_STYLES, weekOffset);
  const pool = REDDIT_TEMPLATES[style];
  const template = pool[isoWeekNumber() % pool.length];
  return { subreddit, style, ...template };
}
