/**
 * Badge snippet generators — produce self-contained code in multiple
 * formats so users can paste the verified badge anywhere (HTML, Markdown,
 * React/JSX, iframe, email signature) without external CSS or JS.
 *
 * Every snippet:
 *  - links to `https://qitaat.com/<username>?ref=badge&utm_*` for attribution
 *  - embeds a 1×1 tracking pixel against the public `badge-pixel` edge fn
 *  - has no external dependencies
 */

export type BadgeVariant = 'light' | 'dark' | 'compact' | 'gradient' | 'minimal';
export type BadgeSize = 'sm' | 'md' | 'lg';
export type BadgeAccent = 'emerald' | 'brand' | 'blue' | 'slate';

export const SITE_URL = 'https://qitaat.com';
export const PIXEL_URL =
  'https://hckpxwhjycmdflaneihd.supabase.co/functions/v1/badge-pixel';

export interface BadgeBuildOptions {
  username: string;
  displayName: string;
  variant: BadgeVariant;
  size?: BadgeSize;
  accent?: BadgeAccent;
  isRTL: boolean;
  showSubLabel?: boolean;
  /** Optional custom hex color (e.g. "#a855f7") — overrides accent palette solid color. */
  customAccent?: string;
  /** Optional logo embedded as data URL (PNG/SVG). Replaces the default shield seal. */
  logoDataUrl?: string;
  /** CSS font-family stack used for the workshop name. Falls back to system stack. */
  fontFamily?: string;
}

const ACCENTS: Record<BadgeAccent, { solid: string; soft: string; ring: string; text: string }> = {
  emerald: { solid: '#10b981', soft: '#ecfdf5', ring: '#d1fae5', text: '#065f46' },
  brand:   { solid: '#1f8a4c', soft: '#ecfdf5', ring: '#bbf0cf', text: '#0f5f33' },
  blue:    { solid: '#2563eb', soft: '#eff6ff', ring: '#dbeafe', text: '#1e3a8a' },
  slate:   { solid: '#475569', soft: '#f1f5f9', ring: '#e2e8f0', text: '#0f172a' },
};

const DEFAULT_FONT = "-apple-system,Segoe UI,Roboto,Helvetica,Arial,sans-serif";

/** Lighten/darken a hex color by mixing with white (positive amount) or black (negative amount). */
function mixHex(hex: string, amount: number): string {
  const m = /^#?([a-f\d]{6})$/i.exec(hex.trim());
  if (!m) return hex;
  const n = parseInt(m[1], 16);
  const r = (n >> 16) & 255, g = (n >> 8) & 255, b = n & 255;
  const target = amount >= 0 ? 255 : 0;
  const a = Math.abs(amount);
  const mix = (c: number) => Math.round(c + (target - c) * a);
  return `#${[mix(r), mix(g), mix(b)].map(c => c.toString(16).padStart(2, '0')).join('')}`;
}

function resolveAccent(opts: BadgeBuildOptions) {
  const base = ACCENTS[opts.accent ?? 'emerald'];
  if (!opts.customAccent) return base;
  const solid = opts.customAccent;
  return { solid, soft: mixHex(solid, 0.88), ring: mixHex(solid, 0.7), text: mixHex(solid, -0.35) };
}

const SIZES: Record<BadgeSize, { padX: number; padY: number; iconBox: number; icon: number; label: number; sub: number; gap: number; radius: number }> = {
  sm: { padX: 10, padY: 7,  iconBox: 26, icon: 14, label: 12, sub: 10, gap: 8,  radius: 10 },
  md: { padX: 14, padY: 10, iconBox: 32, icon: 18, label: 13, sub: 11, gap: 10, radius: 12 },
  lg: { padX: 18, padY: 13, iconBox: 40, icon: 22, label: 15, sub: 12, gap: 12, radius: 14 },
};

function escapeAttr(s: string): string {
  return s.replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/</g, '&lt;');
}

