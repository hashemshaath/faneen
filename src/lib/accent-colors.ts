/**
 * Accent color utilities — shared between App init and Settings page.
 *
 * SAFETY: this module MUST NOT touch brand-identity tokens.
 * It writes ONLY `--accent` and `--ring` on `:root`. Tokens like
 * `--gold`, `--gold-light`, `--gold-dark`, `--secondary`, `--brand-blue`,
 * `--gradient-gold`, `--gradient-brand`, `--shadow-gold` are owned by
 * `index.css` + `ThemeApplier` (brand identity v1.0) and must never be
 * overwritten from here — otherwise inline styles would defeat the brand
 * theme and reintroduce the historical gold palette.
 */
export const accentPresets = [
  // Default brand-aligned accent (industrial green primary).
  { key: 'emerald', label: { ar: 'أخضر',     en: 'Emerald' }, hsl: '159 76% 34%', light: '152 48% 94%', dark: '159 86% 20%' },
  // `gold` key is kept for backwards-compat with old `localStorage` values,
  // but its values now point to brand primary green — never to amber/yellow.
  { key: 'gold',    label: { ar: 'هوية',     en: 'Brand'   }, hsl: '159 76% 34%', light: '152 48% 94%', dark: '159 86% 20%' },
  { key: 'blue',    label: { ar: 'أزرق',     en: 'Blue'    }, hsl: '215 58% 43%', light: '215 50% 90%', dark: '217 60% 20%' },
  { key: 'orange',  label: { ar: 'برتقالي',  en: 'Orange'  }, hsl: '28 87% 54%',  light: '32 89% 90%',  dark: '31 93% 42%' },
  { key: 'rose',    label: { ar: 'وردي',     en: 'Rose'    }, hsl: '350 89% 60%', light: '350 89% 92%', dark: '350 89% 45%' },
  { key: 'violet',  label: { ar: 'بنفسجي',   en: 'Violet'  }, hsl: '270 76% 55%', light: '270 76% 92%', dark: '270 76% 42%' },
];

const VALID_KEYS = new Set(accentPresets.map((p) => p.key));
const DEFAULT_KEY = 'emerald';
const STORAGE_KEY = 'qitaat-accent';
// Storage key kept verbatim — renaming would re-fire the one-time cleanup
// for every existing user. See `docs/post-release-status-2026-06.md`
// do-not-remove list.
const CLEANUP_FLAG = 'qitaat_legacy_accent_cleanup_v1_done';

/** One-time cleanup: rewrite forbidden accent keys (`amber`, `yellow`,
 *  unknown values…) to the safe default. `gold` is kept as a
 *  backward-compatibility alias and re-mapped to brand green. */
const cleanupLegacyAccent = (): void => {
  try {
    if (localStorage.getItem(CLEANUP_FLAG) === '1') return;
    const cur = localStorage.getItem(STORAGE_KEY);
    if (cur && !VALID_KEYS.has(cur)) {
      localStorage.setItem(STORAGE_KEY, DEFAULT_KEY);
    }
    // Forbidden historical values that used to render amber/yellow UI.
    if (cur === 'amber' || cur === 'yellow') {
      localStorage.setItem(STORAGE_KEY, DEFAULT_KEY);
    }
    localStorage.setItem(CLEANUP_FLAG, '1');
  } catch { /* storage unavailable */ }
};

export const getStoredAccent = (): string => {
  try {
    const v = localStorage.getItem(STORAGE_KEY);
    return v && VALID_KEYS.has(v) ? v : DEFAULT_KEY;
  } catch { return DEFAULT_KEY; }
};

/**
 * Apply the chosen accent. Writes ONLY `--accent` and `--ring` to `:root`.
 * Brand-identity tokens (`--gold`, `--secondary`, `--brand-blue`, `--gradient-*`,
 * `--shadow-gold`) are intentionally NOT touched here — they remain owned by
 * `index.css` and `ThemeApplier`.
 */
export const applyAccent = (key: string) => {
  const safeKey = VALID_KEYS.has(key) ? key : DEFAULT_KEY;
  const preset = accentPresets.find((p) => p.key === safeKey) ?? accentPresets[0];
  const root = document.documentElement;
  root.style.setProperty('--accent', preset.hsl);
  root.style.setProperty('--ring', preset.hsl);
  try { localStorage.setItem(STORAGE_KEY, safeKey); } catch { /* ignore */ }
};

/** Initialise accent on app boot. Safe to call once from `main.tsx`/`App.tsx`. */
export const initAccentColor = (): void => {
  cleanupLegacyAccent();
  applyAccent(getStoredAccent());
};

// Backwards-compat: importing this module still initialises the accent so
// existing call-sites (`import "@/lib/accent-colors"`) keep working without
// having to wire `initAccentColor()` explicitly. Now safe — only --accent
// and --ring are written, never brand-identity tokens.
initAccentColor();
