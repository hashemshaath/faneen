// Fetches the page that a CR QR code points to (e.g. Saudi Business Center
// public CR info page) and extracts the visible business data fields so the
// client can autofill forms. Always returns 200 OK JSON.

import "https://deno.land/x/xhr@0.1.0/mod.ts";

const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

interface Extracted {
  cr_number?: string;
  unified_number?: string;
  vat_number?: string;
  owner_name?: string;
  business_name_ar?: string;
  business_name_en?: string;
  legal_entity?: string;
  issue_date?: string;
  expiry_date?: string;
  status?: string;
  capital?: string;
  city?: string;
  extras: Record<string, string>;
}

function normDigits(s: string): string {
  return s
    .replace(/[\u0660-\u0669]/g, (d) => String(d.charCodeAt(0) - 0x0660))
    .replace(/[\u06F0-\u06F9]/g, (d) => String(d.charCodeAt(0) - 0x06F0));
}

function toIsoDate(input?: string): string | undefined {
  if (!input) return undefined;
  const s = normDigits(input).trim();
  if (/^\d{4}-\d{2}-\d{2}$/.test(s)) return s;
  const m = s.match(/^(\d{1,2})[/\-.](\d{1,2})[/\-.](\d{2,4})$/);
  if (m) {
    const [, d, mo, y] = m;
    const yy = y.length === 2 ? `20${y}` : y;
    return `${yy}-${mo.padStart(2, "0")}-${d.padStart(2, "0")}`;
  }
  const dt = new Date(s);
  if (!Number.isNaN(dt.getTime())) return dt.toISOString().slice(0, 10);
  return undefined;
}

/** Strip HTML tags + decode common entities + collapse whitespace. */
function stripHtml(html: string): string {
  return html
    .replace(/<script[\s\S]*?<\/script>/gi, " ")
    .replace(/<style[\s\S]*?<\/style>/gi, " ")
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#(\d+);/g, (_, n) => String.fromCharCode(parseInt(n, 10)))
    .replace(/\s+/g, " ")
    .trim();
}

/** Pull label→value pairs out of common HTML table/dl patterns. */
function extractKeyValues(html: string): Record<string, string> {
  const map: Record<string, string> = {};

  // <tr><td>label</td><td>value</td></tr>
  const trRe = /<tr[^>]*>([\s\S]*?)<\/tr>/gi;
  let tr: RegExpExecArray | null;
  while ((tr = trRe.exec(html)) !== null) {
    const cells = [...tr[1].matchAll(/<t[dh][^>]*>([\s\S]*?)<\/t[dh]>/gi)].map((m) =>
      stripHtml(m[1]),
    );
    if (cells.length >= 2 && cells[0] && cells[1]) {
      map[cells[0]] = cells[1];
    }
  }

  // <dt>label</dt><dd>value</dd>
  const dlRe = /<dt[^>]*>([\s\S]*?)<\/dt>\s*<dd[^>]*>([\s\S]*?)<\/dd>/gi;
  let dl: RegExpExecArray | null;
  while ((dl = dlRe.exec(html)) !== null) {
    const k = stripHtml(dl[1]);
    const v = stripHtml(dl[2]);
    if (k && v) map[k] = v;
  }

  // <div class="label">..</div><div class="value">..</div> (heuristic)
  const divRe =
    /<(?:div|span|p)[^>]*(?:class|id)="[^"]*(?:label|key|title|field-?name)[^"]*"[^>]*>([\s\S]*?)<\/(?:div|span|p)>\s*<(?:div|span|p)[^>]*(?:class|id)="[^"]*(?:value|val|field-?value|data)[^"]*"[^>]*>([\s\S]*?)<\/(?:div|span|p)>/gi;
  let dv: RegExpExecArray | null;
  while ((dv = divRe.exec(html)) !== null) {
    const k = stripHtml(dv[1]);
    const v = stripHtml(dv[2]);
    if (k && v) map[k] = v;
  }

  return map;
}

