import React, { useCallback, useMemo, useRef, useState } from 'react';
import jsQR from 'jsqr';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import {
  Upload, FileText, ScanLine, CheckCircle2, Loader2, X, ExternalLink,
  RefreshCw, Save, AlertCircle, Download, Lightbulb,
} from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { updateBusinessById } from '@/modules/businesses';
import { useLanguage } from '@/i18n/LanguageContext';
import { useAuth } from '@/contexts/AuthContext';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Label } from '@/components/ui/label';
import { toast } from 'sonner';

/* ------------------------------------------------------------------ */
/* Types                                                              */
/* ------------------------------------------------------------------ */

export interface CrScanResult {
  raw: string;
  url?: string;
  cr_number?: string;
  unified_number?: string;
  vat_number?: string;
  owner_name?: string;
  business_name_ar?: string;
  business_name_en?: string;
  legal_entity?: string;
  issue_date?: string; // YYYY-MM-DD
  expiry_date?: string;
  extras: Record<string, string>;
}

export interface CrDocumentDefaults {
  cr_document_url: string | null;
  cr_document_uploaded_at: string | null;
  cr_scan_data: Record<string, unknown> | null;
  cr_scan_raw: string | null;
  national_id: string | null;
  unified_number: string | null;
  vat_number: string | null;
  cr_owner_name: string | null;
  cr_legal_entity: string | null;
  cr_issue_date: string | null;
  cr_expiry_date: string | null;
  name_ar: string | null;
  name_en: string | null;
}

interface Props {
  businessId: string;
  defaults: Partial<CrDocumentDefaults>;
  onSaved?: () => void;
}

/* ------------------------------------------------------------------ */
/* Helpers                                                            */
/* ------------------------------------------------------------------ */

const BUCKET = 'business-documents';

/** Accepted MIME types & extensions for CR upload. */
const ACCEPTED_MIME = ['application/pdf', 'image/png', 'image/jpeg', 'image/webp'];
const ACCEPTED_EXT = ['.pdf', '.png', '.jpg', '.jpeg', '.webp'];
const MAX_BYTES = 15 * 1024 * 1024;

/** Structured scan error so the UI can render rich, localized guidance. */
type ScanErrorKind = 'unsupported' | 'too_large' | 'too_small' | 'no_qr' | 'decode_failed';
interface ScanError {
  kind: ScanErrorKind;
  message: string;
  tips: string[];
}

