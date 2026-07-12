/**
 * Email validation: RFC-5322-ish syntax check (pure) + optional MX record lookup.
 * MX lookup uses Cloudflare's public DNS-over-HTTPS endpoint (cloudflare-dns.com),
 * a free service with no API key, since Workers has no native DNS resolver API.
 */

// Deliberately pragmatic, not a full RFC 5322 grammar — matches what mail servers
// actually accept in practice while rejecting obviously malformed input.
const EMAIL_SYNTAX_PATTERN = /^[a-zA-Z0-9.!#$%&'*+/=?^_`{|}~-]+@[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(?:\.[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)+$/;

export interface EmailSyntaxResult {
  syntaxValid: boolean;
  localPart: string | null;
  domain: string | null;
  errors: string[];
}

export function checkEmailSyntax(rawInput: string): EmailSyntaxResult {
  const email = (rawInput ?? "").trim();
  const errors: string[] = [];

  if (email.length === 0) errors.push("Email is empty");
  if (email.length > 254) errors.push("Email exceeds 254 characters");

  const syntaxValid = errors.length === 0 && EMAIL_SYNTAX_PATTERN.test(email);
  if (!syntaxValid && errors.length === 0) errors.push("Email does not match required syntax");

  const atIndex = email.lastIndexOf("@");
  const localPart = atIndex > 0 ? email.slice(0, atIndex) : null;
  const domain = atIndex > 0 ? email.slice(atIndex + 1).toLowerCase() : null;

  return { syntaxValid, localPart: syntaxValid ? localPart : null, domain: syntaxValid ? domain : null, errors };
}

export interface MxCheckResult {
  checked: boolean;
  hasMx: boolean | null;
  records: string[];
  error?: string;
}

const DOH_ENDPOINT = "https://cloudflare-dns.com/dns-query";

export async function checkMxRecords(domain: string): Promise<MxCheckResult> {
  try {
    const url = `${DOH_ENDPOINT}?name=${encodeURIComponent(domain)}&type=MX`;
    const response = await fetch(url, {
      headers: { Accept: "application/dns-json" },
      signal: AbortSignal.timeout(5000),
    });

    if (!response.ok) {
      return { checked: false, hasMx: null, records: [], error: `DNS query failed with HTTP ${response.status}` };
    }

    const data = (await response.json()) as { Answer?: Array<{ data: string; type: number }> };
    const mxRecords = (data.Answer ?? []).filter((a) => a.type === 15).map((a) => a.data);

    return { checked: true, hasMx: mxRecords.length > 0, records: mxRecords };
  } catch (err) {
    return { checked: false, hasMx: null, records: [], error: err instanceof Error ? err.message : "Unknown DNS error" };
  }
}
