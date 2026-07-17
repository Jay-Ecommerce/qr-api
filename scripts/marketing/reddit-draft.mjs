// Generates one draft Reddit post per subreddit per week and opens a GitHub
// issue with all of them, so Jay gets a notification and can review, edit,
// and post them himself as his real account. This script never calls the
// Reddit API and never posts anything automatically — same policy as
// validate-api, see its AUTOMATION_PLAN.md for why.
import { REDDIT_SUBREDDITS, pickRedditDraft } from "./content-library.mjs";

const GITHUB_TOKEN = process.env.GITHUB_TOKEN;
const REPO = process.env.GITHUB_REPOSITORY; // "owner/repo", set automatically in Actions

if (!GITHUB_TOKEN || !REPO) {
  console.error("GITHUB_TOKEN or GITHUB_REPOSITORY is not set.");
  process.exit(1);
}

const drafts = REDDIT_SUBREDDITS.map((sub, i) => pickRedditDraft(sub, i));

const weekLabel = new Date().toISOString().slice(0, 10);
const bodyParts = drafts.map(
  (d) => `## r/${d.subreddit} — ${d.style}

**Title:** ${d.title}

**Body:**

${d.body}

---
`
);

const issueBody = `Weekly Reddit draft posts for ${weekLabel}. Review, edit as needed, and post manually to each subreddit as yourself. Close this issue once posted (or after skipping a week).

${bodyParts.join("\n")}`;

const res = await fetch(`https://api.github.com/repos/${REPO}/issues`, {
  method: "POST",
  headers: {
    Authorization: `Bearer ${GITHUB_TOKEN}`,
    Accept: "application/vnd.github+json",
    "Content-Type": "application/json",
  },
  body: JSON.stringify({
    title: `Reddit draft posts — week of ${weekLabel}`,
    body: issueBody,
    labels: ["marketing", "reddit-draft"],
  }),
});

if (!res.ok) {
  const text = await res.text();
  console.error(`GitHub API returned ${res.status}: ${text}`);
  process.exit(1);
}

const json = await res.json();
console.log(`Opened draft issue: ${json.html_url}`);
