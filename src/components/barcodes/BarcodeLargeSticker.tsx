import { getBarcodeEntityLabel } from '@/lib/barcodes/barcode-url';

export interface BarcodeLargeStickerOptions {
  barcodeCode: string;
  entityType?: string;
  qrDataUrl: string;
  url: string;
  isRTL: boolean;
  title?: string;
}

/**
 * Opens a print-only window with a large 30cm x 20cm sticker design,
 * intended to be printed and placed at the physical site location.
 * Pure presentation — no PII, no tokens, no addresses.
 */
export function renderBarcodeLargeSticker(opts: BarcodeLargeStickerOptions): void {
  const { barcodeCode, entityType, qrDataUrl, url, isRTL, title } = opts;
  const entityLabel = entityType ? getBarcodeEntityLabel(entityType, isRTL) : '';
  const cardTitle = title || (isRTL ? 'امسح للوصول' : 'Scan to Access');
  const brand = isRTL ? 'قِطاعات' : 'Qitaat';
  const tagline = isRTL ? 'منصة القطاعات الصناعية' : 'Industrial Sectors Platform';

  const steps = isRTL
    ? [
        { n: '1', t: 'افتح كاميرا الهاتف', d: 'وجّه الكاميرا نحو الكود' },
        { n: '2', t: 'امسح الرمز', d: 'انتظر ظهور الرابط' },
        { n: '3', t: 'اعرض المعلومات', d: 'اطّلع على بيانات الموقع' },
      ]
    : [
        { n: '1', t: 'Open phone camera', d: 'Point at the QR code' },
        { n: '2', t: 'Scan the code', d: 'Wait for the link to appear' },
        { n: '3', t: 'View information', d: 'Access site details' },
      ];

  const w = window.open('', '_blank', 'width=900,height=640');
  if (!w) return;

  const safeCode = String(barcodeCode).replace(/[<>&"']/g, '');
  const safeUrl = String(url).replace(/[<>"']/g, '');
  const dir = isRTL ? 'rtl' : 'ltr';

  const stepsHtml = steps
    .map(
      (s) => `
      <div class="step">
        <div class="step-num">${s.n}</div>
        <div class="step-body">
          <div class="step-title">${s.t}</div>
          <div class="step-desc">${s.d}</div>
        </div>
      </div>`,
    )
    .join('');

  w.document.write(`<!doctype html>
<html lang="${isRTL ? 'ar' : 'en'}" dir="${dir}">
<head>
<meta charset="utf-8" />
<meta name="robots" content="noindex,nofollow" />
<title>${brand} — ${safeCode}</title>
<style>
  *{box-sizing:border-box;margin:0;padding:0}
  html,body{background:#e2e8f0;font-family:-apple-system,BlinkMacSystemFont,"IBM Plex Sans Arabic","Segoe UI",Tahoma,sans-serif;color:#0f172a}
  .page{padding:24px;display:flex;justify-content:center;align-items:flex-start;min-height:100vh}

  /* 30cm x 20cm sticker (landscape) */
  .sticker{
    width:300mm;height:200mm;background:#ffffff;position:relative;overflow:hidden;
    border-radius:14mm;box-shadow:0 12px 40px rgba(15,23,42,.18);
    display:grid;grid-template-columns:1.05fr 1fr;
  }

  /* Left: brand panel */
  .brand-panel{
    background:linear-gradient(135deg,#0f172a 0%,#1e293b 55%,#0b3b2e 100%);
    color:#fff;padding:18mm 16mm;display:flex;flex-direction:column;justify-content:space-between;position:relative;
  }
  .brand-panel::before{
    content:"";position:absolute;inset:0;
    background-image:radial-gradient(circle at 1px 1px, rgba(255,255,255,.07) 1px, transparent 0);
    background-size:6mm 6mm;opacity:.5;pointer-events:none;
  }
  .brand-panel::after{
    content:"";position:absolute;top:-30mm;${isRTL ? 'left' : 'right'}:-30mm;width:90mm;height:90mm;border-radius:50%;
    background:radial-gradient(circle,rgba(16,185,129,.18) 0%,transparent 70%);pointer-events:none;
  }
  .brand-row{display:flex;align-items:center;gap:10mm;position:relative}
  .logo-mark{
    width:22mm;height:22mm;border-radius:6mm;
    background:linear-gradient(135deg,#10b981,#059669);
    display:flex;align-items:center;justify-content:center;
    font-size:14mm;font-weight:800;color:#fff;box-shadow:0 4mm 10mm rgba(16,185,129,.35);
    position:relative;
  }
  .logo-mark::after{
    content:"";position:absolute;inset:-2mm;border:0.6mm solid rgba(16,185,129,.4);border-radius:8mm;
  }
  .brand-text .name{font-size:11mm;font-weight:800;letter-spacing:.02em;line-height:1}
  .brand-text .tag{font-size:4.2mm;color:#94a3b8;margin-top:2mm;letter-spacing:.06em;text-transform:uppercase}

  .headline{position:relative;margin-top:8mm}
  .headline .kicker{font-size:4mm;color:#34d399;letter-spacing:.18em;text-transform:uppercase;margin-bottom:4mm}
  .headline .title{font-size:18mm;font-weight:800;line-height:1.05;letter-spacing:-.01em}
  .headline .sub{font-size:5mm;color:#cbd5e1;margin-top:5mm;line-height:1.5;max-width:120mm}

  .steps{position:relative;display:flex;flex-direction:column;gap:5mm;margin-top:8mm}
  .step{display:flex;align-items:flex-start;gap:5mm}
  .step-num{
    flex-shrink:0;width:11mm;height:11mm;border-radius:50%;
    background:rgba(16,185,129,.15);border:1px solid rgba(16,185,129,.5);
    color:#34d399;font-weight:800;font-size:5.5mm;
    display:flex;align-items:center;justify-content:center;
  }
  .step-title{font-size:5mm;font-weight:700;color:#fff;line-height:1.2}
  .step-desc{font-size:3.8mm;color:#94a3b8;margin-top:1mm}

  .footer-band{
    position:relative;display:flex;justify-content:space-between;align-items:center;
    padding-top:6mm;border-top:1px solid rgba(255,255,255,.12);font-size:3.5mm;color:#94a3b8;
  }
  .footer-band b{color:#fff;font-weight:600}

  /* Right: QR panel */
  .qr-panel{
    padding:18mm 16mm;display:flex;flex-direction:column;align-items:center;justify-content:center;
    background:#f8fafc;position:relative;
  }
  .qr-panel::before{
    content:"";position:absolute;inset:0;
    background-image:linear-gradient(45deg,transparent 49%,rgba(15,23,42,.025) 50%,transparent 51%);
    background-size:8mm 8mm;pointer-events:none;
  }
  .qr-panel::after{
    content:"";position:absolute;inset:6mm;border:1.5mm dashed #cbd5e1;border-radius:10mm;pointer-events:none;opacity:.5;
  }
  .qr-card{
    background:#fff;border-radius:8mm;padding:10mm;box-shadow:0 6mm 18mm rgba(15,23,42,.08);
    display:flex;flex-direction:column;align-items:center;gap:6mm;position:relative;z-index:1;
    border:0.5mm solid #e2e8f0;
  }
  .qr-card::before,.qr-card::after{
    content:"";position:absolute;width:8mm;height:8mm;border:1.2mm solid #10b981;border-radius:2mm;
  }
  .qr-card::before{top:-2mm;${isRTL ? 'right' : 'left'}:-2mm;border-right:${isRTL ? '1.2mm solid #10b981' : '0'};border-bottom:0;${!isRTL ? 'border-right:0' : ''}}
  .qr-card::after{bottom:-2mm;${isRTL ? 'left' : 'right'}:-2mm;border-left:${isRTL ? '1.2mm solid #10b981' : '0'};border-top:0;${!isRTL ? 'border-left:0' : ''}}
  .seal{
    position:absolute;top:-6mm;${isRTL ? 'left' : 'right'}:-6mm;width:24mm;height:24mm;
    background:linear-gradient(135deg,#10b981,#059669);color:#fff;border-radius:50%;
    display:flex;flex-direction:column;align-items:center;justify-content:center;
    box-shadow:0 4mm 10mm rgba(16,185,129,.4);transform:rotate(${isRTL ? '-' : ''}12deg);
    border:1mm solid #fff;z-index:3;
  }
  .seal .seal-mark{font-size:8mm;font-weight:800;line-height:1}
  .seal .seal-text{font-size:2.4mm;letter-spacing:.1em;text-transform:uppercase;margin-top:0.5mm}
  }
  .qr-label{
    font-size:4mm;letter-spacing:.2em;text-transform:uppercase;color:#10b981;font-weight:700;
  }
  .qr-img{width:110mm;height:110mm;display:block;border-radius:4mm;background:#fff}
  .code-pill{
    font-family:ui-monospace,SFMono-Regular,Menlo,monospace;
    font-size:7.5mm;font-weight:800;letter-spacing:.08em;color:#0f172a;
    background:#f1f5f9;border:1px solid #e2e8f0;border-radius:4mm;padding:3mm 8mm;direction:ltr;
  }
  .type-pill{
    font-size:3.8mm;color:#475569;background:#fff;border:1px solid #e2e8f0;
    border-radius:999px;padding:2mm 6mm;letter-spacing:.04em;
  }
  .url-line{
    font-size:3.2mm;color:#94a3b8;direction:ltr;text-align:center;word-break:break-all;max-width:100mm;
  }

  /* Corner crops */
  .corner{position:absolute;width:6mm;height:6mm;border-color:#cbd5e1;border-style:solid;border-width:0;z-index:5}
  .corner.tl{top:4mm;left:4mm;border-top-width:1px;border-left-width:1px}
  .corner.tr{top:4mm;right:4mm;border-top-width:1px;border-right-width:1px}
  .corner.bl{bottom:4mm;left:4mm;border-bottom-width:1px;border-left-width:1px}
  .corner.br{bottom:4mm;right:4mm;border-bottom-width:1px;border-right-width:1px}

  .actions{
    position:fixed;bottom:16px;${isRTL ? 'left' : 'right'}:16px;display:flex;gap:8px;z-index:10;
  }
  .btn{
    padding:10px 18px;border-radius:10px;border:1px solid #cbd5e1;background:#fff;
    font-size:13px;font-weight:600;cursor:pointer;color:#0f172a;box-shadow:0 4px 12px rgba(0,0,0,.08);
  }
  .btn.primary{background:#0f172a;color:#fff;border-color:#0f172a}
  .btn:hover{transform:translateY(-1px)}

  @media print {
    html,body{background:#fff}
    .page{padding:0;min-height:auto}
    .sticker{box-shadow:none;border-radius:0}
    .actions{display:none}
    @page{size:300mm 200mm;margin:0}
  }
</style>
</head>
<body>
  <div class="page">
    <div class="sticker" role="region" aria-label="${brand} ${safeCode}">
      <span class="corner tl"></span><span class="corner tr"></span>
      <span class="corner bl"></span><span class="corner br"></span>

      <div class="brand-panel">
        <div>
          <div class="brand-row">
            <div class="logo-mark">${isRTL ? 'ق' : 'Q'}</div>
            <div class="brand-text">
              <div class="name">${brand}</div>
              <div class="tag">${tagline}</div>
            </div>
          </div>

          <div class="headline">
            <div class="kicker">${isRTL ? 'موقع موثّق' : 'Verified Location'}</div>
            <div class="title">${cardTitle}</div>
            <div class="sub">${isRTL
              ? 'امسح رمز QR للاطلاع على معلومات الموقع، حالة المشروع، وتفاصيل الخدمة المعتمدة.'
              : 'Scan the QR code to view site information, project status, and approved service details.'}</div>
          </div>

          <div class="steps">${stepsHtml}</div>
        </div>

        <div class="footer-band">
          <div>${isRTL ? 'تم الإصدار بواسطة' : 'Issued by'} <b>${brand}</b></div>
          <div>qitaat.com</div>
        </div>
      </div>

      <div class="qr-panel">
        <div class="qr-card">
          <div class="seal" aria-hidden="true">
            <div class="seal-mark">✓</div>
            <div class="seal-text">${isRTL ? 'موثّق' : 'Verified'}</div>
          </div>
          <div class="qr-label">${isRTL ? 'امسح الكود' : 'Scan Code'}</div>
          <img class="qr-img" alt="QR ${safeCode}" src="${qrDataUrl}" />
          <div class="code-pill">${safeCode}</div>
          ${entityLabel ? `<div class="type-pill">${entityLabel}</div>` : ''}
          <div class="url-line">${safeUrl}</div>
        </div>
      </div>
    </div>
  </div>

  <div class="actions">
    <button class="btn" onclick="window.close()">${isRTL ? 'إغلاق' : 'Close'}</button>
    <button class="btn primary" onclick="window.print()">${isRTL ? 'طباعة 30×20 سم' : 'Print 30×20 cm'}</button>
  </div>

  <script>setTimeout(function(){window.focus();},200);</script>
</body>
</html>`);
  w.document.close();
}

const BarcodeLargeSticker = () => null;
export default BarcodeLargeSticker;