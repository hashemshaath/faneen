// Arabic font loader for jsPDF
// Caches the font in memory after first load

// PDF-AR2: Bundle Arabic TTF files locally and register versioned VFS names.
// The failed real exports showed only Helvetica in `pdffonts`, so the Arabic
// loader had failed and the official export silently fell back to WinAnsi.
import notoNaskhRegularUrl from '@/assets/fonts/NotoNaskhArabic-Regular.ttf?url';
import notoNaskhBoldUrl from '@/assets/fonts/NotoNaskhArabic-Bold.ttf?url';

const ARABIC_FONT_CACHE_VERSION = import.meta.env.VITE_APP_VERSION || 'pdf-ar2-v1';
const ARABIC_FONT_FILE = `ArabicFont-Regular-${ARABIC_FONT_CACHE_VERSION}.ttf`;
const ARABIC_FONT_FILE_BOLD = `ArabicFont-Bold-${ARABIC_FONT_CACHE_VERSION}.ttf`;
const ARABIC_FONT_NAME = 'ArabicFont';
const ARABIC_FONT_STYLES = ['normal', 'bold', 'italic', 'bolditalic'] as const;

type FontSource = 'bundled' | 'memory-cache' | 'unloaded' | 'failed';

export interface ArabicFontDiagnostics {
  selectedFontUrl: string;
  contentType: string;
  magicBytes: string;
  isTrueType: boolean;
  registeredFontName: string;
  registeredStyles: string[];
  fontSource: FontSource;
  loadedAt: string | null;
  normalizationRan: boolean;
  lastGeneratedPdfAt: string | null;
  sameLoaderForPreviewAndDownload: boolean;
  fallbackFontUsed: boolean;
  error?: string;
}

let cachedFont: string | null = null;
let cachedFontBold: string | null = null;
let lastDiagnostics: ArabicFontDiagnostics = {
  selectedFontUrl: withFontVersion(notoNaskhRegularUrl),
  contentType: 'pending',
  magicBytes: 'pending',
  isTrueType: false,
  registeredFontName: ARABIC_FONT_NAME,
  registeredStyles: [],
  fontSource: 'unloaded',
  loadedAt: null,
  normalizationRan: false,
  lastGeneratedPdfAt: null,
  sameLoaderForPreviewAndDownload: true,
  fallbackFontUsed: false,
};

function withFontVersion(url: string): string {
  const separator = url.includes('?') ? '&' : '?';
  return `${url}${separator}v=${encodeURIComponent(ARABIC_FONT_CACHE_VERSION)}`;
}

const bytesToMagic = (bytes: Uint8Array): string =>
  Array.from(bytes.slice(0, 4)).map((b) => b.toString(16).padStart(2, '0')).join(' ');

// Validate the first bytes of the response are a real TrueType / OpenType
// signature. This guards against accidental WOFF/HTML/error pages being
// registered as fonts.
export const isTrueTypeSignature = (bytes: Uint8Array): boolean => {
  if (bytes.length < 4) return false;
  const b0 = bytes[0], b1 = bytes[1], b2 = bytes[2], b3 = bytes[3];
  if (b0 === 0x00 && b1 === 0x01 && b2 === 0x00 && b3 === 0x00) return true;
  if (b0 === 0x4F && b1 === 0x54 && b2 === 0x54 && b3 === 0x4F) return true; // OTTO
  if (b0 === 0x74 && b1 === 0x72 && b2 === 0x75 && b3 === 0x65) return true; // true
  if (b0 === 0x74 && b1 === 0x79 && b2 === 0x70 && b3 === 0x31) return true; // typ1
  return false;
};

const shouldDebugArabicPdf = (): boolean => {
  if (!import.meta.env.DEV && import.meta.env.VITE_ENABLE_PDF_DEBUG !== 'true') return false;
  try {
    return import.meta.env.VITE_ENABLE_PDF_DEBUG === 'true' || window.localStorage.getItem('qitaat_pdf_arabic_debug') === '1';
  } catch {
    return import.meta.env.VITE_ENABLE_PDF_DEBUG === 'true';
  }
};

const debugArabicFont = (details: Record<string, unknown>) => {
  if (!shouldDebugArabicPdf()) return;
  console.debug('[PDF-AR2] Arabic font verification', details);
};

const markGenerated = () => {
  lastDiagnostics = { ...lastDiagnostics, lastGeneratedPdfAt: new Date().toISOString() };
};

export const getArabicFontDiagnostics = (): ArabicFontDiagnostics => ({ ...lastDiagnostics });

export class ArabicPdfFontError extends Error {
  constructor(message = 'PDF_ARABIC_FONT_UNAVAILABLE') {
    super(message);
    this.name = 'ArabicPdfFontError';
  }
}

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

