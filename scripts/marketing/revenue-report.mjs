// Daily revenue summary, emailed via Resend. Same approach as validate-api's
// revenue-report.mjs (the reference implementation) — see that repo's
// AUTOMATION_PLAN.md for the full reasoning.
//
// IMPORTANT — this is account-wide, not QR-API-specific: RapidAPI pays out
// via a single PayPal account per provider, not one payout stream per API.
// This script (like validate-api's and currency-api's identical copy) reads
// the same PayPal transaction history, so all three repos' daily emails
// will show the same underlying numbers if PAYPAL_CLIENT_ID/SECRET are the
// same credentials on each — there is currently no way to attribute a given
// PayPal transaction back to a specific API/product. The email body below
// says this explicitly rather than implying per-product attribution that
// doesn't exist. Worth considering consolidating to a single cross-product
// report instead of three near-identical daily emails once this is wired up
// — flagged in this session's report rather than decided unilaterally.
const PAYPAL_CLIENT_ID = process.env.PAYPAL_CLIENT_ID;
const PAYPAL_CLIENT_SECRET = process.env.PAYPAL_CLIENT_SECRET;
const RESEND_API_KEY = process.env.RESEND_API_KEY;
const REPORT_TO = process.env.REPORT_TO_EMAIL || "jonashaemmerle0504@gmail.com";
const REPORT_FROM = process.env.REPORT_FROM_EMAIL || "onboarding@resend.dev";

if (!RESEND_API_KEY) {
  console.error("RESEND_API_KEY is not set — cannot send report.");
  process.exit(1);
}

async function getPaypalTransactions() {
  if (!PAYPAL_CLIENT_ID || !PAYPAL_CLIENT_SECRET) {
    return { configured: false, transactions: [] };
  }

  const authRes = await fetch("https://api-m.paypal.com/v1/oauth2/token", {
    method: "POST",
    headers: {
      Authorization: `Basic ${Buffer.from(`${PAYPAL_CLIENT_ID}:${PAYPAL_CLIENT_SECRET}`).toString("base64")}`,
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: "grant_type=client_credentials",
  });
  if (!authRes.ok) throw new Error(`PayPal auth failed: ${authRes.status}`);
  const { access_token } = await authRes.json();

  const end = new Date();
  const start = new Date(end.getTime() - 24 * 60 * 60 * 1000);
  const params = new URLSearchParams({
    start_date: start.toISOString(),
    end_date: end.toISOString(),
    fields: "transaction_info",
  });

  const txRes = await fetch(`https://api-m.paypal.com/v1/reporting/transactions?${params}`, {
    headers: { Authorization: `Bearer ${access_token}` },
  });
  if (!txRes.ok) throw new Error(`PayPal transactions fetch failed: ${txRes.status}`);
  const json = await txRes.json();
  return { configured: true, transactions: json.transaction_details ?? [] };
}

function summarize(transactions) {
  const incoming = transactions.filter((t) => Number(t.transaction_info?.transaction_amount?.value ?? 0) > 0);
  const total = incoming.reduce((sum, t) => sum + Number(t.transaction_info.transaction_amount.value), 0);
  return { count: incoming.length, total: total.toFixed(2) };
}

const { configured, transactions } = await getPaypalTransactions();
const today = new Date().toISOString().slice(0, 10);

let html;
if (!configured) {
  html = `<p>PayPal credentials aren't configured yet, so this is a placeholder report for ${today}.</p>
<p>Once <code>PAYPAL_CLIENT_ID</code> and <code>PAYPAL_CLIENT_SECRET</code> are set as GitHub secrets, this email will show incoming PayPal transactions from the last 24 hours as a revenue proxy.</p>
<p>Note: this tracks PayPal payouts <strong>across the whole Jay-Ecommerce RapidAPI provider account</strong>, not QR API specifically — RapidAPI pays out via one PayPal account per provider, not per API, so this number is not QR-API-attributable revenue. Check RapidAPI Studio's dashboard directly for per-API subscriber counts and usage.</p>`;
} else {
  const { count, total } = summarize(transactions);
  html = `<h2>QR API — revenue report for ${today}</h2>
<p><strong>${count}</strong> incoming PayPal transaction(s) in the last 24 hours, totaling <strong>$${total}</strong>.</p>
<p><strong>This total is account-wide</strong> (validate-api + QR API + currency-api all pay out through the same PayPal account) — it is not QR-API-specific revenue, since RapidAPI doesn't expose per-API payout attribution outside its Enterprise-plan analytics. For per-endpoint usage on this specific API, check <a href="https://${"rapidapi.com/jonashaemecommerce/api/qr-api19"}/analytics">RapidAPI Studio</a> directly.</p>`;
}

const emailRes = await fetch("https://api.resend.com/emails", {
  method: "POST",
  headers: {
    Authorization: `Bearer ${RESEND_API_KEY}`,
    "Content-Type": "application/json",
  },
  body: JSON.stringify({
    from: REPORT_FROM,
    to: REPORT_TO,
    subject: `QR API revenue report — ${today}`,
    html,
  }),
});

if (!emailRes.ok) {
  const text = await emailRes.text();
  console.error(`Resend API returned ${emailRes.status}: ${text}`);
  process.exit(1);
}

console.log("Revenue report sent.");
