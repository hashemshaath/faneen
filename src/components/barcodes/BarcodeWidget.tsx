import React, { useEffect, useRef, useState } from 'react';
import QRCode from 'qrcode';
import { Copy, Check, Download, Printer, QrCode as QrCodeIcon, Sticker, ShieldCheck } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { cn } from '@/lib/utils';
import { useBi } from '@/components/common/Bilingual';
import { useLanguage } from '@/i18n/LanguageContext';
import {
  buildBarcodeUrl,
  getBarcodeEntityLabel,
  normalizeBarcodeCode,
} from '@/lib/barcodes/barcode-url';
import { renderBarcodePrintCard } from './BarcodePrintCard';
import { renderBarcodeLargeSticker } from './BarcodeLargeSticker';

export interface BarcodeWidgetProps {
  barcodeCode: string;
  entityType?: string;
  title?: string;
  subtitle?: string;
  showQr?: boolean;
  copyable?: boolean;
  printable?: boolean;
  downloadable?: boolean;
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}

const QR_PX: Record<NonNullable<BarcodeWidgetProps['size']>, number> = {
  sm: 96,
  md: 144,
  lg: 200,
};

const BarcodeWidget: React.FC<BarcodeWidgetProps> = ({
  barcodeCode,
  entityType,
  title,
  subtitle,
  showQr = true,
  copyable = true,
  printable = true,
  downloadable = true,
  size = 'md',
  className,
}) => {
  const bi = useBi();
  const { isRTL } = useLanguage();
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [copied, setCopied] = useState(false);

  const code = normalizeBarcodeCode(barcodeCode);
  const url = buildBarcodeUrl(code);
  const px = QR_PX[size];
  const entityLabel = entityType ? getBarcodeEntityLabel(entityType, isRTL) : '';

  useEffect(() => {
    if (!showQr || !canvasRef.current || !code) return;
    QRCode.toCanvas(canvasRef.current, url, {
      width: px,
      margin: 1,
      errorCorrectionLevel: 'M',
      color: { dark: '#0f172a', light: '#ffffff' },
    }).catch(() => {
      // silent — QR is best-effort
    });
  }, [showQr, code, url, px]);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(code);
      setCopied(true);
      toast.success(bi('تم نسخ الكود', 'Code copied'));
      window.setTimeout(() => setCopied(false), 1500);
    } catch {
      toast.error(bi('تعذر النسخ', 'Copy failed'));
    }
  };

  const handleDownload = async () => {
    try {
      const dataUrl = await QRCode.toDataURL(url, {
        width: 512,
        margin: 2,
        errorCorrectionLevel: 'M',
        color: { dark: '#0f172a', light: '#ffffff' },
      });
      const a = document.createElement('a');
      a.href = dataUrl;
      a.download = `qitaat-barcode-${code}.png`;
      document.body.appendChild(a);
      a.click();
      a.remove();
    } catch {
      toast.error(bi('تعذر التنزيل', 'Download failed'));
    }
  };

  const handlePrint = async () => {
    try {
      const qrDataUrl = await QRCode.toDataURL(url, {
        width: 512,
        margin: 2,
        errorCorrectionLevel: 'M',
        color: { dark: '#0f172a', light: '#ffffff' },
      });
      renderBarcodePrintCard({
        barcodeCode: code,
        entityType,
        qrDataUrl,
        url,
        isRTL,
        title,
      });
    } catch {
      toast.error(bi('تعذر الطباعة', 'Print failed'));
    }
  };

  const handlePrintLarge = async () => {
    try {
      const qrDataUrl = await QRCode.toDataURL(url, {
        width: 1024,
        margin: 2,
        errorCorrectionLevel: 'H',
        color: { dark: '#0f172a', light: '#ffffff' },
      });
      renderBarcodeLargeSticker({
        barcodeCode: code,
        entityType,
        qrDataUrl,
        url,
        isRTL,
        title,
      });
    } catch {
      toast.error(bi('تعذر الطباعة', 'Print failed'));
    }
  };

  if (!code) return null;

  return (
    <Card
      className={cn(
        'relative overflow-hidden border-border/60 bg-gradient-to-br from-card via-card to-muted/30',
        'shadow-elev-2 hover:shadow-elev-3 transition-shadow',
        'p-5 flex flex-col sm:flex-row gap-5 items-stretch sm:items-center',
        size === 'sm' && 'p-4 gap-4',
        className,
      )}
    >
      {/* Decorative corner accent */}
      <div
        className="pointer-events-none absolute -top-16 -end-16 h-40 w-40 rounded-full bg-emerald-500/10 blur-2xl"
        aria-hidden="true"
      />
      {showQr && (
        <div className="relative shrink-0 self-center">
          <div className="rounded-2xl bg-white p-3 border border-border shadow-elev-1 ring-1 ring-emerald-500/10">
            <canvas
              ref={canvasRef}
              width={px}
              height={px}
              style={{ width: px, height: px, display: 'block' }}
              aria-label={bi(`رمز الاستجابة السريعة للكود ${code}`, `QR code for ${code}`)}
              role="img"
            />
          </div>
          {/* Corner brackets */}
          <span className="pointer-events-none absolute -top-1 -start-1 h-3 w-3 border-t-2 border-s-2 border-emerald-500 rounded-tl-sm" aria-hidden="true" />
          <span className="pointer-events-none absolute -top-1 -end-1 h-3 w-3 border-t-2 border-e-2 border-emerald-500 rounded-tr-sm" aria-hidden="true" />
          <span className="pointer-events-none absolute -bottom-1 -start-1 h-3 w-3 border-b-2 border-s-2 border-emerald-500 rounded-bl-sm" aria-hidden="true" />
          <span className="pointer-events-none absolute -bottom-1 -end-1 h-3 w-3 border-b-2 border-e-2 border-emerald-500 rounded-br-sm" aria-hidden="true" />
        </div>
      )}
      <div className="flex-1 min-w-0 space-y-2 relative">
        <div className="flex items-center gap-2 text-xs">
          <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 px-2.5 py-1 font-semibold tracking-wide">
            <ShieldCheck className="h-3.5 w-3.5" />
            {bi('موثّق', 'Verified')}
          </span>
          <span className="inline-flex items-center gap-1.5 text-muted-foreground">
            <QrCodeIcon className="h-3.5 w-3.5" />
            {title || bi('كود الباركود', 'Barcode')}
          </span>
          {entityLabel && (
            <span className="text-muted-foreground/70 hidden sm:inline">· {entityLabel}</span>
          )}
        </div>
        <div
          className="text-lg md:text-xl font-mono tech-content font-bold tracking-[0.15em] break-all text-foreground bg-muted/50 rounded-lg px-3 py-2 inline-block border border-border/50"
          dir="ltr"
        >
          {code}
        </div>
        {subtitle && (
          <div className="text-sm text-muted-foreground truncate font-medium">{subtitle}</div>
        )}
        <div className="flex flex-wrap gap-1.5 pt-1.5">
          {copyable && (
            <Button
              size="sm"
              variant="outline"
              onClick={handleCopy}
              aria-label={bi('نسخ الكود', 'Copy code')}
              className="h-9 rounded-lg"
            >
              {copied ? <Check className="h-3.5 w-3.5 me-1.5 text-emerald-500" /> : <Copy className="h-3.5 w-3.5 me-1.5" />}
              {copied ? bi('تم النسخ', 'Copied') : bi('نسخ', 'Copy')}
            </Button>
          )}
          {downloadable && showQr && (
            <Button
              size="sm"
              variant="outline"
              onClick={handleDownload}
              aria-label={bi('تنزيل صورة الكود', 'Download QR image')}
              className="h-9 rounded-lg"
            >
              <Download className="h-3.5 w-3.5 me-1.5" />
              {bi('تنزيل', 'Download')}
            </Button>
          )}
          {printable && (
            <Button
              size="sm"
              variant="outline"
              onClick={handlePrint}
              aria-label={bi('طباعة بطاقة الكود', 'Print barcode card')}
              className="h-9 rounded-lg"
            >
              <Printer className="h-3.5 w-3.5 me-1.5" />
              {bi('طباعة', 'Print')}
            </Button>
          )}
          {printable && (
            <Button
              size="sm"
              onClick={handlePrintLarge}
              aria-label={bi('طباعة ملصق 30×20 سم', 'Print 30x20 cm sticker')}
              className="h-9 rounded-lg bg-gradient-to-r from-emerald-600 to-emerald-700 hover:from-emerald-700 hover:to-emerald-800 text-white border-0 shadow-sm"
            >
              <Sticker className="h-3.5 w-3.5 me-1.5" />
              {bi('ملصق 30×20 سم', 'Sticker 30×20 cm')}
            </Button>
          )}
        </div>
      </div>
    </Card>
  );
};

export default BarcodeWidget;