/** Escape user-controlled text for safe injection into HTML/SVG text nodes. */
function escapeHtml(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

export function buildProfileLink(username: string): string {
  return `${SITE_URL}/${username}?ref=badge&utm_source=workshop_site&utm_medium=badge&utm_campaign=verified`;
}

function pixelTag(username: string, variant: BadgeVariant): string {
  return `<img src="${PIXEL_URL}?u=${encodeURIComponent(username)}&v=${variant}" alt="" width="1" height="1" style="position:absolute;width:1px;height:1px;opacity:0;border:0;pointer-events:none;" referrerpolicy="no-referrer-when-downgrade" loading="eager" />`;
}

const SHIELD_PATH =
  '<path d="M20 13c0 5-3.5 7.5-8 9-4.5-1.5-8-4-8-9V5l8-3 8 3z"/><path d="m9 12 2 2 4-4"/>';

/** Standalone SVG (no anchor). Useful for downloads and image embeds. */
export function buildBadgeSvg(opts: BadgeBuildOptions): string {
  const variant = opts.variant;
  const size = SIZES[opts.size ?? 'md'];
  const accent = resolveAccent(opts);
  const fontFamily = opts.fontFamily || DEFAULT_FONT;
  const label = opts.isRTL ? 'موثّق على قِطاعات' : 'Verified on Qitaat';
  const safeDisplay = escapeHtml(opts.displayName);
  const sub = opts.isRTL ? `قِطاعات · ${safeDisplay}` : `Qitaat · ${safeDisplay}`;
  const showSub = opts.showSubLabel !== false && variant !== 'compact' && variant !== 'minimal';
  const isDark = variant === 'dark';
  const isGradient = variant === 'gradient';
  const fg = isDark ? '#f8fafc' : '#0f172a';
  const subFg = isDark ? '#94a3b8' : '#64748b';
  const w = 320;
  const h = showSub ? 70 : 50;
  const bgFill = isGradient
    ? `<defs><linearGradient id="bg" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="${accent.solid}"/><stop offset="1" stop-color="${mixHex(accent.solid, -0.25)}"/></linearGradient></defs><rect width="${w}" height="${h}" rx="${size.radius}" fill="url(#bg)"/>`
    : `<rect width="${w}" height="${h}" rx="${size.radius}" fill="${isDark ? '#0f172a' : '#ffffff'}" stroke="${isDark ? '#1e293b' : '#e2e8f0'}"/>`;
  const sealCircle = `<circle cx="${size.iconBox / 2}" cy="${size.iconBox / 2}" r="${size.iconBox / 2}" fill="${isGradient ? '#ffffff33' : accent.solid}"/>`;
  const sealInner = opts.logoDataUrl
    ? `<defs><clipPath id="logoClip"><circle cx="${size.iconBox / 2}" cy="${size.iconBox / 2}" r="${size.iconBox / 2 - 1}"/></clipPath></defs><image href="${escapeAttr(opts.logoDataUrl)}" x="1" y="1" width="${size.iconBox - 2}" height="${size.iconBox - 2}" clip-path="url(#logoClip)" preserveAspectRatio="xMidYMid slice"/>`
    : `<g transform="translate(${(size.iconBox - size.icon) / 2},${(size.iconBox - size.icon) / 2})" stroke="#ffffff" stroke-width="2.5" fill="none" stroke-linecap="round" stroke-linejoin="round">${SHIELD_PATH.replace(/24/g, String(size.icon))}</g>`;
  const seal = `<g transform="translate(${size.padX},${(h - size.iconBox) / 2})">${sealCircle}${sealInner}</g>`;
  const textX = size.padX + size.iconBox + size.gap;
  const textY = showSub ? h / 2 - 4 : h / 2 + size.label / 3;
  const text = `<text x="${textX}" y="${textY}" fill="${isGradient ? '#ffffff' : fg}" font-family="${escapeAttr(fontFamily)}" font-size="${size.label}" font-weight="700">${label}</text>${showSub ? `<text x="${textX}" y="${h / 2 + size.sub + 4}" fill="${isGradient ? '#ffffffcc' : subFg}" font-family="${escapeAttr(fontFamily)}" font-size="${size.sub}" font-weight="500">${sub}</text>` : ''}`;
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}" viewBox="0 0 ${w} ${h}" role="img" aria-label="${escapeAttr(label)}">${bgFill}${seal}${text}</svg>`;
}