/** Map a localized label to a canonical field. */
function assignField(out: Extracted, rawKey: string, rawValue: string) {
  const key = rawKey.toLowerCase().replace(/\s+/g, " ").trim();
  const value = normDigits(rawValue).trim();
  if (!value || value === "-" || value === "—") return;

  const has = (...needles: string[]) => needles.some((n) => key.includes(n));

  if (has("رقم السجل", "السجل التجاري", "cr no", "cr number", "registration number", "commercial registration")) {
    const m = value.match(/\d{7,12}/);
    if (m) out.cr_number = m[0];
    return;
  }
  if (has("الرقم الموحد", "unified number", "unified no", "700")) {
    const m = value.match(/\d{8,12}/);
    if (m) out.unified_number = m[0];
    return;
  }
  if (has("الرقم الضريبي", "ضريبة القيمة", "vat", "tax number", "trn")) {
    const m = value.match(/\d{10,16}/);
    if (m) out.vat_number = m[0];
    return;
  }
  if (has("اسم المالك", "المالك", "owner", "merchant")) {
    out.owner_name = value;
    return;
  }
  if (has("الاسم التجاري", "اسم المنشأة", "اسم الشركة", "trade name", "entity name", "business name", "company name")) {
    if (/[\u0600-\u06FF]/.test(value)) out.business_name_ar = value;
    else out.business_name_en = value;
    return;
  }
  if (has("الاسم بالإنجليزية", "english name", "name (en)")) {
    out.business_name_en = value;
    return;
  }
  if (has("الكيان", "النشاط القانوني", "نوع الكيان", "legal entity", "legal form", "entity type")) {
    out.legal_entity = value;
    return;
  }
  if (has("تاريخ الإصدار", "تاريخ القيد", "issue date", "issued", "start date")) {
    out.issue_date = toIsoDate(value);
    return;
  }
  if (has("تاريخ الانتهاء", "انتهاء السجل", "expiry", "expire", "end date")) {
    out.expiry_date = toIsoDate(value);
    return;
  }
  if (has("الحالة", "status")) {
    out.status = value;
    return;
  }
  if (has("رأس المال", "capital")) {
    out.capital = value;
    return;
  }
  if (has("المدينة", "city", "المركز الرئيسي")) {
    out.city = value;
    return;
  }

  out.extras[rawKey] = value;
}

/** Last-chance extraction: scan plain text for known numeric IDs. */
function fallbackFromText(text: string, out: Extracted) {
  const t = normDigits(text);
  if (!out.cr_number) {
    const m = t.match(/\b(\d{10})\b/);
    if (m) out.cr_number = m[1];
  }
  if (!out.unified_number) {
    const m = t.match(/\b(7\d{8,10})\b/);
    if (m) out.unified_number = m[1];
  }
  if (!out.vat_number) {
    const m = t.match(/\b(3\d{13,14})\b/);
    if (m) out.vat_number = m[1];
  }
}

async function fetchPage(url: string): Promise<{ ok: true; html: string } | { ok: false; error: string }> {
  try {
    const u = new URL(url);
    if (!/^https?:$/.test(u.protocol)) {
      return { ok: false, error: "Only http(s) URLs are supported" };
    }
    const ctrl = new AbortController();
    const t = setTimeout(() => ctrl.abort(), 12_000);
    const res = await fetch(u.toString(), {
      signal: ctrl.signal,
      headers: {
        "User-Agent":
          "Mozilla/5.0 (compatible; QitaatCrFetcher/1.0; +https://qitaat.com)",
        "Accept": "text/html,application/xhtml+xml,application/json;q=0.9,*/*;q=0.8",
        "Accept-Language": "ar,en;q=0.9",
      },
      redirect: "follow",
    });
    clearTimeout(t);
    if (!res.ok) return { ok: false, error: `Upstream ${res.status}` };
    const ct = res.headers.get("content-type") || "";
    const body = await res.text();
    if (ct.includes("application/json")) {
      return { ok: true, html: `<pre>${body}</pre>` };
    }
    return { ok: true, html: body };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : String(e) };
  }
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: cors });
  try {
    const { url } = (await req.json().catch(() => ({}))) as { url?: string };
    if (!url || typeof url !== "string") {
      return new Response(
        JSON.stringify({ ok: false, error: "Missing url" }),
        { status: 200, headers: { ...cors, "content-type": "application/json" } },
      );
    }

    const page = await fetchPage(url);
    if (!page.ok) {
      return new Response(
        JSON.stringify({ ok: false, error: page.error }),
        { status: 200, headers: { ...cors, "content-type": "application/json" } },
      );
    }

    const out: Extracted = { extras: {} };

    // 1) Try structured key/value scraping.
    const kv = extractKeyValues(page.html);
    for (const [k, v] of Object.entries(kv)) assignField(out, k, v);

    // 2) JSON-LD or embedded JSON.
    const jsonRe = /<script[^>]*type="application\/(?:ld\+json|json)"[^>]*>([\s\S]*?)<\/script>/gi;
    let j: RegExpExecArray | null;
    while ((j = jsonRe.exec(page.html)) !== null) {
      try {
        const data = JSON.parse(j[1]);
        const stack: unknown[] = [data];
        while (stack.length) {
          const cur = stack.pop();
          if (cur && typeof cur === "object") {
            for (const [k, v] of Object.entries(cur as Record<string, unknown>)) {
              if (v && typeof v === "object") stack.push(v);
              else if (v !== null && v !== undefined) assignField(out, k, String(v));
            }
          }
        }
      } catch { /* ignore */ }
    }

    // 3) Plain-text fallback for IDs.
    fallbackFromText(stripHtml(page.html), out);

    const found = Object.entries(out).filter(([k, v]) => k !== "extras" && v).length;

    return new Response(
      JSON.stringify({ ok: true, found, data: out }),
      { status: 200, headers: { ...cors, "content-type": "application/json" } },
    );
  } catch (e) {
    return new Response(
      JSON.stringify({ ok: false, error: e instanceof Error ? e.message : String(e) }),
      { status: 200, headers: { ...cors, "content-type": "application/json" } },
    );
  }
});