function buildScanError(
  kind: ScanErrorKind,
  isRTL: boolean,
  extra?: string,
): ScanError {
  const dict: Record<ScanErrorKind, { ar: { msg: string; tips: string[] }; en: { msg: string; tips: string[] } }> = {
    unsupported: {
      ar: {
        msg: 'نوع الملف غير مدعوم. الأنواع المقبولة: PDF أو صورة (PNG / JPG / WEBP).',
        tips: [
          'إذا كان الملف Word أو صورة بصيغة HEIC، حوّله إلى PDF أو JPG ثم أعد المحاولة.',
          'تأكد أن امتداد الملف صحيح (.pdf / .jpg / .png / .webp).',
        ],
      },
      en: {
        msg: 'Unsupported file type. Accepted: PDF or image (PNG / JPG / WEBP).',
        tips: [
          'If the file is a Word doc or a HEIC image, convert it to PDF or JPG and retry.',
          'Verify the file extension is correct (.pdf / .jpg / .png / .webp).',
        ],
      },
    },
    too_large: {
      ar: {
        msg: 'حجم الملف أكبر من 15MB.',
        tips: [
          'اضغط الـ PDF أو خفّض دقّة الصورة قبل الرفع.',
          'صدّر صفحة الباركود فقط بدلاً من المستند كاملاً.',
        ],
      },
      en: {
        msg: 'File exceeds 15MB.',
        tips: [
          'Compress the PDF or downscale the image before uploading.',
          'Export only the page that contains the QR instead of the whole document.',
        ],
      },
    },
    too_small: {
      ar: {
        msg: 'دقّة الصورة منخفضة جدًا لاكتشاف الباركود.',
        tips: [
          'استخدم صورة لا تقل عن 800×800 بكسل.',
          'صوّر السجل بإضاءة جيّدة وزاوية عمودية على الورقة.',
        ],
      },
      en: {
        msg: 'Image resolution is too low for QR detection.',
        tips: [
          'Use an image of at least 800×800 pixels.',
          'Shoot the document with good lighting and a perpendicular angle.',
        ],
      },
    },
    no_qr: {
      ar: {
        msg: 'لم يتم العثور على باركود في الملف. يمكنك تعبئة الحقول يدويًا وحفظ المستند.',
        tips: [
          'تأكد أن صفحة الباركود غير مقصوصة في الـ PDF.',
          'إذا كانت صورة: قرّب الكاميرا حتى يملأ الباركود ~ ثلث الإطار.',
          'تجنّب الانعكاسات والظلال، وثبّت الكاميرا لتفادي الاهتزاز.',
          'حاول إعادة المسح بصورة أوضح أو بنسخة PDF أصلية من منصّة المركز السعودي للأعمال.',
        ],
      },
      en: {
        msg: 'No QR code detected. You can still fill the fields manually and save the document.',
        tips: [
          'Make sure the QR page is not cropped in the PDF.',
          'For photos: zoom in so the QR fills about a third of the frame.',
          'Avoid glare and shadows, and hold the camera steady.',
          'Try rescanning with a clearer image or the original PDF from the Saudi Business Center.',
        ],
      },
    },
    decode_failed: {
      ar: {
        msg: 'تعذّر فك ترميز الملف.',
        tips: [
          'قد يكون ملف الـ PDF محميًّا أو تالفًا — جرّب نسخة أخرى.',
          'افتح الملف على جهازك أولًا للتأكد أنه يعمل، ثم أعد الرفع.',
        ],
      },
      en: {
        msg: 'Failed to decode the file.',
        tips: [
          'The PDF may be protected or corrupted — try another copy.',
          'Open the file on your device first to confirm it works, then re-upload.',
        ],
      },
    },
  };
  const t = isRTL ? dict[kind].ar : dict[kind].en;
  return { kind, message: extra ? `${t.msg} (${extra})` : t.msg, tips: t.tips };
}

function isAcceptedFile(f: File): boolean {
  if (ACCEPTED_MIME.includes(f.type)) return true;
  const name = f.name.toLowerCase();
  return ACCEPTED_EXT.some((ext) => name.endsWith(ext));
}

/** Normalize Arabic / Hindi digits to ASCII. */
function normDigits(s: string): string {
  return s
    .replace(/[\u0660-\u0669]/g, (d) => String(d.charCodeAt(0) - 0x0660))
    .replace(/[\u06F0-\u06F9]/g, (d) => String(d.charCodeAt(0) - 0x06F0));
}

/** Try to interpret a date string in many formats → YYYY-MM-DD. */
function toIsoDate(input: string | undefined): string | undefined {
  if (!input) return undefined;
  const s = normDigits(input).trim();
  // ISO already
  if (/^\d{4}-\d{2}-\d{2}$/.test(s)) return s;
  // dd/mm/yyyy or dd-mm-yyyy
  const m = s.match(/^(\d{1,2})[/\-.](\d{1,2})[/\-.](\d{2,4})$/);
  if (m) {
    const [_, d, mo, y] = m;
    const yy = y.length === 2 ? `20${y}` : y;
    return `${yy}-${mo.padStart(2, '0')}-${d.padStart(2, '0')}`;
  }
  const dt = new Date(s);
  if (!Number.isNaN(dt.getTime())) return dt.toISOString().slice(0, 10);
  return undefined;
}

/**
 * Parse the raw QR payload (Saudi MCI / Maroof / generic).
 * Supports:
 *  • JSON payloads — keys mapped intelligently.
 *  • URL with query string (cr=…, mc=…, vat=…).
 *  • Plain CR number (10 digits) — best-effort.
 *  • key=value;key=value blobs (vCard-ish).
 */
