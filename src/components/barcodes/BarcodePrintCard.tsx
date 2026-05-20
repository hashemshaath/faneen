import { getBarcodeEntityLabel } from '@/lib/barcodes/barcode-url';

export interface BarcodePrintCardOptions {
  barcodeCode: string;
  entityType?: string;
  qrDataUrl: string;
  url: string;
  isRTL: boolean;
  title?: string;
}

/**
 * Opens a print-only window with a single sticker-sized card.
 * Pure UI — never embeds PII, tokens, or addresses.
 */
export function renderBarcodePrintCard(opts: BarcodePrintCardOptions): void {
  const { barcodeCode, entityType, qrDataUrl, url, isRTL, title } = opts;
  const entityLabel = entityType ? getBarcodeEntityLabel(entityType, isRTL) : '';
  const cardTitle = title || (isRTL ? 'كود قِطاعات' : 'Qitaat Code');
  const instruction = isRTL
    ? 'امسح الكود لعرض المعلومات المتاحة'
    : 'Scan to view available information';
  const brand = isRTL ? 'قِطاعات' : 'Qitaat';

  const w = window.open('', '_blank', 'width=420,height=560');
  if (!w) return;

  const safeCode = String(barcodeCode).replace(/[<>&"']/g, '');
  const safeUrl = String(url).replace(/[<>"']/g, '');
  const dir = isRTL ? 'rtl' : 'ltr';

  w.document.write(`<!doctype html>
<html lang="${isRTL ? 'ar' : 'en'}" dir="${dir}">
<head>
<meta charset="utf-8" />
<meta name="robots" content="noindex,nofollow" />
<title>${cardTitle} — ${safeCode}</title>
<style>
  *{box-sizing:border-box}
  html,body{margin:0;padding:0;background:#f5f5f5;font-family:-apple-system,BlinkMacSystemFont,"IBM Plex Sans Arabic","Segoe UI",sans-serif;color:#0f172a}
  .wrap{padding:24px;display:flex;justify-content:center;align-items:flex-start;min-height:100vh}
  .card{background:#fff;border:1px solid #e2e8f0;border-radius:16px;padding:20px;width:360px;text-align:center;box-shadow:0 4px 14px rgba(0,0,0,.06)}
  .brand{font-size:14px;font-weight:700;letter-spacing:.04em;color:#0f172a;margin-bottom:4px}
  .ttl{font-size:12px;color:#64748b;margin-bottom:14px;text-transform:uppercase;letter-spacing:.08em}
  .qr{display:flex;justify-content:center;margin:6px 0 14px}
  .qr img{width:220px;height:220px;display:block;border-radius:8px}
  .code{font-family:ui-monospace,SFMono-Regular,Menlo,monospace;font-size:18px;font-weight:700;letter-spacing:.06em;direction:ltr;margin-bottom:8px;word-break:break-all}
  .type{display:inline-block;font-size:11px;padding:3px 10px;border:1px solid #e2e8f0;border-radius:999px;color:#475569;margin-bottom:10px}
  .inst{font-size:12px;color:#475569;margin-top:8px;line-height:1.5}
  .url{font-size:10px;color:#94a3b8;margin-top:8px;direction:ltr;word-break:break-all}
  .actions{display:flex;justify-content:center;gap:8px;margin-top:16px}
  .btn{padding:8px 14px;border:1px solid #cbd5e1;border-radius:8px;background:#fff;font-size:12px;cursor:pointer;color:#0f172a}
  .btn:hover{background:#f1f5f9}
  @media print {
    body{background:#fff}
    .wrap{padding:0;min-height:auto}
    .card{border:none;box-shadow:none;width:auto;max-width:380px}
    .actions{display:none}
    @page{size:auto;margin:10mm}
  }
</style>
</head>
<body>
  <div class="wrap">
    <div class="card" role="region" aria-label="${cardTitle}">
      <div class="brand">${brand}</div>
      <div class="ttl">${cardTitle}</div>
      <div class="qr"><img alt="QR ${safeCode}" src="${qrDataUrl}" /></div>
      <div class="code">${safeCode}</div>
      ${entityLabel ? `<div class="type">${entityLabel}</div>` : ''}
      <div class="inst">${instruction}</div>
      <div class="url">${safeUrl}</div>
      <div class="actions">
        <button class="btn" onclick="window.print()">${isRTL ? 'طباعة' : 'Print'}</button>
        <button class="btn" onclick="window.close()">${isRTL ? 'إغلاق' : 'Close'}</button>
      </div>
    </div>
  </div>
  <script>setTimeout(function(){window.focus();window.print();},300);</script>
</body>
</html>`);
  w.document.close();
}

/** Placeholder default export so the file can be imported as a component reference if needed. */
const BarcodePrintCard = () => null;
export default BarcodePrintCard;