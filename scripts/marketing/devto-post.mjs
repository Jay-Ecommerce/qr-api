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
const article =
  overrideIndex !== undefined && overrideIndex !== ""
    ? DEVTO_ARTICLES[Number(overrideIndex)]
    : pick(DEVTO_ARTICLES);

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
