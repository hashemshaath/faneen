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
    ? 'وجّه كاميرا هاتفك نحو الرمز لعرض المعلومات'
    : 'Point your phone camera at the code to view details';
  const brand = isRTL ? 'قِطاعات' : 'Qitaat';
  const tagline = isRTL ? 'منصة القطاعات الصناعية' : 'Industrial Sectors Platform';
  const kicker = isRTL ? 'موثّق رسميًا' : 'Officially Verified';

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
  *{box-sizing:border-box;margin:0;padding:0}
  html,body{background:linear-gradient(140deg,#eef2f7 0%,#e2e8f0 100%);font-family:-apple-system,BlinkMacSystemFont,"IBM Plex Sans Arabic","Segoe UI",sans-serif;color:#0f172a;-webkit-font-smoothing:antialiased}
  .wrap{padding:32px 20px;display:flex;justify-content:center;align-items:flex-start;min-height:100vh}
  .card{
    position:relative;width:380px;background:#fff;border-radius:24px;overflow:hidden;
    box-shadow:0 30px 60px -20px rgba(15,23,42,.25),0 8px 20px -8px rgba(15,23,42,.12);
  }
  .header{
    background:linear-gradient(135deg,#0f172a 0%,#1e293b 60%,#064e3b 100%);
    color:#fff;padding:22px 22px 24px;position:relative;overflow:hidden;
  }
  .header::before{
    content:"";position:absolute;inset:0;
    background-image:radial-gradient(circle at 1px 1px,rgba(255,255,255,.08) 1px,transparent 0);
    background-size:14px 14px;opacity:.5;pointer-events:none;
  }
  .brand-row{display:flex;align-items:center;gap:12px;position:relative}
  .logo{
    width:44px;height:44px;border-radius:12px;
    background:linear-gradient(135deg,#10b981,#059669);
    display:flex;align-items:center;justify-content:center;
    font-size:22px;font-weight:800;color:#fff;
    box-shadow:0 6px 16px rgba(16,185,129,.4);
  }
  .brand{font-size:18px;font-weight:800;letter-spacing:.02em;line-height:1}
  .tag{font-size:10px;color:#94a3b8;margin-top:4px;letter-spacing:.14em;text-transform:uppercase}
  .kicker{
    display:inline-block;margin-top:16px;padding:4px 10px;border-radius:999px;
    background:rgba(16,185,129,.16);border:1px solid rgba(16,185,129,.45);
    color:#6ee7b7;font-size:10px;font-weight:700;letter-spacing:.16em;text-transform:uppercase;position:relative;
  }
  .body{padding:22px;text-align:center}
  .ttl{font-size:11px;color:#64748b;margin-bottom:14px;text-transform:uppercase;letter-spacing:.18em;font-weight:700}
  .qr-frame{
    display:inline-block;padding:12px;background:#fff;border-radius:18px;
    border:1px solid #e2e8f0;box-shadow:inset 0 0 0 1px rgba(15,23,42,.02);
    position:relative;
  }
  .qr-frame::before,.qr-frame::after{
    content:"";position:absolute;width:16px;height:16px;border:2px solid #10b981;border-radius:4px;
  }
  .qr-frame::before{top:-4px;left:-4px;border-right:0;border-bottom:0}
  .qr-frame::after{bottom:-4px;right:-4px;border-left:0;border-top:0}
  .qr-frame img{width:220px;height:220px;display:block;border-radius:8px}
  .code{
    font-family:ui-monospace,SFMono-Regular,Menlo,monospace;
    font-size:18px;font-weight:800;letter-spacing:.1em;direction:ltr;
    margin-top:16px;padding:8px 14px;background:#f1f5f9;border-radius:10px;display:inline-block;
    color:#0f172a;
  }
  .type{display:inline-block;font-size:11px;padding:4px 12px;border:1px solid #e2e8f0;border-radius:999px;color:#475569;margin-top:10px;letter-spacing:.04em}
  .inst{font-size:12px;color:#475569;margin-top:14px;line-height:1.6;padding:0 8px}
  .footer{
    border-top:1px dashed #cbd5e1;margin-top:18px;padding-top:12px;
    display:flex;justify-content:space-between;align-items:center;font-size:10px;color:#94a3b8;
  }
  .footer b{color:#0f172a;font-weight:700}
  .url{font-size:9px;color:#94a3b8;margin-top:6px;direction:ltr;word-break:break-all;text-align:center}
  .actions{display:flex;justify-content:center;gap:8px;margin-top:18px}
  .btn{padding:10px 18px;border:1px solid #cbd5e1;border-radius:10px;background:#fff;font-size:13px;font-weight:600;cursor:pointer;color:#0f172a;box-shadow:0 2px 6px rgba(15,23,42,.05)}
  .btn.primary{background:#0f172a;color:#fff;border-color:#0f172a}
  .btn:hover{transform:translateY(-1px);box-shadow:0 6px 14px rgba(15,23,42,.12)}
  @media print {
    html,body{background:#fff}
    .wrap{padding:0;min-height:auto}
    .card{box-shadow:none;width:auto;max-width:380px;border:1px solid #e2e8f0}
    .actions{display:none}
    @page{size:auto;margin:10mm}
  }
</style>
</head>
<body>
  <div class="wrap">
    <div class="card" role="region" aria-label="${cardTitle}">
      <div class="header">
        <div class="brand-row">
          <div class="logo">${isRTL ? 'ق' : 'Q'}</div>
          <div>
            <div class="brand">${brand}</div>
            <div class="tag">${tagline}</div>
          </div>
        </div>
        <div class="kicker">${kicker}</div>
      </div>
      <div class="body">
        <div class="ttl">${cardTitle}</div>
        <div class="qr-frame"><img alt="QR ${safeCode}" src="${qrDataUrl}" /></div>
        <div><span class="code">${safeCode}</span></div>
        ${entityLabel ? `<div class="type">${entityLabel}</div>` : ''}
        <div class="inst">${instruction}</div>
        <div class="footer">
          <span>${isRTL ? 'صادر عن' : 'Issued by'} <b>${brand}</b></span>
          <span>qitaat.com</span>
        </div>
        <div class="url">${safeUrl}</div>
        <div class="actions">
          <button class="btn primary" onclick="window.print()">${isRTL ? 'طباعة' : 'Print'}</button>
          <button class="btn" onclick="window.close()">${isRTL ? 'إغلاق' : 'Close'}</button>
        </div>
      </div>
    </div>
  </div>
  <script>setTimeout(function(){window.focus();},300);</script>
</body>
</html>`);
  w.document.close();
}

/** Placeholder default export so the file can be imported as a component reference if needed. */
const BarcodePrintCard = () => null;
export default BarcodePrintCard;