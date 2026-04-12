// Arabic font loader for jsPDF - uses Amiri font from Google Fonts CDN
// Caches the font in memory after first load

let cachedFont: string | null = null;

const AMIRI_URL = 'https://cdn.jsdelivr.net/gh/alrra/amiri-font@master/Amiri-Regular.ttf';

export const loadArabicFont = async (): Promise<string> => {
  if (cachedFont) return cachedFont;

  const response = await fetch(AMIRI_URL);
  const buffer = await response.arrayBuffer();

  // Convert to base64
  const bytes = new Uint8Array(buffer);
  let binary = '';
  for (let i = 0; i < bytes.length; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  cachedFont = btoa(binary);
  return cachedFont;
};

export const registerArabicFont = async (doc: any) => {
  const fontBase64 = await loadArabicFont();
  doc.addFileToVFS('Amiri-Regular.ttf', fontBase64);
  doc.addFont('Amiri-Regular.ttf', 'Amiri', 'normal');
};

export const applyArabicFont = (doc: any, isRTL: boolean) => {
  if (isRTL) {
    doc.setFont('Amiri');
  }
};

// Reverse Arabic text for jsPDF (jsPDF doesn't handle RTL shaping)
// This is needed because jsPDF renders text LTR by default
export const reshapeArabic = (text: string, isRTL: boolean): string => {
  if (!isRTL) return text;
  // jsPDF with custom fonts renders Arabic glyphs but doesn't reverse
  // We need to return the text as-is since the font handles joining
  return text;
};