/** Self-contained anchor + inline SVG. Ready to paste anywhere. */
export function buildBadgeHtml(opts: BadgeBuildOptions): string {
  const { username, displayName, variant, isRTL } = opts;
  const size = SIZES[opts.size ?? 'md'];
  const accent = resolveAccent(opts);
  const fontFamily = opts.fontFamily || DEFAULT_FONT;
  const href = buildProfileLink(username);
  const label = isRTL ? 'موثّق على قِطاعات' : 'Verified on Qitaat';
  const safeDisplay = escapeHtml(displayName);
  const sub = isRTL ? `قِطاعات · ${safeDisplay}` : `Qitaat · ${safeDisplay}`;
  // Use full HTML escape (incl. apostrophe) for attribute values too, so
  // payloads cannot break out regardless of single/double-quoted context.
  const safeName = escapeHtml(displayName);
  const pixel = pixelTag(username, variant);
  const dir = isRTL ? 'rtl' : 'ltr';
  const showSub = opts.showSubLabel !== false;

  if (variant === 'compact') {
    return `<a href="${href}" target="_blank" rel="noopener" title="${safeName} — ${label}" style="display:inline-flex;align-items:center;gap:6px;padding:4px 10px;border:1px solid ${accent.ring};border-radius:9999px;background:${accent.soft};color:${accent.text};font:600 12px/1 ${fontFamily};text-decoration:none;position:relative;">
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${SHIELD_PATH}</svg>
  <span>${label}</span>
  ${pixel}
</a>`;
  }

  if (variant === 'minimal') {
    return `<a href="${href}" target="_blank" rel="noopener" title="${safeName} — ${label}" style="display:inline-flex;align-items:center;gap:6px;color:${accent.solid};font:600 13px/1.2 ${fontFamily};text-decoration:none;position:relative;">
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${SHIELD_PATH}</svg>
  <span>${label}</span>
  ${pixel}
</a>`;
  }

  const isDark = variant === 'dark';
  const isGradient = variant === 'gradient';
  const bg = isGradient
    ? `linear-gradient(135deg, ${accent.solid}, ${mixHex(accent.solid, -0.25)})`
    : isDark ? '#0f172a' : '#ffffff';
  const border = isGradient ? 'transparent' : isDark ? '#1e293b' : '#e2e8f0';
  const fg = isGradient ? '#ffffff' : isDark ? '#f8fafc' : '#0f172a';
  const subFg = isGradient ? 'rgba(255,255,255,.85)' : isDark ? '#94a3b8' : '#64748b';
  const sealBg = isGradient ? 'rgba(255,255,255,.18)' : accent.solid;
  const sealFg = '#ffffff';
  const sealInnerHtml = opts.logoDataUrl
    ? `<img src="${escapeAttr(opts.logoDataUrl)}" alt="${escapeAttr(opts.displayName)}" width="${size.iconBox - 2}" height="${size.iconBox - 2}" style="width:${size.iconBox - 2}px;height:${size.iconBox - 2}px;border-radius:9999px;object-fit:cover;display:block;" />`
    : `<svg width="${size.icon}" height="${size.icon}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${SHIELD_PATH}</svg>`;

  return `<a href="${href}" target="_blank" rel="noopener" title="${safeName} — ${label}" dir="${dir}" style="display:inline-flex;align-items:center;gap:${size.gap}px;padding:${size.padY}px ${size.padX}px;border:1px solid ${border};border-radius:${size.radius}px;background:${bg};color:${fg};font:600 ${size.label}px/1.2 ${fontFamily};text-decoration:none;box-shadow:0 1px 2px rgba(0,0,0,.04);position:relative;">
  <span style="display:inline-flex;align-items:center;justify-content:center;width:${size.iconBox}px;height:${size.iconBox}px;border-radius:9999px;background:${sealBg};color:${sealFg};flex:none;overflow:hidden;">
    ${sealInnerHtml}
  </span>
  <span style="display:inline-flex;flex-direction:column;gap:2px;line-height:1.15;">
    <span style="font-size:${size.label}px;font-weight:700;">${label}</span>
    ${showSub ? `<span style="font-size:${size.sub}px;font-weight:500;color:${subFg};">${sub}</span>` : ''}
  </span>
  ${pixel}
</a>`;
}

