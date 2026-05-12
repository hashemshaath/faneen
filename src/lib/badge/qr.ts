import QRCode from 'qrcode';

/** Generate a QR code as inline SVG string for the given URL. */
export async function generateQrSvg(text: string, size = 200): Promise<string> {
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
