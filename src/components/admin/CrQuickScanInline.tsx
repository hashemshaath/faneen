import React, { useCallback, useRef, useState } from 'react';
import jsQR from 'jsqr';
import { ScanLine, Loader2, CheckCircle2, AlertCircle, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useLanguage } from '@/i18n/LanguageContext';
import { parseCrPayload, type CrScanResult } from '@/components/admin/CrDocumentScanner';
import { toast } from 'sonner';

const ACCEPTED = ['application/pdf', 'image/png', 'image/jpeg', 'image/webp'];

async function fileToImageDataList(file: File): Promise<ImageData[]> {
  if (file.type.startsWith('image/')) {
    const bmp = await createImageBitmap(file);
    const c = document.createElement('canvas');
    c.width = bmp.width; c.height = bmp.height;
    const ctx = c.getContext('2d');
    if (!ctx) throw new Error('canvas');
    ctx.drawImage(bmp, 0, 0);
    return [ctx.getImageData(0, 0, c.width, c.height)];
  }
  if (file.type === 'application/pdf' || file.name.toLowerCase().endsWith('.pdf')) {
    const pdfjs = await import('pdfjs-dist');
    const workerUrl = (await import('pdfjs-dist/build/pdf.worker.mjs?url')).default;
    (pdfjs as unknown as { GlobalWorkerOptions: { workerSrc: string } }).GlobalWorkerOptions.workerSrc = workerUrl;
    const buf = await file.arrayBuffer();
    const pdf = await pdfjs.getDocument({ data: buf }).promise;
    const pages: ImageData[] = [];
    const max = Math.min(pdf.numPages, 3);
    for (let i = 1; i <= max; i++) {
      const page = await pdf.getPage(i);
      const viewport = page.getViewport({ scale: 2.5 });
      const c = document.createElement('canvas');
      c.width = viewport.width; c.height = viewport.height;
      const ctx = c.getContext('2d');
      if (!ctx) continue;
      await page.render({ canvasContext: ctx, viewport }).promise;
      pages.push(ctx.getImageData(0, 0, c.width, c.height));
    }
    return pages;
  }
  throw new Error('unsupported');
}

function scanQr(img: ImageData): string | null {
  const r = jsQR(img.data, img.width, img.height, { inversionAttempts: 'attemptBoth' });
  return r?.data ?? null;
}

interface Props {
  onParsed: (scan: CrScanResult) => void;
}

/**
 * Lightweight CR barcode scanner for forms that don't have a businessId yet
 * (e.g. admin create-user). Reads QR from PDF/image, parses, returns to caller.
 */
export const CrQuickScanInline: React.FC<Props> = ({ onParsed }) => {
  const { isRTL } = useLanguage();
  const inputRef = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState<CrScanResult | null>(null);
  const [err, setErr] = useState<string | null>(null);

  const reset = useCallback(() => {
    setDone(null); setErr(null);
    if (inputRef.current) inputRef.current.value = '';
  }, []);

  const handle = useCallback(async (f: File) => {
    setErr(null); setDone(null);
    if (!ACCEPTED.includes(f.type) && !/\.(pdf|png|jpe?g|webp)$/i.test(f.name)) {
      setErr(isRTL ? 'نوع ملف غير مدعوم (PDF أو صورة فقط)' : 'Unsupported file type');
      return;
    }
    if (f.size > 15 * 1024 * 1024) {
      setErr(isRTL ? 'الحجم أكبر من 15MB' : 'File exceeds 15MB');
      return;
    }
    setBusy(true);
    try {
      const pages = await fileToImageDataList(f);
      let raw: string | null = null;
      for (const p of pages) { raw = scanQr(p); if (raw) break; }
      if (!raw) {
        setErr(isRTL ? 'لم يتم العثور على باركود في الملف' : 'No QR code found');
        return;
      }
      const parsed = parseCrPayload(raw);
      setDone(parsed);
      onParsed(parsed);
      toast.success(isRTL ? 'تم سحب البيانات من الباركود' : 'Data imported from QR');
    } catch (e) {
      setErr(e instanceof Error ? e.message : String(e));
    } finally {
      setBusy(false);
    }
  }, [isRTL, onParsed]);

  return (
    <div className="rounded-xl border border-dashed border-primary/30 bg-primary/5 p-3 space-y-2">
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2 text-sm font-medium">
          <ScanLine className="w-4 h-4 text-primary" />
          {isRTL ? 'استيراد البيانات من باركود السجل التجاري' : 'Import from CR barcode'}
        </div>
        <div className="flex items-center gap-1.5">
          <input
            ref={inputRef}
            type="file"
            accept=".pdf,.png,.jpg,.jpeg,.webp,application/pdf,image/*"
            className="hidden"
            onChange={(e) => { const f = e.target.files?.[0]; if (f) void handle(f); }}
          />
          <Button type="button" size="sm" variant="outline" className="rounded-lg h-8 gap-1.5"
            disabled={busy} onClick={() => inputRef.current?.click()}>
            {busy ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <ScanLine className="w-3.5 h-3.5" />}
            {busy ? (isRTL ? 'جارٍ القراءة…' : 'Scanning…') : (isRTL ? 'رفع ملف' : 'Upload file')}
          </Button>
          {(done || err) && (
            <Button type="button" size="icon" variant="ghost" className="rounded-lg h-8 w-8" onClick={reset}>
              <X className="w-3.5 h-3.5" />
            </Button>
          )}
        </div>
      </div>

      {done && (
        <div className="flex flex-wrap gap-1.5 text-xs">
          <Badge variant="secondary" className="gap-1"><CheckCircle2 className="w-3 h-3 text-success" />{isRTL ? 'تمت القراءة' : 'Parsed'}</Badge>
          {done.cr_number && <Badge variant="outline" className="tech-content">CR: {done.cr_number}</Badge>}
          {done.unified_number && <Badge variant="outline" className="tech-content">700: {done.unified_number}</Badge>}
          {done.vat_number && <Badge variant="outline" className="tech-content">VAT: {done.vat_number}</Badge>}
          {done.owner_name && <Badge variant="outline">{done.owner_name}</Badge>}
          {done.business_name_ar && <Badge variant="outline">{done.business_name_ar}</Badge>}
        </div>
      )}

      {err && (
        <div className="flex items-start gap-2 text-xs text-destructive">
          <AlertCircle className="w-3.5 h-3.5 mt-0.5 shrink-0" />
          <span>{err}</span>
        </div>
      )}
    </div>
  );
};
