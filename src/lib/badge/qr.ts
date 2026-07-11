/**
 * QR helpers — `qrcode` is loaded on demand so it stays out of the main
 * bundle. Both callers here are already `async`, so dynamic import adds no
 * observable latency beyond the first chunk fetch.
 */

async function loadQr() {
  const mod = await import('qrcode');
  return mod.default;
}

/** Generate a QR code as inline SVG string for the given URL. */
export async function generateQrSvg(text: string, size = 200): Promise<string> {
  const QRCode = await loadQr();
  return QRCode.toString(text, {
    type: 'svg',
    margin: 1,
    width: size,
    color: { dark: '#0f172a', light: '#ffffff' },
    errorCorrectionLevel: 'M',
  });
}

/** Trigger a PNG download of the QR for printing on flyers / cards. */
export async function downloadQrPng(text: string, filename: string, size = 512): Promise<void> {
  const QRCode = await loadQr();
  const dataUrl = await QRCode.toDataURL(text, {
    width: size,
    margin: 2,
    color: { dark: '#0f172a', light: '#ffffff' },
    errorCorrectionLevel: 'M',
  });
  const a = document.createElement('a');
  a.href = dataUrl;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
}
