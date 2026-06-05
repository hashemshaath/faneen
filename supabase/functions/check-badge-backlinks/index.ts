import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const SITE_HOSTS = ["qitaat.com", "www.qitaat.com", "qitaat.lovable.app"];
const FETCH_TIMEOUT_MS = 12000;
const MAX_HTML_BYTES = 1_500_000;
const MAX_REDIRECTS = 5;

// SSRF defense: block private/loopback/link-local/metadata ranges.
function isPrivateIPv4(ip: string): boolean {
  const parts = ip.split(".").map((p) => Number(p));
  if (parts.length !== 4 || parts.some((n) => !Number.isInteger(n) || n < 0 || n > 255)) return true;
  const [a, b] = parts;
  if (a === 10) return true;
  if (a === 127) return true;
  if (a === 0) return true;
  if (a === 169 && b === 254) return true; // link-local + AWS/GCP metadata 169.254.169.254
  if (a === 172 && b >= 16 && b <= 31) return true;
  if (a === 192 && b === 168) return true;
  if (a === 100 && b >= 64 && b <= 127) return true; // CGNAT
  if (a >= 224) return true; // multicast/reserved
  return false;
}

function isBlockedHost(hostname: string): boolean {
  const h = hostname.toLowerCase().replace(/^\[|\]$/g, "");
  if (!h) return true;
  if (h === "localhost" || h.endsWith(".localhost") || h.endsWith(".local") || h.endsWith(".internal")) return true;
  // IPv6 loopback/link-local/ULA
  if (h === "::1" || h === "::" || h.startsWith("fc") || h.startsWith("fd") || h.startsWith("fe80:")) return true;
  if (h === "metadata.google.internal") return true;
  // IPv4 literal
  if (/^\d{1,3}(\.\d{1,3}){3}$/.test(h)) return isPrivateIPv4(h);
  return false;
}

function validateOutboundUrl(raw: string): URL | null {
  let u: URL;
  try { u = new URL(raw); } catch { return null; }
  if (u.protocol !== "http:" && u.protocol !== "https:") return null;
  if (u.username || u.password) return null;
  if (isBlockedHost(u.hostname)) return null;
  return u;
}

function normalizeUrl(input: string): string | null {
  try {
    const u = new URL(/^https?:\/\//i.test(input) ? input : `https://${input}`);
    return u.toString();
  } catch {
    return null;
  }
}

async function fetchHtml(url: string): Promise<{ status: number; html: string; finalUrl: string }> {
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), FETCH_TIMEOUT_MS);
  try {
    // Manual redirect walk so we re-validate each hop against the SSRF allowlist.
    let current = url;
    let res: Response | null = null;
    for (let hop = 0; hop <= MAX_REDIRECTS; hop++) {
      const checked = validateOutboundUrl(current);
      if (!checked) throw new Error(`blocked_host_or_scheme:${current}`);
      res = await fetch(checked.toString(), {
        redirect: "manual",
        signal: ctrl.signal,
        headers: {
          "User-Agent": "QitaatBadgeChecker/1.0 (+https://qitaat.com)",
          Accept: "text/html,application/xhtml+xml",
        },
      });
      if (res.status >= 300 && res.status < 400) {
        const loc = res.headers.get("location");
        if (!loc) break;
        try { current = new URL(loc, checked).toString(); } catch { throw new Error("invalid_redirect_target"); }
        if (hop === MAX_REDIRECTS) throw new Error("too_many_redirects");
        continue;
      }
      break;
    }
    if (!res) throw new Error("no_response");
    const reader = res.body?.getReader();
    let received = 0;
    const chunks: Uint8Array[] = [];
    if (reader) {
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        if (value) {
          received += value.byteLength;
          chunks.push(value);
          if (received >= MAX_HTML_BYTES) {
            try { await reader.cancel(); } catch { /* ignore */ }
            break;
          }
        }
      }
    }
    const merged = new Uint8Array(received);
    let offset = 0;
    for (const c of chunks) { merged.set(c, offset); offset += c.byteLength; }
    const html = new TextDecoder("utf-8", { fatal: false }).decode(merged);
    return { status: res.status, html, finalUrl: res.url || current };
  } finally {
    clearTimeout(timer);
  }
}

function findMatch(html: string, username: string): string | null {
  const lower = html.toLowerCase();
  const uname = username.toLowerCase();
  for (const host of SITE_HOSTS) {
    // accept http(s), with or without path slash, with any query/utm
    const re = new RegExp(
      `https?://${host.replace(/\./g, "\\.")}/${uname}(?:[/?#][^"'<>\\s]*)?`,
      "i",
    );
    const m = lower.match(re);
    if (m) return m[0];
  }
  return null;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  const supabase = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
  );

  try {
    const body = await req.json().catch(() => ({}));
    const limit = Math.min(Number(body?.limit ?? 200), 500);
    const onlyBusinessId: string | undefined = body?.business_id;

    let query = supabase
      .from("businesses")
      .select("id, username, website")
      .not("website", "is", null)
      .not("username", "is", null)
      .limit(limit);

    if (onlyBusinessId) query = query.eq("id", onlyBusinessId);

    const { data: businesses, error: qErr } = await query;
    if (qErr) throw qErr;

    const results = {
      total: businesses?.length ?? 0,
      found: 0,
      missing: 0,
      errors: 0,
    };

    for (const b of businesses ?? []) {
      const website = normalizeUrl(String(b.website ?? "").trim());
      const username = String(b.username ?? "").trim();
      if (!website || !username) continue;

      let httpStatus: number | null = null;
      let matched: string | null = null;
      let errMsg: string | null = null;

      try {
        const { status, html } = await fetchHtml(website);
        httpStatus = status;
        if (status >= 200 && status < 400) {
          matched = findMatch(html, username);
        }
      } catch (e) {
        errMsg = e instanceof Error ? e.message : String(e);
      }

      const found = !!matched;
      if (found) results.found++;
      else if (errMsg) results.errors++;
      else results.missing++;

      // upsert; bump consecutive_misses when not found
      const { data: existing } = await supabase
        .from("business_badge_status")
        .select("consecutive_misses")
        .eq("business_id", b.id)
        .maybeSingle();

      const misses = found ? 0 : ((existing?.consecutive_misses ?? 0) + 1);
      const now = new Date().toISOString();

      await supabase.from("business_badge_status").upsert({
        business_id: b.id,
        found,
        last_checked_at: now,
        last_found_at: found ? now : (existing ? undefined : null),
        http_status: httpStatus,
        checked_url: website,
        matched_url: matched,
        error: errMsg,
        consecutive_misses: misses,
      }, { onConflict: "business_id" });
    }

    return new Response(JSON.stringify({ success: true, ...results }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    return new Response(JSON.stringify({ success: false, error: msg }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});