export function parseCrPayload(raw: string): CrScanResult {
  const result: CrScanResult = { raw, extras: {} };
  const s = normDigits(raw).trim();

  // 1) JSON
  try {
    const obj = JSON.parse(s);
    if (obj && typeof obj === 'object') {
      assignFromObject(result, obj as Record<string, unknown>);
      return result;
    }
  } catch { /* not JSON */ }

  // 2) URL
  try {
    const url = new URL(s);
    result.url = url.toString();
    url.searchParams.forEach((v, k) => assignKv(result, k, v));
    // Detect CR number in path segments.
    const pathCr = url.pathname.match(/\b(\d{10})\b/);
    if (pathCr && !result.cr_number) result.cr_number = pathCr[1];
    return result;
  } catch { /* not URL */ }

  // 3) key=value pairs (separator ; or newline)
  if (/[=:]/.test(s) && /[;\n]/.test(s)) {
    s.split(/[;\n]/).forEach((pair) => {
      const m = pair.split(/[=:]/);
      if (m.length >= 2) assignKv(result, m[0].trim(), m.slice(1).join('=').trim());
    });
    return result;
  }

  // 4) Plain CR number
  const cr = s.match(/\b(\d{10})\b/);
  if (cr) result.cr_number = cr[1];
  return result;
}

function assignFromObject(r: CrScanResult, obj: Record<string, unknown>) {
  for (const [k, v] of Object.entries(obj)) {
    if (v === null || v === undefined) continue;
    if (typeof v === 'object') {
      assignFromObject(r, v as Record<string, unknown>);
      continue;
    }
    assignKv(r, k, String(v));
  }
}

function assignKv(r: CrScanResult, key: string, value: string) {
  const k = key.toLowerCase().replace(/[\s_-]/g, '');
  const v = normDigits(value).trim();
  if (!v) return;
  switch (true) {
    case /^(cr|crno|crnumber|commercialregistration|registrationnumber|sjlt)$/.test(k):
      r.cr_number = v; break;
    case /^(unified|unifiednumber|moanumber|mc|mcnumber|unifiednum|700)$/.test(k):
      r.unified_number = v; break;
    case /^(vat|vatnumber|tax|taxnumber|trn|vatregnumber)$/.test(k):
      r.vat_number = v; break;
    case /^(owner|ownername|merchant|merchantname)$/.test(k):
      r.owner_name = v; break;
    case /^(namear|arabicname|businessnamear|entitynamear|companynamear|sellername)$/.test(k):
      r.business_name_ar = v; break;
    case /^(nameen|englishname|businessnameen|entitynameen|companynameen)$/.test(k):
      r.business_name_en = v; break;
    case /^(name|businessname|companyname|entityname)$/.test(k):
      if (!r.business_name_ar && /[\u0600-\u06FF]/.test(v)) r.business_name_ar = v;
      else if (!r.business_name_en) r.business_name_en = v;
      break;
    case /^(legalentity|entitytype|legalform|companytype|kind)$/.test(k):
      r.legal_entity = v; break;
    case /^(issue|issuedate|issued|issueon|startdate)$/.test(k):
      r.issue_date = toIsoDate(v); break;
    case /^(expiry|expirydate|expire|expires|expireon|enddate)$/.test(k):
      r.expiry_date = toIsoDate(v); break;
    default:
      r.extras[key] = v;
  }
}

/* ------------------------------------------------------------------ */
/* PDF → image (first page) using pdfjs-dist                          */
/* ------------------------------------------------------------------ */

async function fileToImageDataList(file: File): Promise<ImageData[]> {
  if (file.type.startsWith('image/')) {
    const bmp = await createImageBitmap(file);
    const canvas = document.createElement('canvas');
    canvas.width = bmp.width;
    canvas.height = bmp.height;
    const ctx = canvas.getContext('2d');
    if (!ctx) throw new Error('Canvas 2D context unavailable');
    ctx.drawImage(bmp, 0, 0);
    return [ctx.getImageData(0, 0, canvas.width, canvas.height)];
  }
  if (file.type === 'application/pdf' || file.name.toLowerCase().endsWith('.pdf')) {
    const pdfjs = await import('pdfjs-dist');
    const workerUrl = (await import('pdfjs-dist/build/pdf.worker.mjs?url')).default;
    (pdfjs as unknown as { GlobalWorkerOptions: { workerSrc: string } }).GlobalWorkerOptions.workerSrc = workerUrl;
    const buf = await file.arrayBuffer();
    const pdf = await pdfjs.getDocument({ data: buf }).promise;
    const pages: ImageData[] = [];
    const maxPages = Math.min(pdf.numPages, 5);
    for (let i = 1; i <= maxPages; i++) {
      const page = await pdf.getPage(i);
      // Higher scale = better small-QR detection.
      const viewport = page.getViewport({ scale: 2.5 });
      const canvas = document.createElement('canvas');
      canvas.width = viewport.width;
      canvas.height = viewport.height;
      const ctx = canvas.getContext('2d');
      if (!ctx) continue;
      await page.render({ canvasContext: ctx, viewport }).promise;
      pages.push(ctx.getImageData(0, 0, canvas.width, canvas.height));
    }
    return pages;
  }
  throw new Error('Unsupported file type');
}