export function buildBadgeMarkdown(opts: BadgeBuildOptions): string {
  const href = buildProfileLink(opts.username);
  const label = opts.isRTL ? 'موثّق على قِطاعات' : 'Verified on Qitaat';
  return `[![${label}](${SITE_URL}/badge/verified.svg)](${href})`;
}

export function buildBadgeJsx(opts: BadgeBuildOptions): string {
  const html = buildBadgeHtml(opts);
  // JSX needs camelCase + className; minimal conversion sufficient for paste.
  const jsx = html
    .replace(/\bclass=/g, 'className=')
    .replace(/style="([^"]*)"/g, (_m, css: string) => {
      const obj = css
        .split(';')
        .map((kv) => kv.trim())
        .filter(Boolean)
        .map((kv) => {
          const [rawK, ...rest] = kv.split(':');
          const key = rawK.trim().replace(/-([a-z])/g, (_, c: string) => c.toUpperCase());
          const val = rest.join(':').trim();
          return `${key}:'${val.replace(/'/g, "\\'")}'`;
        })
        .join(',');
      return `style={{${obj}}}`;
    });
  return `export function QitaatVerifiedBadge() {\n  return (\n    ${jsx}\n  );\n}`;
}

export function buildBadgeIframe(opts: BadgeBuildOptions): string {
  const href = buildProfileLink(opts.username);
  // Minimal cross-origin iframe; users can host the badge HTML themselves
  // or link directly to the profile preview page.
  return `<iframe src="${href}&embed=1" title="Qitaat verified badge" width="320" height="80" frameborder="0" loading="lazy" referrerpolicy="no-referrer-when-downgrade" style="border:0;border-radius:12px;overflow:hidden;"></iframe>`;
}

export function buildEmailSignature(opts: BadgeBuildOptions): string {
  const compact = buildBadgeHtml({ ...opts, variant: 'compact' });
  return `<table cellpadding="0" cellspacing="0" border="0"><tr><td style="padding-top:8px;">${compact}</td></tr></table>`;
}

/**
 * Rasterize an SVG markup string to a PNG Blob via a canvas at the chosen scale.
 * Returns null if the browser cannot decode the SVG (e.g. tainted by external image).
 */
export function svgToPngBlob(svgMarkup: string, scale = 3): Promise<Blob | null> {
  return new Promise((resolve) => {
    const widthMatch = /width="(\d+)"/.exec(svgMarkup);
    const heightMatch = /height="(\d+)"/.exec(svgMarkup);
    const w = widthMatch ? Number(widthMatch[1]) : 320;
    const h = heightMatch ? Number(heightMatch[1]) : 70;
    const blob = new Blob([svgMarkup], { type: 'image/svg+xml;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => {
      const canvas = document.createElement('canvas');
      canvas.width = Math.round(w * scale);
      canvas.height = Math.round(h * scale);
      const ctx = canvas.getContext('2d');
      if (!ctx) { URL.revokeObjectURL(url); resolve(null); return; }
      ctx.scale(scale, scale);
      ctx.drawImage(img, 0, 0);
      URL.revokeObjectURL(url);
      canvas.toBlob((b) => resolve(b), 'image/png');
    };
    img.onerror = () => { URL.revokeObjectURL(url); resolve(null); };
    img.src = url;
  });
}
