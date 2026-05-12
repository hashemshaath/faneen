// Arabic font loader for jsPDF
// Caches the font in memory after first load

// PDF-AR1 (v3): Bundle the Arabic TTF locally instead of fetching from a CDN
// at runtime. Earlier builds depended on jsdelivr; when that fetch failed
// (CORS, offline, slow network, ad-blocker) the export silently fell back
// to Helvetica, which can't encode Arabic Unicode and produced
// `þòþäþ³` mojibake in the PDF text layer. Bundling guarantees the font
// is always present and same-origin.
import notoNaskhRegularUrl from '@/assets/fonts/NotoNaskhArabic-Regular.ttf?url';
import notoNaskhBoldUrl from '@/assets/fonts/NotoNaskhArabic-Bold.ttf?url';

let cachedFont: string | null = null;
let cachedFontBold: string | null = null;

const ARABIC_FONT_FILE = 'ArabicFont.ttf';
const ARABIC_FONT_FILE_BOLD = 'ArabicFont-Bold.ttf';
const ARABIC_FONT_NAME = 'ArabicFont';
const ARABIC_FONT_STYLES = ['normal', 'bold', 'italic', 'bolditalic'] as const;

// Validate the first bytes of the response are a real TrueType / OpenType
// signature. This guards against accidental WOFF/HTML/error pages being
// registered as fonts (which is exactly what produced the original
// mojibake bug).
export const isTrueTypeSignature = (bytes: Uint8Array): boolean => {
  if (bytes.length < 4) return false;
  const b0 = bytes[0], b1 = bytes[1], b2 = bytes[2], b3 = bytes[3];
  // 0x00010000 = TrueType, 'OTTO' = OpenType-CFF, 'true'/'typ1' = legacy TTF
  if (b0 === 0x00 && b1 === 0x01 && b2 === 0x00 && b3 === 0x00) return true;
  if (b0 === 0x4F && b1 === 0x54 && b2 === 0x54 && b3 === 0x4F) return true; // OTTO
  if (b0 === 0x74 && b1 === 0x72 && b2 === 0x75 && b3 === 0x65) return true; // 'true'
  if (b0 === 0x74 && b1 === 0x79 && b2 === 0x70 && b3 === 0x31) return true; // 'typ1'
  return false;
};

const shouldDebugArabicPdf = (): boolean => {
  if (!import.meta.env.DEV) return false;
  try {
    return window.localStorage.getItem('qitaat_pdf_arabic_debug') === '1';
  } catch {
    return false;
  }
};

const registerArabicFontBytes = (
  doc: { addFileToVFS: (file: string, data: string) => void; addFont: (file: string, name: string, style: string) => void },
  regularBase64: string,
  boldBase64: string | null,
) => {
  doc.addFileToVFS(ARABIC_FONT_FILE, regularBase64);
  doc.addFont(ARABIC_FONT_FILE, ARABIC_FONT_NAME, 'normal');
  doc.addFont(ARABIC_FONT_FILE, ARABIC_FONT_NAME, 'italic');
  if (boldBase64) {
    doc.addFileToVFS(ARABIC_FONT_FILE_BOLD, boldBase64);
    doc.addFont(ARABIC_FONT_FILE_BOLD, ARABIC_FONT_NAME, 'bold');
    doc.addFont(ARABIC_FONT_FILE_BOLD, ARABIC_FONT_NAME, 'bolditalic');
  } else {
    doc.addFont(ARABIC_FONT_FILE, ARABIC_FONT_NAME, 'bold');
    doc.addFont(ARABIC_FONT_FILE, ARABIC_FONT_NAME, 'bolditalic');
  }
};

const debugArabicFont = (details: Record<string, unknown>) => {
  if (!shouldDebugArabicPdf()) return;
  // Development-only, opt-in via localStorage flag; never logs in production.
  console.debug('[PDF-AR1] Arabic font verification', details);
};

const fetchAsBase64 = async (url: string): Promise<string | null> => {
  try {
    const response = await fetch(url);
    if (!response.ok) return null;
    const buffer = await response.arrayBuffer();
    const bytes = new Uint8Array(buffer);
    if (!isTrueTypeSignature(bytes)) {
      debugArabicFont({ url, reason: 'invalid-signature', magic: Array.from(bytes.slice(0, 4)) });
      return null;
    }
    let binary = '';
    const chunk = 0x8000;
    for (let i = 0; i < bytes.length; i += chunk) {
      binary += String.fromCharCode.apply(null, Array.from(bytes.subarray(i, i + chunk)) as unknown as number[]);
    }
    return btoa(binary);
  } catch (err) {
    debugArabicFont({ url, error: err instanceof Error ? err.message : String(err) });
    return null;
  }
};

export const registerArabicFont = async (doc: { addFileToVFS: (file: string, data: string) => void; addFont: (file: string, name: string, style: string) => void; getFontList?: () => Record<string, string[]> }): Promise<boolean> => {
  if (cachedFont) {
    try {
      registerArabicFontBytes(doc, cachedFont, cachedFontBold);
      debugArabicFont({ source: 'memory-cache', registeredFont: ARABIC_FONT_NAME, hasBold: !!cachedFontBold });
      return true;
    } catch {
      return false;
    }
  }

  // Bundled, same-origin URLs produced by Vite. No CORS, no network races.
  const regular
};

