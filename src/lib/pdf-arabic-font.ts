// Arabic font loader for jsPDF
// Caches the font in memory after first load

let cachedFont: string | null = null;
let fontLoadFailed = false;

// Multiple CDN sources for reliability
const FONT_URLS = [
  'https://cdn.jsdelivr.net/npm/@fontsource/noto-naskh-arabic@5.0.18/files/noto-naskh-arabic-arabic-400-normal.woff',
  'https://cdn.jsdelivr.net/npm/@fontsource/amiri@5.0.18/files/amiri-arabic-400-normal.woff',
];

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

  win.document.write(`<!DOCTYPE html>
<html dir="${isRTL ? 'rtl' : 'ltr'}" lang="${isRTL ? 'ar' : 'en'}">
<head>
  <meta charset="utf-8"/>
  <title>${title}</title>
  <style>
    @import url('https://fonts.googleapis.com/css2?family=Noto+Naskh+Arabic:wght@400;700&display=swap');
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body { font-family: 'Noto Naskh Arabic', 'Segoe UI', Tahoma, sans-serif; padding: 20mm; color: #1a1a1a; direction: ${isRTL ? 'rtl' : 'ltr'}; font-size: 11pt; line-height: 1.6; }
    h1 { font-size: 18pt; text-align: center; margin-bottom: 4mm; color: #181820; }
    h2 { font-size: 13pt; margin: 6mm 0 3mm; color: #181820; border-bottom: 2px solid #b48c3c; padding-bottom: 2mm; }
    table { width: 100%; border-collapse: collapse; margin: 3mm 0 6mm; }
    th, td { border: 1px solid #ddd; padding: 6px 10px; text-align: ${isRTL ? 'right' : 'left'}; font-size: 9pt; }
    th { background: #181820; color: #fff; font-weight: 700; }
    tr:nth-child(even) { background: #f8f8f8; }
    tfoot td { background: #fff8e6; font-weight: 700; }
    .info-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 2mm 8mm; margin: 3mm 0 6mm; }
    .info-item { display: flex; gap: 4mm; }
    .info-label { color: #888; min-width: 80px; font-weight: 700; }
    .highlight { background: #fff8e6; padding: 2px 6px; border-radius: 3px; font-weight: 700; }
    .footer { text-align: center; margin-top: 10mm; color: #aaa; font-size: 8pt; border-top: 1px solid #eee; padding-top: 3mm; }
    .signatures { display: flex; justify-content: space-between; margin-top: 15mm; }
    .sig-box { text-align: center; width: 40%; }
    .sig-line { border-bottom: 1px solid #b48c3c; margin-bottom: 3mm; height: 30mm; }
    @media print { body { padding: 10mm; } @page { margin: 10mm; } }
  </style>
</head>
<body>
  ${contentHtml}
  <div class="footer">faneen.com — ${new Date().toLocaleDateString(isRTL ? 'ar-SA' : 'en-US')}</div>
  <script>window.onload = () => { window.print(); }</script>
</body>
</html>`);
  win.document.close();
};