/** Try to detect a QR in an ImageData using several rescales. */
function scanQrFromImageData(img: ImageData): string | null {
  const direct = jsQR(img.data, img.width, img.height, { inversionAttempts: 'attemptBoth' });
  if (direct?.data) return direct.data;
  // Try downscaled (helps very large hi-DPI pages).
  for (const scale of [0.6, 0.4]) {
    const w = Math.round(img.width * scale);
    const h = Math.round(img.height * scale);
    const c = document.createElement('canvas');
    c.width = w; c.height = h;
    const cx = c.getContext('2d');
    if (!cx) continue;
    // Render via temporary canvas of original image.
    const src = document.createElement('canvas');
    src.width = img.width; src.height = img.height;
    const sx = src.getContext('2d');
    if (!sx) continue;
    sx.putImageData(img, 0, 0);
    cx.drawImage(src, 0, 0, w, h);
    const scaled = cx.getImageData(0, 0, w, h);
    const r = jsQR(scaled.data, w, h, { inversionAttempts: 'attemptBoth' });
    if (r?.data) return r.data;
  }
  return null;
}

/* ------------------------------------------------------------------ */
/* Component                                                          */
/* ------------------------------------------------------------------ */

export const CrDocumentScanner: React.FC<Props> = ({ businessId, defaults, onSaved }) => {
  const { isRTL } = useLanguage();
  const { user } = useAuth();
  const qc = useQueryClient();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [file, setFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [busy, setBusy] = useState<'idle' | 'scanning' | 'uploading'>('idle');
  const [scan, setScan] = useState<CrScanResult | null>(null);
  const [scanError, setScanError] = useState<ScanError | null>(null);

  // Editable form (prefilled from defaults, then overridden by scan).
  const [form, setForm] = useState({
    cr_number: defaults.national_id ?? '',
    unified_number: defaults.unified_number ?? '',
    vat_number: defaults.vat_number ?? '',
    cr_owner_name: defaults.cr_owner_name ?? '',
    cr_legal_entity: defaults.cr_legal_entity ?? '',
    cr_issue_date: defaults.cr_issue_date ?? '',
    cr_expiry_date: defaults.cr_expiry_date ?? '',
  });

  const existingDoc = defaults.cr_document_url ?? null;

  const reset = useCallback(() => {
    setFile(null);
    if (previewUrl) URL.revokeObjectURL(previewUrl);
    setPreviewUrl(null);
    setScan(null);
    setScanError(null);
    if (fileInputRef.current) fileInputRef.current.value = '';
  }, [previewUrl]);

  const handleFiles = useCallback(async (f: File) => {
    setScanError(null);
    setScan(null);
    if (!isAcceptedFile(f)) {
      const err = buildScanError('unsupported', isRTL, f.type || f.name.split('.').pop() || '');
      setScanError(err);
      toast.error(err.message);
      return;
    }
    if (f.size > MAX_BYTES) {
      const err = buildScanError('too_large', isRTL, `${(f.size / 1024 / 1024).toFixed(1)} MB`);
      setScanError(err);
      toast.error(err.message);
      return;
    }
    setFile(f);
    if (previewUrl) URL.revokeObjectURL(previewUrl);
    setPreviewUrl(URL.createObjectURL(f));
    setBusy('scanning');
    try {
      const pages = await fileToImageDataList(f);
      // Flag low-resolution images so we can guide the user.
      const smallest = pages.reduce(
        (min, p) => Math.min(min, Math.min(p.width, p.height)),
        Number.POSITIVE_INFINITY,
      );
      let raw: string | null = null;
      for (const p of pages) {
        raw = scanQrFromImageData(p);
        if (raw) break;
      }
      if (!raw) {
        const kind: ScanErrorKind =
          Number.isFinite(smallest) && smallest < 600 ? 'too_small' : 'no_qr';
        setScanError(buildScanError(kind, isRTL));
        return;
      }
      const parsed = parseCrPayload(raw);
      setScan(parsed);
      // Merge into form (scan wins over current empty fields).
      setForm((cur) => ({
        cr_number:       parsed.cr_number       ?? cur.cr_number,
        unified_number:  parsed.unified_number  ?? cur.unified_number,
        vat_number:      parsed.vat_number      ?? cur.vat_number,
        cr_owner_name:   parsed.owner_name      ?? cur.cr_owner_name,
        cr_legal_entity: parsed.legal_entity    ?? cur.cr_legal_entity,
        cr_issue_date:   parsed.issue_date      ?? cur.cr_issue_date,
        cr_expiry_date:  parsed.expiry_date     ?? cur.cr_expiry_date,
      }));
      toast.success(isRTL ? 'تم قراءة الباركود' : 'QR decoded');
    } catch (e) {
      const detail = e instanceof Error ? e.message : String(e);
      const kind: ScanErrorKind = /unsupported/i.test(detail) ? 'unsupported' : 'decode_failed';
      setScanError(buildScanError(kind, isRTL, detail));
    } finally {
      setBusy('idle');
    }
  }, [previewUrl, isRTL]);

  const onPickFile: React.ChangeEventHandler<HTMLInputElement> = (e) => {
    const f = e.target.files?.[0];
    if (f) handleFiles(f);
  };

  const onDrop: React.DragEventHandler<HTMLDivElement> = (e) => {
    e.preventDefault();
    const f = e.dataTransfer.files?.[0];
    if (f) handleFiles(f);
  };

  const saveMut = useMutation({
    mutationFn: async () => {
      let documentUrl: string | null = defaults.cr_document_url ?? null;
      let documentPath: string | null = null;
      let mime: string | null = null;
      let size: number | null = null;

      if (file) {
        setBusy('uploading');
        const ext = file.name.includes('.') ? file.name.split('.').pop() : 'bin';
        const path = `cr/${businessId}/${Date.now()}-${crypto.randomUUID()}.${ext}`;
        const { error: upErr } = await supabase.storage
          .from(BUCKET)
          .upload(path, file, { upsert: false, contentType: file.type || undefined });
        if (upErr) throw upErr;
        const { data: signed } = await supabase.storage
          .from(BUCKET)
          .createSignedUrl(path, 60 * 60 * 24 * 365); // 1y signed link
        documentUrl = signed?.signedUrl ?? null;
        documentPath = path;
        mime = file.type || null;
        size = file.size;
      }

      const update: Record<string, unknown> = {
        national_id: form.cr_number || null,
        unified_number: form.unified_number || null,
        vat_number: form.vat_number || null,
        cr_owner_name: form.cr_owner_name || null,
        cr_legal_entity: form.cr_legal_entity || null,
        cr_issue_date: form.cr_issue_date || null,
        cr_expiry_date: form.cr_expiry_date || null,
      };
      if (file) {
        update.cr_document_url = documentUrl;
        update.cr_document_path = documentPath;
        update.cr_document_mime = mime;
        update.cr_document_size = size;
        update.cr_document_uploaded_at = new Date().toISOString();
        update.cr_document_uploaded_by = user?.id ?? null;
      }
      if (scan) {
        update.cr_scan_raw = scan.raw;
        update.cr_scan_data = {
          url: scan.url ?? null,
          extras: scan.extras,
          parsed_at: new Date().toISOString(),
        };
        update.cr_scan_at = new Date().toISOString();
      }

      const { error } = await updateBusinessById({ id: businessId, values: update });
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success(isRTL ? 'تم الحفظ' : 'Saved');
      qc.invalidateQueries({ queryKey: ['admin-provider-review'] });
      reset();
      onSaved?.();
      setBusy('idle');
    },
    onError: (e: unknown) => {
      setBusy('idle');
      toast.error(e instanceof Error ? e.message : 'Save failed');
    },
  });

  const isPdf = file?.type === 'application/pdf' || file?.name?.toLowerCase().endsWith('.pdf');
  const fields = useMemo(() => [
    { key: 'cr_number',       ar: 'رقم السجل التجاري',  en: 'CR number',       placeholder: '10xxxxxxxx' },
    { key: 'unified_number',  ar: 'الرقم الموحّد (700)', en: 'Unified number',  placeholder: '7xxxxxxxxx' },
    { key: 'vat_number',      ar: 'الرقم الضريبي',       en: 'VAT number',      placeholder: '3xxxxxxxxxxxxxx' },
    { key: 'cr_owner_name',   ar: 'اسم المالك',          en: 'Owner name',      placeholder: '' },
    { key: 'cr_legal_entity', ar: 'الكيان القانوني',     en: 'Legal entity',    placeholder: '' },
    { key: 'cr_issue_date',   ar: 'تاريخ الإصدار',       en: 'Issue date',      placeholder: '', type: 'date' },
    { key: 'cr_expiry_date',  ar: 'تاريخ الانتهاء',      en: 'Expiry date',     placeholder: '', type: 'date' },
  ] as const, []);

  return (
    <Card className="border-border/60">
      <CardHeader className="pb-3">
        <CardTitle className="text-base flex items-center gap-2">
          <ScanLine className="h-4 w-4 text-primary" />
          {isRTL ? 'السجل التجاري — رفع وقراءة الباركود' : 'Commercial Registration — Upload & QR scan'}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Existing document */}
        {existingDoc && !file && (
          <div className="flex items-center justify-between rounded-xl border border-success/30 bg-success/5 p-3">
            <div className="flex items-center gap-2 text-sm">
              <CheckCircle2 className="h-4 w-4 text-success" />
              <span>{isRTL ? 'يوجد ملف سجل تجاري محفوظ' : 'A CR document is on file'}</span>
              {defaults.cr_document_uploaded_at && (
                <Badge variant="outline" className="tech-content text-[11px]">
                  {new Date(defaults.cr_document_uploaded_at).toLocaleDateString()}
                </Badge>
              )}
            </div>
            <Button asChild size="sm" variant="outline" className="gap-1">
              <a href={existingDoc} target="_blank" rel="noreferrer">
                <Download className="h-3.5 w-3.5" />
                {isRTL ? 'تنزيل' : 'Download'}
              </a>
            </Button>
          </div>
        )}

        {/* Dropzone */}
        {!file && (
          <div
            onDragOver={(e) => e.preventDefault()}
            onDrop={onDrop}
            onClick={() => fileInputRef.current?.click()}
            className="cursor-pointer rounded-xl border-2 border-dashed border-border bg-muted/30 p-8 text-center hover:border-primary/50 hover:bg-muted/50 transition-colors"
          >
            <Upload className="h-8 w-8 mx-auto mb-2 text-muted-foreground" />
            <p className="text-sm font-medium">
              {isRTL ? 'اسحب وأفلت ملف السجل التجاري هنا، أو انقر للاختيار' : 'Drop the CR file here, or click to choose'}
            </p>
            <p className="text-xs text-muted-foreground mt-1">
              {isRTL ? 'PDF أو صورة (JPG/PNG) — حتى 15MB' : 'PDF or image (JPG/PNG) — up to 15MB'}
            </p>
            <input
              ref={fileInputRef}
              type="file"
              accept="application/pdf,image/png,image/jpeg,image/webp"
              className="hidden"
              onChange={onPickFile}
            />
          </div>
        )}

        {/* Preview + scan status */}
        {file && (
          <div className="space-y-3">
            <div className="flex items-center justify-between gap-2 rounded-lg border bg-muted/30 p-2.5">
              <div className="flex items-center gap-2 min-w-0">
                <FileText className="h-4 w-4 text-primary shrink-0" />
                <span className="text-sm truncate" dir="auto">{file.name}</span>
                <Badge variant="outline" className="tech-content text-[10px]">
                  {(file.size / 1024).toFixed(0)} KB
                </Badge>
              </div>
              <div className="flex items-center gap-1">
                <Button size="sm" variant="ghost" onClick={() => file && handleFiles(file)} disabled={busy !== 'idle'}>
                  <RefreshCw className="h-3.5 w-3.5" /> {isRTL ? 'إعادة المسح' : 'Rescan'}
                </Button>
                <Button size="sm" variant="ghost" onClick={reset}>
                  <X className="h-3.5 w-3.5" />
                </Button>
              </div>
            </div>

            {previewUrl && (
              <div className="rounded-lg overflow-hidden border bg-muted/20">
                {isPdf ? (
                  <iframe src={previewUrl} title="cr-preview" className="w-full h-[280px]" />
                ) : (
                  <img src={previewUrl} alt="cr-preview" className="w-full max-h-[280px] object-contain mx-auto" />
                )}
              </div>
            )}

            {busy === 'scanning' && (
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Loader2 className="h-4 w-4 animate-spin" />
                {isRTL ? 'جاري قراءة الباركود…' : 'Scanning QR…'}
              </div>
            )}

            {scanError && (
              <div className="rounded-lg border border-warning/40 bg-warning/5 p-3 space-y-2 text-xs">
                <div className="flex items-start gap-2 font-medium text-warning-foreground">
                  <AlertCircle className="h-4 w-4 text-warning shrink-0 mt-0.5" />
                  <span>{scanError.message}</span>
                </div>
                {scanError.tips.length > 0 && (
                  <div className="ps-6 space-y-1 text-muted-foreground">
                    <div className="flex items-center gap-1.5 font-medium text-foreground/80">
                      <Lightbulb className="h-3.5 w-3.5 text-warning" />
                      {isRTL ? 'نصائح لتحسين القراءة' : 'Tips to improve detection'}
                    </div>
                    <ul className="list-disc ps-4 space-y-0.5">
                      {scanError.tips.map((t) => (
                        <li key={t} dir="auto">{t}</li>
                      ))}
                    </ul>
                    <div className="pt-1">
                      <Button
                        size="sm"
                        variant="outline"
                        className="h-7 text-[11px] gap-1"
                        onClick={() => file && handleFiles(file)}
                        disabled={busy !== 'idle'}
                      >
                        <RefreshCw className="h-3 w-3" />
                        {isRTL ? 'إعادة المحاولة' : 'Try again'}
                      </Button>
                    </div>
                  </div>
                )}
              </div>
            )}

            {scan && (
              <div className="rounded-lg border border-success/30 bg-success/5 p-3 space-y-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2 text-sm font-medium">
                    <CheckCircle2 className="h-4 w-4 text-success" />
                    {isRTL ? 'تمت قراءة الباركود' : 'QR decoded'}
                  </div>
                  {scan.url && (
                    <a href={scan.url} target="_blank" rel="noreferrer"
                       className="text-xs text-primary inline-flex items-center gap-1 hover:underline tech-content">
                      <ExternalLink className="h-3 w-3" />
                      {isRTL ? 'فتح الرابط' : 'Open link'}
                    </a>
                  )}
                </div>
                <details className="text-[11px]">
                  <summary className="cursor-pointer text-muted-foreground">
                    {isRTL ? 'البيانات الخام' : 'Raw payload'}
                  </summary>
                  <pre className="mt-1 max-h-32 overflow-auto whitespace-pre-wrap break-all bg-muted/40 p-2 rounded tech-content">
                    {scan.raw}
                  </pre>
                </details>
              </div>
            )}
          </div>
        )}

        {/* Editable fields */}
        <div className="grid gap-3 sm:grid-cols-2">
          {fields.map((f) => (
            <div key={f.key} className="space-y-1">
              <Label htmlFor={`cr-${f.key}`} className="text-xs">
                {isRTL ? f.ar : f.en}
              </Label>
              <Input
                id={`cr-${f.key}`}
                type={'type' in f ? f.type : 'text'}
                value={form[f.key as keyof typeof form] || ''}
                onChange={(e) =>
                  setForm((s) => ({ ...s, [f.key]: e.target.value }))
                }
                placeholder={f.placeholder}
                dir="auto"
                className="tech-content"
              />
            </div>
          ))}
        </div>

        {/* Save */}
        <div className="flex items-center justify-end gap-2 pt-1">
          <Button
            onClick={() => saveMut.mutate()}
            disabled={saveMut.isPending || busy !== 'idle'}
            className="gap-1"
          >
            {saveMut.isPending || busy === 'uploading' ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Save className="h-4 w-4" />
            )}
            {file
              ? (isRTL ? 'رفع وحفظ البيانات' : 'Upload & save')
              : (isRTL ? 'حفظ البيانات' : 'Save data')}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
};

export default CrDocumentScanner;