const fetchAsBase64 = async (rawUrl: string): Promise<{ base64: string; contentType: string; magicBytes: string; url: string } | null> => {
  const url = withFontVersion(rawUrl);
  try {
    const response = await fetch(url, { cache: 'force-cache' });
    if (!response.ok) {
      lastDiagnostics = { ...lastDiagnostics, selectedFontUrl: url, fontSource: 'failed', fallbackFontUsed: true, error: `HTTP ${response.status}` };
      return null;
    }
    const contentType = response.headers.get('content-type') ?? 'unknown';
    const buffer = await response.arrayBuffer();
    const bytes = new Uint8Array(buffer);
    const magicBytes = bytesToMagic(bytes);
    const isTrueType = isTrueTypeSignature(bytes);
    lastDiagnostics = { ...lastDiagnostics, selectedFontUrl: url, contentType, magicBytes, isTrueType };
    if (!isTrueType) return null;

    let binary = '';
    for (let i = 0; i < bytes.length; i += 1) binary += String.fromCharCode(bytes[i]);
    return { base64: btoa(binary), contentType, magicBytes, url };
  } catch (err) {
    const error = err instanceof Error ? err.message : String(err);
    lastDiagnostics = { ...lastDiagnostics, selectedFontUrl: url, fontSource: 'failed', fallbackFontUsed: true, error };
    return null;
  }
};

export const registerArabicFont = async (doc: { addFileToVFS: (file: string, data: string) => void; addFont: (file: string, name: string, style: string) => void; getFontList?: () => Record<string, string[]> }): Promise<boolean> => {
  if (cachedFont) {
    try {
      registerArabicFontBytes(doc, cachedFont, cachedFontBold);
      lastDiagnostics = {
        ...lastDiagnostics,
        fontSource: 'memory-cache',
        registeredFontName: ARABIC_FONT_NAME,
        registeredStyles: [...ARABIC_FONT_STYLES],
        fallbackFontUsed: false,
      };
      debugArabicFont(lastDiagnostics);
      return true;
    } catch (err) {
      lastDiagnostics = { ...lastDiagnostics, fontSource: 'failed', fallbackFontUsed: true, error: err instanceof Error ? err.message : String(err) };
      return false;
    }
  }

  const regular = await fetchAsBase64(notoNaskhRegularUrl);
  if (!regular) return false;
  const bold = await fetchAsBase64(notoNaskhBoldUrl);
  cachedFont = regular.base64;
  cachedFontBold = bold?.base64 ?? null;
  try {
    registerArabicFontBytes(doc, regular.base64, cachedFontBold);
    lastDiagnostics = {
      ...lastDiagnostics,
      selectedFontUrl: regular.url,
      contentType: regular.contentType,
      magicBytes: regular.magicBytes,
      isTrueType: true,
      registeredFontName: ARABIC_FONT_NAME,
      registeredStyles: [...ARABIC_FONT_STYLES],
      fontSource: 'bundled',
      loadedAt: new Date().toISOString(),
      fallbackFontUsed: false,
    };
    debugArabicFont({ ...lastDiagnostics, fontList: doc.getFontList?.()[ARABIC_FONT_NAME] });
    return true;
  } catch (err) {
    lastDiagnostics = { ...lastDiagnostics, fontSource: 'failed', fallbackFontUsed: true, error: err instanceof Error ? err.message : String(err) };
    return false;
  }
};

export const hasRegisteredArabicFont = (doc: { getFontList?: () => Record<string, string[]> }): boolean => {
  const styles = doc.getFontList?.()[ARABIC_FONT_NAME] ?? [];
  return styles.includes('normal') && styles.includes('bold');
};

export const verifyArabicFontReady = (doc: { getFontList?: () => Record<string, string[]> }, isRTL: boolean): boolean => {
  if (!isRTL) return true;
  const ready = lastDiagnostics.isTrueType && hasRegisteredArabicFont(doc) && !lastDiagnostics.fallbackFontUsed;
  if (!ready) {
    lastDiagnostics = { ...lastDiagnostics, fallbackFontUsed: true };
  }
  return ready;
};

export const setupArabicDoc = async (doc: { setFont: (fontName: string, fontStyle?: string) => void; addFileToVFS: (file: string, data: string) => void; addFont: (file: string, name: string, style: string) => void; getFontList?: () => Record<string, string[]> }, isRTL: boolean) => {
  const loaded = await registerArabicFont(doc);
  if (loaded && isRTL) doc.setFont(ARABIC_FONT_NAME, 'normal');
  if (loaded) markGenerated();
  return loaded;
};

export const getArabicTableStyles = (isRTL: boolean, fontLoaded: boolean) => ({
  ...(isRTL && fontLoaded ? { font: ARABIC_FONT_NAME } : {}),
  halign: isRTL ? 'right' as const : 'left' as const,
  valign: 'middle' as const,
  overflow: 'linebreak' as const,
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
  lastDiagnostics = { ...lastDiagnostics, normalizationRan: true };
};

// ── Print helper: renders content in a print-friendly popup ──
export const printContractSection = (title: string, contentHtml: string, isRTL: boolean) => {
  const win = window.open('', '_blank', 'width=900,height=700');
  if (!win) return;

  const C = {
    header:  '#131722',
    accent:  '#0E9E6F',
    text:    '#1A2230',
    muted:   '#6B7689',
    border:  '#E2E6EE',
    surface2:'#F2F4F8',
    accentSoft: '#E6F7F0',
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
