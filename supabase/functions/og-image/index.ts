// Dynamic Open Graph image renderer for Qitaat.
// Returns a 1200x630 PNG (default) or SVG with Qitaat branding, title and
// optional subtitle. Public endpoint — no auth, no DB writes. Heavily cached.
//
// Query params (all optional):
//   type     : 'business' | 'blog' | 'project' | 'category' | 'sector' | 'page'
//   title    : main heading (Arabic or English, up to ~80 chars)
//   subtitle : secondary line (up to ~120 chars)
//   image    : absolute https URL of an inline cover image (jpg/png/webp)
//   format   : 'png' (default) | 'svg'
//
// PNG output is rasterized server-side via @resvg/resvg-wasm and bundled
// Noto Sans Arabic + Inter TTFs so Arabic glyphs render correctly. PNG is the
// safest format for Facebook / WhatsApp crawlers; SVG remains available for
// debugging and for crawlers that handle SVG well (Twitter/X, LinkedIn, Slack,
// Discord, Telegram). If PNG rasterization fails for any reason, the function
// gracefully degrades to SVG so callers never get a 5xx.

import { initWasm, Resvg } from "https://esm.sh/@resvg/resvg-wasm";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// Industrial brand palette — mirrors `BRAND_COLORS` from src/config/brandTheme.ts.
// Inlined here because Edge Functions cannot import from src/.
const PALETTE = {
  bg0:      "#131722", // navy-900 / brand surface-nav
  bg1:      "#1A2230", // navy-800 / text default
  accent:   "#0E9E6F", // brand primary (industrial green)
  accentSoft: "#E6F7F0", // brand primary-light tint
  text:     "#F7F8FA", // brand surface-1 (near-white)
  muted:    "#94A0B2", // brand slate-400
};

const TYPE_LABEL: Record<string, { ar: string; en: string }> = {
  business: { ar: "مزود معتمد", en: "Verified Provider" },
  blog: { ar: "مقال", en: "Article" },
  project: { ar: "مشروع", en: "Project" },
  category: { ar: "تصنيف", en: "Category" },
  sector: { ar: "قطاع", en: "Sector" },
  page: { ar: "قِطاعات", en: "Qitaat" },
};

function escapeXml(input: string): string {
  return input
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}

function clamp(input: string, max: number): string {
  if (!input) return "";
  if (input.length <= max) return input;
  return input.slice(0, max - 1).trimEnd() + "…";
}

/**
 * Wrap a string into ~maxCharsPerLine chunks without splitting words when
 * possible. Falls back to hard slicing for languages without spaces. Returns
 * up to `maxLines` lines.
 */
function wrap(input: string, maxCharsPerLine: number, maxLines: number): string[] {
  if (!input) return [];
  const words = input.split(/\s+/).filter(Boolean);
  const lines: string[] = [];
  let current = "";
  for (const w of words) {
    if ((current + " " + w).trim().length <= maxCharsPerLine) {
      current = (current + " " + w).trim();
    } else {
      if (current) lines.push(current);
      if (lines.length >= maxLines) break;
      current = w;
    }
  }
  if (current && lines.length < maxLines) lines.push(current);
  // Hard fallback: very long single token
  if (lines.length === 0 && input.length > 0) {
    for (let i = 0; i < input.length && lines.length < maxLines; i += maxCharsPerLine) {
      lines.push(input.slice(i, i + maxCharsPerLine));
    }
  }
  if (lines.length === maxLines) {
    const last = lines[maxLines - 1];
    if (last.length > maxCharsPerLine - 2) lines[maxLines - 1] = last.slice(0, maxCharsPerLine - 2) + "…";
  }
  return lines;
}

