import React, { useCallback, useRef, useState } from 'react';
import jsQR from 'jsqr';
import { ScanLine, Loader2, CheckCircle2, AlertCircle, X, Globe, ExternalLink, Copy, FileText } from 'lucide-react';
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
  const [enriched, setEnriched] = useState(false);

  const reset = useCallback(() => {
    setDone(null); setErr(null); setEnriched(false);
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
        <ScanResults result={done} enriched={enriched} isRTL={isRTL} />
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

/* ─── Results panel: full breakdown of every extracted field ─── */
interface ScanResultsProps {
  result: CrScanResult;
  enriched: boolean;
  isRTL: boolean;
}

const ScanResults: React.FC<ScanResultsProps> = ({ result, enriched, isRTL }) => {
  const fieldDefs: { key: keyof CrScanResult; ar: string; en: string; mono?: boolean }[] = [
    { key: 'cr_number',        ar: 'رقم السجل التجاري', en: 'CR Number',        mono: true },
    { key: 'unified_number',   ar: 'الرقم الموحد (700)', en: 'Unified Number',   mono: true },
    { key: 'vat_number',       ar: 'الرقم الضريبي',     en: 'VAT Number',        mono: true },
    { key: 'owner_name',       ar: 'اسم المالك',        en: 'Owner Name' },
    { key: 'business_name_ar', ar: 'الاسم بالعربية',    en: 'Name (AR)' },
    { key: 'business_name_en', ar: 'الاسم بالإنجليزية', en: 'Name (EN)' },
    { key: 'legal_entity',     ar: 'الكيان القانوني',   en: 'Legal Entity' },
    { key: 'issue_date',       ar: 'تاريخ الإصدار',     en: 'Issue Date',        mono: true },
    { key: 'expiry_date',      ar: 'تاريخ الانتهاء',    en: 'Expiry Date',       mono: true },
  ];

  const presentFields = fieldDefs.filter((f) => {
    const v = result[f.key];
    return typeof v === 'string' && v.trim().length > 0;
  });
  const extras = Object.entries(result.extras || {}).filter(([, v]) => v && String(v).trim());

  const copy = (val: string, label: string) => {
    void navigator.clipboard.writeText(val).then(
      () => toast.success(isRTL ? `تم نسخ ${label}` : `${label} copied`),
      () => toast.error(isRTL ? 'تعذّر النسخ' : 'Copy failed'),
    );
  };

  return (
    <div className="rounded-xl border border-border/40 bg-card overflow-hidden animate-in fade-in slide-in-from-top-1 duration-200">
      {/* Header */}
      <div className="flex items-center justify-between gap-2 px-3 py-2 bg-success/5 border-b border-border/40">
        <div className="flex items-center gap-2 text-sm font-semibold">
          <CheckCircle2 className="w-4 h-4 text-success" />
          {isRTL ? 'نتائج قراءة الباركود' : 'Scan results'}
        </div>
        <div className="flex items-center gap-1.5">
          <Badge variant="outline" className="text-[10px] gap-1">
            <FileText className="w-3 h-3" />
            {presentFields.length} {isRTL ? 'حقل' : 'fields'}
          </Badge>
          {enriched && (
            <Badge variant="outline" className="text-[10px] gap-1 border-info/40 text-info">
              <Globe className="w-3 h-3" />
              {isRTL ? 'من صفحة الباركود' : 'from page'}
            </Badge>
          )}
        </div>
      </div>

      {/* URL row */}
      {result.url && (
        <a
          href={result.url}
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center gap-2 px-3 py-2 text-[11px] text-info hover:bg-info/5 border-b border-border/40 truncate"
        >
          <ExternalLink className="w-3 h-3 shrink-0" />
          <span className="truncate tech-content">{result.url}</span>
        </a>
      )}

      {/* Fields grid */}
      {presentFields.length > 0 ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 divide-y sm:divide-y-0 sm:divide-x divide-border/40 [&>*:nth-child(n+3)]:border-t [&>*:nth-child(n+3)]:border-border/40">
          {presentFields.map((f) => {
            const val = String(result[f.key]);
            return (
              <div key={f.key} className="group flex items-start justify-between gap-2 px-3 py-2 hover:bg-muted/30 transition-colors">
                <div className="min-w-0 flex-1">
                  <p className="text-[10px] text-muted-foreground uppercase tracking-wide mb-0.5">
                    {isRTL ? f.ar : f.en}
                  </p>
                  <p className={`text-sm font-medium break-words ${f.mono ? 'tech-content' : ''}`}>
                    {val}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => copy(val, isRTL ? f.ar : f.en)}
                  className="opacity-0 group-hover:opacity-100 transition-opacity p-1 rounded-md hover:bg-muted text-muted-foreground"
                  title={isRTL ? 'نسخ' : 'Copy'}
                >
                  <Copy className="w-3 h-3" />
                </button>
              </div>
            );
          })}
        </div>
      ) : (
        <div className="px-3 py-3 text-xs text-muted-foreground">
          {isRTL ? 'لم تُستخرج حقول معروفة من الباركود.' : 'No known fields extracted from the QR.'}
        </div>
      )}

      {/* Extras */}
      {extras.length > 0 && (
        <details className="border-t border-border/40">
          <summary className="cursor-pointer px-3 py-2 text-[11px] font-medium text-muted-foreground hover:bg-muted/30">
            {isRTL ? `حقول إضافية (${extras.length})` : `Additional fields (${extras.length})`}
          </summary>
          <div className="px-3 py-2 grid grid-cols-1 sm:grid-cols-2 gap-1.5 text-[11px]">
            {extras.map(([k, v]) => (
              <div key={k} className="flex items-start gap-1.5 rounded-md bg-muted/30 px-2 py-1">
                <span className="text-muted-foreground shrink-0">{k}:</span>
                <span className="break-words tech-content">{String(v)}</span>
              </div>
            ))}
          </div>
        </details>
      )}

      {/* Raw payload */}
      <details className="border-t border-border/40">
        <summary className="cursor-pointer px-3 py-2 text-[11px] font-medium text-muted-foreground hover:bg-muted/30">
          {isRTL ? 'المحتوى الخام للباركود' : 'Raw QR payload'}
        </summary>
        <pre dir="ltr" className="px-3 py-2 text-[10px] font-mono whitespace-pre-wrap break-all bg-muted/20 max-h-40 overflow-auto">
          {result.raw}
        </pre>
      </details>
    </div>
  );
};
