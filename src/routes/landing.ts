import { Hono } from "hono";
import { handleSignup } from "../lib/signup.js";

export interface LandingEnv {
  Bindings: {
    EMAIL_SIGNUPS?: KVNamespace;
    RESEND_API_KEY?: string;
  };
}

export const landingRoute = new Hono<LandingEnv>();

const RAPIDAPI_LISTING = "https://rapidapi.com/jonashaemecommerce/api/qr-api19";

const STRUCTURED_DATA = {
  "@context": "https://schema.org",
  "@type": "WebAPI",
  name: "QR API",
  description:
    "Stateless QR code generation API. Returns an SVG image or the raw boolean module matrix, with configurable error correction level, size, and colors.",
  url: "https://qr-api.jay-trading.workers.dev",
  offers: {
    "@type": "Offer",
    price: "0",
    priceCurrency: "USD",
    description: "Free tier available, paid tiers on RapidAPI",
    url: RAPIDAPI_LISTING,
  },
  provider: {
    "@type": "Organization",
    name: "QR API",
  },
};

const PAGE_HTML = `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8" />
<meta name="viewport" content="width=device-width, initial-scale=1" />
<title>QR API — Free QR Code Generation API (SVG &amp; Matrix)</title>
<meta name="description" content="A fast, stateless QR code generation API. Get an SVG image or a raw boolean module matrix, with configurable error correction, size, and colors. Free tier, pay-as-you-grow pricing on RapidAPI." />
<link rel="canonical" href="https://qr-api.jay-trading.workers.dev/" />
<meta property="og:title" content="QR API — QR code generation API" />
<meta property="og:description" content="Generate QR codes as SVG images or raw boolean matrices via a simple REST API. Configurable error correction, size, and colors." />
<meta property="og:type" content="website" />
<meta property="og:url" content="https://qr-api.jay-trading.workers.dev/" />
<meta name="twitter:card" content="summary" />
<script type="application/ld+json">${JSON.stringify(STRUCTURED_DATA)}</script>
<style>
  body { font-family: system-ui, -apple-system, sans-serif; max-width: 720px; margin: 3rem auto; padding: 0 1.5rem; line-height: 1.6; color: #1a1a1a; }
  h1 { font-size: 1.75rem; }
  code { background: #f2f2f2; padding: 0.15em 0.4em; border-radius: 4px; }
  ul { padding-left: 1.25rem; }
  form { margin-top: 2rem; display: flex; gap: 0.5rem; flex-wrap: wrap; }
  input[type="email"] { flex: 1; min-width: 220px; padding: 0.6rem 0.8rem; border: 1px solid #ccc; border-radius: 6px; font-size: 1rem; }
  button { padding: 0.6rem 1.2rem; border: none; border-radius: 6px; background: #1a1a1a; color: #fff; font-size: 1rem; cursor: pointer; }
  #signup-message { margin-top: 0.75rem; font-size: 0.9rem; }
  footer { margin-top: 3rem; font-size: 0.85rem; color: #666; }
</style>
</head>
<body>
<h1>QR API</h1>
<p>A fast, stateless QR code generation API. Send it data and get back an SVG image — or the raw boolean module matrix if you want to render it yourself. Configurable error correction level, module size, and colors.</p>

<h2>Endpoints</h2>
<ul>
  <li><code>GET /v1/qr</code> — generate a QR code as an SVG image (params: <code>data</code>, <code>ecc</code>, <code>cellSize</code>, <code>color</code>, <code>bgColor</code>)</li>
  <li><code>GET /v1/qr/matrix</code> — generate a QR code as a raw boolean module matrix (JSON), for custom rendering</li>
  <li><code>GET /health</code> — liveness check</li>
</ul>

<h2>Pricing</h2>
<p>Free tier plus paid tiers, billed and metered through RapidAPI:</p>
<ul>
  <li><strong>Basic</strong> — free, 500 requests/month</li>
  <li><strong>Pro</strong> — $4.99/month, 10,000 requests/month</li>
  <li><strong>Ultra</strong> — $19.99/month, 100,000 requests/month</li>
</ul>
<p><a href="${RAPIDAPI_LISTING}">Get your API key &amp; see current plans on RapidAPI &rarr;</a></p>

<h2>Why QR API</h2>
<ul>
  <li><strong>Edge-deployed</strong> — runs on Cloudflare Workers, so response times don't depend on which region your users are in, unlike a single-region server behind a free QR generator like goqr.me's API or api.qrserver.com.</li>
  <li><strong>SVG output</strong> — crisp at any size (print, large displays, retina screens), not just a fixed-resolution PNG.</li>
  <li><strong>Raw-matrix output option</strong> — get the boolean module grid directly via <code>/v1/qr/matrix</code> if you want to render the code yourself (canvas, native UI, custom styling) instead of embedding an image.</li>
  <li><strong>Stateless, no logging of scanned content</strong> — the data you encode isn't persisted.</li>
  <li><strong>One RapidAPI key</strong> covers billing and metering — no separate account or API key management outside RapidAPI.</li>
</ul>

<h2>Related APIs</h2>
<p>Same provider, other tools:</p>
<ul>
  <li><a href="https://validate-api.jay-trading.workers.dev/">Validate API</a> — IBAN, EU VAT, email, phone, credit card, and password validation.</li>
  <li><a href="https://currency-api.jay-trading.workers.dev/">Currency API</a> — currency conversion and exchange rates.</li>
</ul>

<h2>Changelog</h2>
<ul>
  <li><strong>2026-07-08</strong> — Initial launch: SVG and matrix QR code generation, configurable error correction, size, and colors.</li>
</ul>

<h2>Roadmap</h2>
<p>Planned, not yet shipped:</p>
<ul>
  <li>PNG output</li>
  <li>Batch generation endpoint</li>
  <li>Logo-embedding support</li>
</ul>

<h2>Get updates</h2>
<form id="signup-form">
  <input type="email" id="signup-email" name="email" placeholder="you@example.com" required />
  <button type="submit">Notify me</button>
</form>
<div id="signup-message"></div>

<footer>
  <p><a href="https://github.com/Jay-Ecommerce/qr-api">Source on GitHub</a></p>
</footer>

<script>
document.getElementById('signup-form').addEventListener('submit', async function (e) {
  e.preventDefault();
  const email = document.getElementById('signup-email').value;
  const msg = document.getElementById('signup-message');
  msg.textContent = 'Submitting...';
  try {
    const res = await fetch('/subscribe', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email }),
    });
    const data = await res.json();
    if (res.ok) {
      msg.textContent = data.alreadySubscribed ? "You're already on the list." : "Thanks — you're subscribed.";
    } else {
      msg.textContent = data.error || 'Something went wrong.';
    }
  } catch {
    msg.textContent = 'Network error — please try again.';
  }
});
</script>
</body>
</html>`;

landingRoute.get("/", (c) => c.html(PAGE_HTML));

landingRoute.post("/subscribe", async (c) => {
  let body: { email?: string } | null = null;
  try {
    body = await c.req.json();
  } catch {
    return c.json({ ok: false, error: "Invalid JSON body" }, 400);
  }
  if (!body?.email || typeof body.email !== "string") {
    return c.json({ ok: false, error: "Field 'email' (string) is required" }, 400);
  }

  const result = await handleSignup(body.email, c.env.EMAIL_SIGNUPS, c.env.RESEND_API_KEY);
  return c.json(result, result.ok ? 200 : 400);
});
