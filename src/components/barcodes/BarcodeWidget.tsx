import React, { useEffect, useRef, useState } from 'react';
import QRCode from 'qrcode';
import { Copy, Check, Download, Printer, QrCode as QrCodeIcon, Sticker } from 'lucide-react';
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
    <Card className={cn('p-4 flex gap-4 items-center', size === 'sm' && 'p-3 gap-3', className)}>
      {showQr && (
        <div className="shrink-0 rounded-lg bg-white p-1.5 border" aria-hidden={false}>
          <canvas
            ref={canvasRef}
            width={px}
            height={px}
            style={{ width: px, height: px, display: 'block' }}
            aria-label={bi(`رمز الاستجابة السريعة للكود ${code}`, `QR code for ${code}`)}
            role="img"
          />
        </div>
      )}
      <div className="flex-1 min-w-0 space-y-1.5">
        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          <QrCodeIcon className="h-3.5 w-3.5" />
          <span>{title || bi('كود الباركود', 'Barcode')}</span>
          {entityLabel && <span aria-hidden="true">·</span>}
          {entityLabel && <span>{entityLabel}</span>}
        </div>
        <div
          className="text-base md:text-lg font-mono tech-content font-semibold tracking-wide break-all"
          dir="ltr"
        >
          {code}
        </div>
        {subtitle && <div className="text-xs text-muted-foreground truncate">{subtitle}</div>}
        <div className="flex flex-wrap gap-1.5 pt-1">
          {copyable && (
            <Button
              size="sm"
              variant="outline"
              onClick={handleCopy}
              aria-label={bi('نسخ الكود', 'Copy code')}
              className="h-8"
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
              className="h-8"
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
              className="h-8"
            >
              <Printer className="h-3.5 w-3.5 me-1.5" />
              {bi('طباعة', 'Print')}
            </Button>
          )}
          {printable && (
            <Button
              size="sm"
              variant="outline"
              onClick={handlePrintLarge}
              aria-label={bi('طباعة ملصق 30×20 سم', 'Print 30x20 cm sticker')}
              className="h-8"
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