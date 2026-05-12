// Arabic font loader for jsPDF
// Caches the font in memory after first load

let cachedFont: string | null = null;
let fontLoadFailed = false;

// PDF-AR1: jsPDF requires uncompressed TrueType (TTF) bytes. Previously we
// fetched .woff (compressed Web Open Font Format) and registered it as a
// .ttf — jsPDF then read the compressed table data as raw TrueType, which
// produced a broken cmap and rendered Arabic text as `þòþäþ³` mojibake when
// copied or searched from the resulting PDF. Switching to genuine TTF
// payloads restores a valid cmap and ToUnicode mapping, so Arabic becomes
// both visually correct AND copyable / searchable.
const FONT_URLS = [
  // Noto Naskh Arabic — Google Fonts canonical, widely used for documents.
  'https://cdn.jsdelivr.net/gh/google/fonts/ofl/notonaskharabic/NotoNaskhArabic%5Bwght%5D.ttf',
  // Noto Sans Arabic static — reliable static TTF backup.
  'https://cdn.jsdelivr.net/gh/notofonts/notofonts.github.io/fonts/NotoSansArabic/hinted/ttf/NotoSansArabic-Regular.ttf',
  // Amiri — third fallback (classical Naskh, also TTF).
  'https://cdn.jsdelivr.net/gh/aliftype/amiri/fonts/ttf/Amiri-Regular.ttf',
];

// Validate the first bytes of the response are a real TrueType / OpenType
// signature. This guards against accidental WOFF/HTML/error pages being
// registered as fonts (which is exactly what produced the original
// mojibake bug).
const isTrueTypeSignature = (bytes: Uint8Array): boolean => {
  if (bytes.length < 4) return false;
  const b0 = bytes[0], b1 = bytes[1], b2 = bytes[2], b3 = bytes[3];
  // 0x00010000 = TrueType, 'OTTO' = OpenType-CFF, 'true'/'typ1' = legacy TTF
  if (b0 === 0x00 && b1 === 0x01 && b2 === 0x00 && b3 === 0x00) return true;
  if (b0 === 0x4F && b1 === 0x54 && b2 === 0x54 && b3 === 0x4F) return true; // OTTO
  if (b0 === 0x74 && b1 === 0x72 && b2 === 0x75 && b3 === 0x65) return true; // 'true'
  if (b0 === 0x74 && b1 === 0x79 && b2 === 0x70 && b3 === 0x31) return true; // 'typ1'
  return false;
};

export const registerArabicFont = async (doc: any): Promise<boolean> => {
  if (fontLoadFailed) return false;
  if (cachedFont) {
    try {
      doc.addFileToVFS('ArabicFont.ttf', cachedFont);
      doc.addFont('ArabicFont.ttf', 'ArabicFont', 'normal');
      return true;
    } catch {
      return false;
    }
  }

  for (const url of FONT_URLS) {
    try {
      const response = await fetch(url);
      if (!response.ok) continue;
      const buffer = await response.arrayBuffer();
      const bytes = new Uint8Array(buffer);
      // Reject anything that isn't a real TTF/OTF — prevents the
      // historical WOFF-as-TTF mojibake regression.
      if (!isTrueTypeSignature(bytes)) continue;
      let binary = '';
      for (let i = 0; i < bytes.length; i++) {
        binary += String.fromCharCode(bytes[i]);
      }
      const base64 = btoa(binary);
      doc.addFileToVFS('ArabicFont.ttf', base64);
      doc.addFont('ArabicFont.ttf', 'ArabicFont', 'normal');
      cachedFont = base64;
      return true;
    } catch {
      continue;
    }
  }

  fontLoadFailed = true;
  return false;
};

export const setupArabicDoc = async (doc: any, isRTL: boolean) => {
  const loaded = await registerArabicFont(doc);
  if (loaded && isRTL) {
    doc.setFont('ArabicFont');
  }
  return loaded;
};

export const getArabicTableStyles = (isRTL: boolean, fontLoaded: boolean) => ({
  ...(isRTL && fontLoaded ? { font: 'ArabicFont' } : {}),
  halign: isRTL ? 'right' as const : 'left' as const,
});

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