function buildSvg(params: {
  title: string;
  subtitle: string;
  type: string;
  image: string | null;
  isRtl: boolean;
}): string {
  const { title, subtitle, type, image, isRtl } = params;
  const labels = TYPE_LABEL[type] || TYPE_LABEL.page;
  const typeLabel = isRtl ? labels.ar : labels.en;

  const titleLines = wrap(title, isRtl ? 28 : 32, 3);
  const subtitleLines = wrap(subtitle, isRtl ? 56 : 64, 2);

  const textAnchor = isRtl ? "end" : "start";
  const textX = isRtl ? 1140 : 60;
  const direction = isRtl ? "rtl" : "ltr";

  // Font families that are guaranteed to resolve in PNG mode (resvg loads
  // bundled Noto Sans Arabic + Inter buffers). Browsers viewing the SVG
  // directly fall back through the same chain to system equivalents.
  const fontFamily = isRtl
    ? "'Noto Sans Arabic', 'IBM Plex Sans Arabic', 'Tajawal', system-ui, sans-serif"
    : "'Inter', system-ui, -apple-system, 'Segoe UI', sans-serif";

  // Optional cover image rendered as a soft-tinted band on the right (LTR)
  // or left (RTL). Falls back to a brand pattern if no image is provided.
  const coverBand = image
    ? `
      <defs>
        <clipPath id="coverClip">
          <rect x="${isRtl ? 0 : 760}" y="0" width="440" height="630" />
        </clipPath>
        <linearGradient id="coverFade" x1="${isRtl ? 1 : 0}" y1="0" x2="${isRtl ? 0 : 1}" y2="0">
          <stop offset="0" stop-color="${PALETTE.bg0}" stop-opacity="0.92"/>
          <stop offset="0.4" stop-color="${PALETTE.bg0}" stop-opacity="0.35"/>
          <stop offset="1" stop-color="${PALETTE.bg0}" stop-opacity="0"/>
        </linearGradient>
      </defs>
      <image href="${escapeXml(image)}" x="${isRtl ? 0 : 760}" y="0" width="440" height="630" preserveAspectRatio="xMidYMid slice" clip-path="url(#coverClip)" />
      <rect x="${isRtl ? 0 : 760}" y="0" width="440" height="630" fill="url(#coverFade)" />`
    : "";

  const titleTspans = titleLines
    .map((line, i) => `<tspan x="${textX}" dy="${i === 0 ? 0 : 86}">${escapeXml(line)}</tspan>`)
    .join("");
  const subtitleTspans = subtitleLines
    .map((line, i) => `<tspan x="${textX}" dy="${i === 0 ? 0 : 42}">${escapeXml(line)}</tspan>`)
    .join("");

  // Brand mark: Arabic letter "ق" inside a gold disc.
  const brandX = isRtl ? 1140 : 60;
  const brandTextAnchor = isRtl ? "end" : "start";
  const discCx = isRtl ? 1100 : 100;

  return `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" width="1200" height="630" viewBox="0 0 1200 630" direction="${direction}">
  <defs>
    <linearGradient id="bg" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0" stop-color="${PALETTE.bg0}"/>
      <stop offset="1" stop-color="${PALETTE.bg1}"/>
    </linearGradient>
    <linearGradient id="goldGrad" x1="0" y1="0" x2="1" y2="1">
     <stop offset="0" stop-color="${PALETTE.accent}"/>
     <stop offset="1" stop-color="${PALETTE.accentSoft}"/>
    </linearGradient>
  </defs>
  <rect width="1200" height="630" fill="url(#bg)"/>
  ${coverBand}
  <!-- subtle vignette -->
  <rect width="1200" height="630" fill="black" opacity="0.08"/>

  <!-- brand row -->
  <circle cx="${discCx}" cy="100" r="36" fill="url(#goldGrad)"/>
  <text x="${discCx}" y="115" text-anchor="middle" font-family="${fontFamily}" font-size="42" font-weight="800" fill="${PALETTE.bg0}">ق</text>
  <text x="${isRtl ? discCx - 56 : discCx + 56}" y="92" text-anchor="${brandTextAnchor}" font-family="${fontFamily}" font-size="28" font-weight="700" fill="${PALETTE.text}">قِطاعات</text>
  <text x="${isRtl ? discCx - 56 : discCx + 56}" y="122" text-anchor="${brandTextAnchor}" font-family="${fontFamily}" font-size="20" font-weight="500" fill="${PALETTE.muted}">qitaat.com</text>

  <!-- type chip -->
  <g transform="translate(${isRtl ? 1010 : 60}, 200)">
    <rect x="0" y="0" rx="999" ry="999" width="130" height="44" fill="${PALETTE.accent}" opacity="0.18"/>
    <text x="65" y="29" text-anchor="middle" font-family="${fontFamily}" font-size="20" font-weight="700" fill="${PALETTE.accent}">${escapeXml(typeLabel)}</text>
  </g>

  <!-- title -->
  <text x="${textX}" y="320" text-anchor="${textAnchor}" font-family="${fontFamily}" font-size="68" font-weight="800" fill="${PALETTE.text}">
    ${titleTspans}
  </text>

  <!-- subtitle -->
  <text x="${textX}" y="${320 + titleLines.length * 86 + 40}" text-anchor="${textAnchor}" font-family="${fontFamily}" font-size="32" font-weight="500" fill="${PALETTE.muted}">
    ${subtitleTspans}
  </text>

  <!-- footer accent -->
  <rect x="0" y="618" width="1200" height="12" fill="url(#goldGrad)"/>
</svg>`;
}

function detectRtl(input: string): boolean {
  // Arabic, Hebrew, Persian ranges
  return /[\u0600-\u06FF\u0750-\u077F\u08A0-\u08FF\u0590-\u05FF]/.test(input || "");
}

// ── PNG rasterization (resvg-wasm + bundled fonts) ─────────────────────────

