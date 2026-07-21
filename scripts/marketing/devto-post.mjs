// Posts one article per run to Dev.to, rotating through DEVTO_ARTICLES by ISO
// week number. Run weekly (see .github/workflows/devto-weekly.yml) — Dev.to
// treats frequent low-effort posting as spam, so this deliberately does not
// run daily even though the API would technically allow it.
//
// Uses the same DEVTO_API_KEY secret/Dev.to account as validate-api and
// currency-api (one Dev.to account for the whole Jay-Ecommerce product
// suite) — content here is topically distinct from what's already in the
// other repos' rotations, see content-library.mjs's header comment.
import { DEVTO_ARTICLES, pick } from "./content-library.mjs";

const API_KEY = process.env.DEVTO_API_KEY;
if (!API_KEY) {
  console.error("DEVTO_API_KEY is not set — skipping Dev.to post.");
  process.exit(1);
}

const overrideIndex = process.env.ARTICLE_INDEX;
let article;

if (overrideIndex !== undefined && overrideIndex !== "") {
  article = DEVTO_ARTICLES[Number(overrideIndex)];
} else {
  // ISO-week-number rotation alone isn't enough to guarantee variety: the pool
  // grows over time, so `week % pool.length` can land on the same index in two
  // different weeks purely by coincidence (this actually happened on the
  // validate-api rotation — same article auto-posted twice within two weeks).
  // Check against what's actually live on the shared Dev.to account (all 3
  // sibling repos post to the same account) and skip forward past any title
  // already published, rather than trusting the modulo alone.
  const publishedRes = await fetch(
    `https://dev.to/api/articles/me/published?_cb=${Date.now()}`, // cache-busts a dev.to CDN bug that can serve a stale cached 401
    { headers: { "api-key": API_KEY, "Accept-Encoding": "identity" } },
  );
  const publishedTitles = publishedRes.ok
    ? new Set((await publishedRes.json()).map((a) => a.title))
    : new Set(); // if this lookup fails, fall back to plain rotation rather than blocking the post

  let candidate;
  for (let offset = 0; offset < DEVTO_ARTICLES.length; offset++) {
    candidate = pick(DEVTO_ARTICLES, offset);
    if (!publishedTitles.has(candidate.title)) break;
  }
  article = candidate; // if every title's already published, the full rotation is done — repeating is fine
}

if (!article) {
  console.error(`No article at index ${overrideIndex} (pool has ${DEVTO_ARTICLES.length} articles).`);
  process.exit(1);
}

const res = await fetch("https://dev.to/api/articles", {
  method: "POST",
  headers: {
    "api-key": API_KEY,
    "Content-Type": "application/json",
  },
  body: JSON.stringify({
    article: {
      title: article.title,
      body_markdown: article.body,
      published: true,
      tags: article.tags,
    },
  }),
});

if (!res.ok) {
  const text = await res.text();
  console.error(`Dev.to API returned ${res.status}: ${text}`);
  process.exit(1);
}

const json = await res.json();
console.log(`Posted to Dev.to: ${json.url}`);