export const setupArabicDoc = async (doc: { setFont: (fontName: string, fontStyle?: string) => void; addFileToVFS: (file: string, data: string) => void; addFont: (file: string, name: string, style: string) => void; getFontList?: () => Record<string, string[]> }, isRTL: boolean) => {
  const loaded = await registerArabicFont(doc);
  if (loaded && isRTL) {
    doc.setFont(ARABIC_FONT_NAME, 'normal');
  }
  return loaded;
};

export const getArabicTableStyles = (isRTL: boolean, fontLoaded: boolean) => ({
  ...(isRTL && fontLoaded ? { font: ARABIC_FONT_NAME } : {}),
  halign: isRTL ? 'right' as const : 'left' as const,
});

type JsPdfFontLookup = {
  internal?: {
    getFont?: (fontName?: string, fontStyle?: string) => { metadata?: { toUnicode?: Record<string, number> } } | undefined;
  };
};

export const normalizeArabicPdfTextLayer = (doc: unknown) => {
  const pdf = doc as JsPdfFontLookup;
  for (const style of ARABIC_FONT_STYLES) {
    const map = pdf.internal?.getFont?.(ARABIC_FONT_NAME, style)?.metadata?.toUnicode;
    if (!map) continue;
    for (const key of Object.keys(map)) {
      const value = map[key];
      if (!Number.isFinite(value)) continue;
      const normalized = String.fromCodePoint(value).normalize('NFKC');
      const first = normalized.codePointAt(0);
      if (first && normalized.length === 1) map[key] = first;
    }
  }
};

// ── Print helper: renders content in a print-friendly popup ──
export const printContractSection = (title: string, contentHtml: string, isRTL: boolean) => {
  const win = window.open('', '_blank', 'width=900,height=700');
  if (!win) return;

  // Brand document tokens — kept inline (window.open popup is a fresh document
  // with no access to our app's CSS variables, so we hard-code the brand hex
  // values from `BRAND_DOCUMENTS` in `src/config/brandTheme.ts`).
  const C = {
    header:  '#131722', // pdfHeader / invoiceHeader
    accent:  '#0E9E6F', // pdfAccent  / invoiceAccent
    text:    '#1A2230', // invoiceText
    muted:   '#6B7689', // invoiceMuted
    border:  '#E2E6EE', // invoiceBorder
    surface2:'#F2F4F8', // surface-2 (zebra rows)
    accentSoft: '#E6F7F0', // primary-light (highlight tint, no gradients)
  };

  win.document.write(`<!DOCTYPE html>
<html dir="${isRTL ? 'rtl' : 'ltr'}" lang="${isRTL ? 'ar' : 'en'}">
<head>
  <meta charset="utf-8"/>
  <title>${title}</title>
  <style>
    @import url('https://fonts.googleapis.com/css2?family=Noto+Naskh+Arabic:wght@400;700&display=swap');
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body { font-family: 'Noto Naskh Arabic', 'Segoe UI', Tahoma, sans-serif; padding: 20mm; color: ${C.text}; direction: ${isRTL ? 'rtl' : 'ltr'}; font-size: 11pt; line-height: 1.6; }
    h1 { font-size: 18pt; text-align: center; margin-bottom: 4mm; color: ${C.header}; }
    h2 { font-size: 13pt; margin: 6mm 0 3mm; color: ${C.header}; border-bottom: 2px solid ${C.accent}; padding-bottom: 2mm; }
    table { width: 100%; border-collapse: collapse; margin: 3mm 0 6mm; }
    th, td { border: 1px solid ${C.border}; padding: 6px 10px; text-align: ${isRTL ? 'right' : 'left'}; font-size: 9pt; }
    th { background: ${C.header}; color: #FFFFFF; font-weight: 700; }
    tr:nth-child(even) { background: ${C.surface2}; }
    tfoot td { background: ${C.accentSoft}; font-weight: 700; }
    .info-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 2mm 8mm; margin: 3mm 0 6mm; }
    .info-item { display: flex; gap: 4mm; }
    .info-label { color: ${C.muted}; min-width: 80px; font-weight: 700; }
    .highlight { background: ${C.accentSoft}; padding: 2px 6px; border-radius: 3px; font-weight: 700; }
    .footer { text-align: center; margin-top: 10mm; color: ${C.muted}; font-size: 8pt; border-top: 1px solid ${C.border}; padding-top: 3mm; }
    .signatures { display: flex; justify-content: space-between; margin-top: 15mm; }
    .sig-box { text-align: center; width: 40%; }
    .sig-line { border-bottom: 1px solid ${C.accent}; margin-bottom: 3mm; height: 30mm; }
    @media print { body { padding: 10mm; } @page { margin: 10mm; } }
  </style>
</head>
<body>
  ${contentHtml}
  <div class="footer">qitaat.com — ${new Date().toLocaleDateString(isRTL ? 'ar-SA' : 'en-US')}</div>
  <script>window.onload = () => { window.print(); }</script>
</body>
</html>`);
  win.document.close();
};