const RESVG_WASM_URL = "https://cdn.jsdelivr.net/npm/@resvg/resvg-wasm/index_bg.wasm";
// Stable TTF sources hosted under the google/fonts and notofonts repos.
// Both repos serve raw binary fonts via raw.githubusercontent.com (HTTP 200).
const ARABIC_FONT_URL =
  "https://raw.githubusercontent.com/notofonts/noto-fonts/main/hinted/ttf/NotoSansArabic/NotoSansArabic-Bold.ttf";
const LATIN_FONT_URL =
  "https://raw.githubusercontent.com/google/fonts/main/ofl/inter/Inter%5Bopsz%2Cwght%5D.ttf";

let wasmReady: Promise<void> | null = null;
let fontBuffersPromise: Promise<Uint8Array[]> | null = null;

async function ensureWasm(): Promise<void> {
  if (!wasmReady) {
    wasmReady = (async () => {
      const res = await fetch(RESVG_WASM_URL);
      if (!res.ok) throw new Error(`wasm_fetch_${res.status}`);
      await initWasm(await res.arrayBuffer());
    })().catch((err) => {
      wasmReady = null;
      throw err;
    });
  }
  return wasmReady;
}

async function ensureFonts(): Promise<Uint8Array[]> {
  if (!fontBuffersPromise) {
    fontBuffersPromise = (async () => {
      const fetchFont = async (url: string): Promise<Uint8Array> => {
        const res = await fetch(url, { redirect: "follow" });
        if (!res.ok) throw new Error(`font_fetch_${res.status}`);
        return new Uint8Array(await res.arrayBuffer());
      };
      return await Promise.all([fetchFont(ARABIC_FONT_URL), fetchFont(LATIN_FONT_URL)]);
    })().catch((err) => {
      fontBuffersPromise = null;
      throw err;
    });
  }
  return fontBuffersPromise;
}

async function rasterize(svg: string): Promise<Uint8Array> {
  await ensureWasm();
  const fonts = await ensureFonts();
  const resvg = new Resvg(svg, {
    fitTo: { mode: "width", value: 1200 },
    background: PALETTE.bg0,
    font: {
      fontBuffers: fonts,
      loadSystemFonts: false,
      defaultFontFamily: "Inter",
    },
  });
  return resvg.render().asPng();
}

const CACHE_HEADER =
  "public, max-age=86400, s-maxage=604800, stale-while-revalidate=2592000";

function svgResponse(svg: string): Response {
  return new Response(svg, {
    status: 200,
    headers: {
      ...corsHeaders,
      "Content-Type": "image/svg+xml; charset=utf-8",
      "Cache-Control": CACHE_HEADER,
      "X-Content-Type-Options": "nosniff",
    },
  });
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  let svg = "";
  let format: "png" | "svg" = "png";
  try {
    const url = new URL(req.url);
    const type = (url.searchParams.get("type") || "page").toLowerCase();
    const title = clamp(
      url.searchParams.get("title") || "قِطاعات | دليل الصناعات والمقاولين",
      120,
    );
    const subtitle = clamp(
      url.searchParams.get("subtitle") ||
        "Qitaat — Industrial directory for Aluminum, Glass, Wood and Steel",
      200,
    );
    const rawImage = url.searchParams.get("image") || "";
    const image = /^https:\/\/[^\s"'<>]+$/i.test(rawImage) ? rawImage : null;
    format = (url.searchParams.get("format") || "png").toLowerCase() === "svg" ? "svg" : "png";
    const isRtl = detectRtl(title) || detectRtl(subtitle);

    svg = buildSvg({ title, subtitle, type, image, isRtl });

    if (format === "svg") return svgResponse(svg);

    try {
      const png = await rasterize(svg);
      return new Response(png, {
        status: 200,
        headers: {
          ...corsHeaders,
          "Content-Type": "image/png",
          "Cache-Control": CACHE_HEADER,
          "X-Content-Type-Options": "nosniff",
          "X-OG-Format": "png",
        },
      });
    } catch (rasterErr) {
      // Graceful degradation: never 5xx — fall back to SVG so callers always
      // receive a valid image response.
      console.error("og-image: PNG rasterization failed, falling back to SVG", rasterErr);
      const res = svgResponse(svg);
      res.headers.set("X-OG-Format", "svg-fallback");
      return res;
    }
  } catch (err) {
    const message = err instanceof Error ? err.message : "render_error";
    // Last-ditch fallback: minimal SVG card so OG tags always resolve to an image.
    const fallback = buildSvg({
      title: "قِطاعات",
      subtitle: "Qitaat — Industrial directory",
      type: "page",
      image: null,
      isRtl: true,
    });
    const res = svgResponse(fallback);
    res.headers.set("X-OG-Format", "svg-error");
    res.headers.set("X-OG-Error", message.slice(0, 80));
    return res;
  }
});