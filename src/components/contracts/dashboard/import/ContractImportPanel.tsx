/**
 * ContractImportPanel — inline (no popup) panel for uploading a paper/PDF
 * contract and converting it to a digital draft via AI.
 *
 * Flow:
 *   1. User drags/picks a file (PDF, JPG/PNG, DOCX, TXT).
 *   2. We call the `analyze-contract-document` edge function (Lovable AI).
 *   3. Extracted fields are shown in an editable review card.
 *   4. Two CTAs: "Continue editing in form" and "Save directly as draft".
 *
 * Strictly no dialogs — fully inline per project UX policy.
 */
import { useCallback, useMemo, useRef, useState } from 'react';
import {
  FileText, FileUp, Loader2, Sparkles, X, CheckCircle2, AlertTriangle,
  FileSearch, Building2, User, Calendar, Receipt, ListChecks, Ruler,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import type { ContractForm } from '@/components/contracts/dashboard/create/contract-form-types';

const MAX_FILE_MB = 10;
const ACCEPTED = '.pdf,.png,.jpg,.jpeg,.webp,.txt,.docx,application/pdf,image/*,text/plain';

interface PartyExtract {
  name?: string; cr_number?: string; vat_number?: string;
  address?: string; phone?: string; email?: string;
}
interface ClauseExtract { title?: string; body?: string }
interface LineItemExtract {
  description?: string; quantity?: number; unit?: string; unit_price?: number; total?: number;
}
interface MeasurementExtract {
  label?: string; width_mm?: number; height_mm?: number; quantity?: number; notes?: string;
}
export interface ContractExtract {
  title_ar?: string; title_en?: string;
  description_ar?: string; description_en?: string;
  provider?: PartyExtract;
  client?: PartyExtract;
  total_amount?: number; currency_code?: string;
  vat_inclusive?: boolean; vat_rate?: number;
  start_date?: string; end_date?: string;
  supervisor?: { name?: string; phone?: string; email?: string };
  terms_ar?: string; terms_en?: string;
  clauses?: ClauseExtract[];
  line_items?: LineItemExtract[];
  measurements?: MeasurementExtract[];
  confidence?: number;
  summary_ar?: string; summary_en?: string;
}

export interface ContractImportPanelProps {
  isRTL: boolean;
  onApplyToForm: (form: Partial<ContractForm>, extract: ContractExtract) => void;
  onSaveDraft: (form: Partial<ContractForm>, extract: ContractExtract) => void | Promise<void>;
  onCancel: () => void;
  isSavingDraft?: boolean;
}

function fileToBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const result = reader.result as string;
      const idx = result.indexOf(',');
      resolve(idx >= 0 ? result.slice(idx + 1) : result);
    };
    reader.onerror = () => reject(reader.error);
    reader.readAsDataURL(file);
  });
}

function fileToText(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result ?? ''));
    reader.onerror = () => reject(reader.error);
    reader.readAsText(file, 'utf-8');
  });
}

function buildForm(e: ContractExtract): Partial<ContractForm> {
  return {
    title_ar: e.title_ar ?? '',
    title_en: e.title_en ?? '',
    description_ar: e.description_ar ?? '',
    description_en: e.description_en ?? '',
    total_amount: e.total_amount != null && !Number.isNaN(Number(e.total_amount))
      ? String(e.total_amount) : '',
    currency_code: e.currency_code || 'SAR',
    start_date: e.start_date ?? '',
    end_date: e.end_date ?? '',
    terms_ar: e.terms_ar ?? '',
    terms_en: e.terms_en ?? '',
    supervisor_name: e.supervisor?.name ?? '',
    supervisor_phone: e.supervisor?.phone ?? '',
    supervisor_email: e.supervisor?.email ?? '',
    client_email: e.client?.email ?? '',
    vat_inclusive: !!e.vat_inclusive,
    vat_rate: e.vat_rate != null ? String(e.vat_rate) : '15',
  };
}

export function ContractImportPanel({
  isRTL, onApplyToForm, onSaveDraft, onCancel, isSavingDraft,
}: ContractImportPanelProps) {
  const [file, setFile] = useState<File | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [extract, setExtract] = useState<ContractExtract | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const fileSizeOk = useMemo(() => !file || file.size <= MAX_FILE_MB * 1024 * 1024, [file]);

  const handleAnalyze = useCallback(async () => {
    if (!file) return;
    if (!fileSizeOk) {
      toast.error(isRTL ? `الملف أكبر من ${MAX_FILE_MB} ميغابايت` : `File exceeds ${MAX_FILE_MB} MB`);
      return;
    }
    setIsAnalyzing(true);
    setErrorMsg(null);
    setExtract(null);
    try {
      const isText = file.type.startsWith('text/') || /\.txt$/i.test(file.name);
      const isDocx = /\.docx$/i.test(file.name) ||
        file.type === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document';
      if (isDocx) {
        setErrorMsg(isRTL
          ? 'ملفات Word غير مدعومة مباشرة. الرجاء حفظ الملف بصيغة PDF ثم إعادة الرفع.'
          : 'Word files are not supported directly. Please export to PDF and re-upload.');
        setIsAnalyzing(false);
        return;
      }
      const payload: Record<string, unknown> = {
        filename: file.name,
        locale: isRTL ? 'ar' : 'en',
      };
      if (isText) {
        payload.raw_text = await fileToText(file);
      } else {
        payload.file_base64 = await fileToBase64(file);
        payload.mime_type = file.type || 'application/pdf';
      }
      const { data, error } = await supabase.functions.invoke('analyze-contract-document', {
        body: payload,
      });
      if (error) throw error;
      const r = data as { ok?: boolean; data?: ContractExtract; error?: string; hint?: string };
      if (!r?.ok) {
        const msg = r?.hint || r?.error || 'unknown_error';
        const friendly = (() => {
          switch (r?.error) {
            case 'rate_limited':
              return isRTL ? 'تم تجاوز الحد المسموح، حاول لاحقاً.' : 'Rate limited, try again shortly.';
            case 'credits_exhausted':
              return isRTL ? 'انتهى رصيد الذكاء الاصطناعي.' : 'AI credits exhausted.';
            case 'file_too_large':
              return isRTL ? 'الملف كبير جداً (الحد 10 ميغابايت).' : 'File too large (10 MB max).';
            case 'parse_failed':
              return isRTL ? 'تعذّر استخراج البيانات. جرّب ملفاً أوضح.' : 'Could not parse extraction. Try a clearer file.';
            default:
              return msg;
          }
        })();
        setErrorMsg(friendly);
        return;
      }
      setExtract(r.data ?? {});
      toast.success(isRTL ? 'تم تحليل العقد بنجاح' : 'Contract analyzed');
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      setErrorMsg(msg);
    } finally {
      setIsAnalyzing(false);
    }
  }, [file, fileSizeOk, isRTL]);

  const updateExtract = <K extends keyof ContractExtract>(k: K, v: ContractExtract[K]) => {
    setExtract((prev) => (prev ? { ...prev, [k]: v } : prev));
  };
  const updateParty = (key: 'provider' | 'client', field: keyof PartyExtract, v: string) => {
    setExtract((prev) => (prev ? { ...prev, [key]: { ...(prev[key] ?? {}), [field]: v } } : prev));
  };

  const confidencePct = extract?.confidence != null ? Math.round(extract.confidence * 100) : null;

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="rounded-2xl border border-border/50 bg-gradient-to-br from-card via-card to-accent/[0.04] p-4 sm:p-5">
        <div className="flex items-start justify-between gap-3 flex-wrap">
          <div className="flex items-start gap-3 min-w-0">
            <div className="w-11 h-11 rounded-2xl bg-gradient-to-br from-accent to-accent/70 flex items-center justify-center shadow-lg shadow-accent/30 shrink-0">
              <FileSearch className="w-5 h-5 text-accent-foreground" />
            </div>
            <div className="min-w-0">
              <h2 className="font-heading font-bold text-lg sm:text-xl leading-tight">
                {isRTL ? 'استيراد عقد وتحويله رقمياً' : 'Import & Digitize Contract'}
              </h2>
              <p className="text-[11px] sm:text-xs text-muted-foreground mt-0.5">
                {isRTL
                  ? 'ارفع نسخة العقد (PDF / صورة / نص) وسيقوم الذكاء الاصطناعي باستخراج الأطراف والبنود والبيانات المالية تلقائياً.'
                  : 'Upload the contract (PDF / image / text) and AI will extract parties, clauses, and financial details automatically.'}
              </p>
            </div>
          </div>
          <Button variant="outline" size="sm" className="h-9 gap-1.5 text-xs" onClick={onCancel}>
            <X className="w-3.5 h-3.5" />
            {isRTL ? 'رجوع' : 'Back'}
          </Button>
        </div>
      </div>

      {/* Upload zone */}
      {!extract && (
        <div
          className={`relative rounded-2xl border-2 border-dashed transition-colors p-6 sm:p-10 text-center ${
            isDragging ? 'border-accent bg-accent/5' : 'border-border/60 bg-muted/20 hover:bg-muted/30'
          }`}
          onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
          onDragLeave={() => setIsDragging(false)}
          onDrop={(e) => {
            e.preventDefault();
            setIsDragging(false);
            const f = e.dataTransfer.files?.[0];
            if (f) { setFile(f); setErrorMsg(null); }
          }}
        >
          <input
            ref={fileInputRef}
            type="file"
            accept={ACCEPTED}
            className="hidden"
            onChange={(e) => {
              const f = e.target.files?.[0];
              if (f) { setFile(f); setErrorMsg(null); }
            }}
          />
          <div className="mx-auto w-12 h-12 rounded-2xl bg-accent/10 text-accent flex items-center justify-center mb-3">
            <FileUp className="w-6 h-6" />
          </div>
          {file ? (
            <div className="space-y-2">
              <div className="flex items-center justify-center gap-2 text-sm font-semibold">
                <FileText className="w-4 h-4 text-accent" />
                <span className="truncate max-w-[260px] sm:max-w-[420px]">{file.name}</span>
              </div>
              <div className="text-[11px] text-muted-foreground tech-content">
                {(file.size / 1024).toFixed(1)} KB · {file.type || (isRTL ? 'غير معروف' : 'unknown')}
              </div>
              {!fileSizeOk && (
                <div className="text-[11px] text-destructive">
                  {isRTL ? `أكبر من ${MAX_FILE_MB} ميغابايت` : `Exceeds ${MAX_FILE_MB} MB`}
                </div>
              )}
              <div className="flex items-center justify-center gap-2 pt-2">
                <Button variant="outline" size="sm" onClick={() => fileInputRef.current?.click()} className="h-9 text-xs">
                  {isRTL ? 'تغيير الملف' : 'Change file'}
                </Button>
                <Button
                  variant="hero"
                  size="sm"
                  className="h-9 gap-1.5 text-xs"
                  onClick={handleAnalyze}
                  disabled={isAnalyzing || !fileSizeOk}
                >
                  {isAnalyzing ? (
                    <><Loader2 className="w-3.5 h-3.5 animate-spin" />{isRTL ? 'جاري التحليل…' : 'Analyzing…'}</>
                  ) : (
                    <><Sparkles className="w-3.5 h-3.5" />{isRTL ? 'تحليل العقد' : 'Analyze contract'}</>
                  )}
                </Button>
              </div>
            </div>
          ) : (
            <>
              <div className="text-sm font-semibold">
                {isRTL ? 'اسحب ملف العقد هنا أو اضغط لاختياره' : 'Drag the contract file here or click to choose'}
              </div>
              <div className="text-[11px] text-muted-foreground mt-1">
                {isRTL
                  ? `PDF · JPG / PNG · TXT (حتى ${MAX_FILE_MB} م.ب) — ملفات Word: حوّلها لـ PDF أولاً`
                  : `PDF · JPG / PNG · TXT (up to ${MAX_FILE_MB} MB) — Word: export to PDF first`}
              </div>
              <Button
                variant="outline"
                size="sm"
                className="mt-4 h-9 text-xs gap-1.5"
                onClick={() => fileInputRef.current?.click()}
              >
                <FileUp className="w-3.5 h-3.5" />
                {isRTL ? 'اختيار ملف' : 'Choose file'}
              </Button>
            </>
          )}

          {errorMsg && (
            <div className="mt-4 mx-auto max-w-md rounded-lg border border-destructive/40 bg-destructive/5 p-3 flex items-start gap-2 text-start">
              <AlertTriangle className="w-4 h-4 text-destructive shrink-0 mt-0.5" />
              <p className="text-xs text-destructive leading-relaxed">{errorMsg}</p>
            </div>
          )}
        </div>
      )}

      {/* Extracted review */}
      {extract && (
        <div className="space-y-4">
          <div className="rounded-2xl border border-success/40 bg-success/5 p-3 sm:p-4 flex items-center justify-between gap-3 flex-wrap">
            <div className="flex items-center gap-2 min-w-0">
              <CheckCircle2 className="w-4 h-4 text-success shrink-0" />
              <p className="text-xs sm:text-sm font-semibold">
                {isRTL ? 'تم استخراج البيانات — راجعها وعدّلها قبل الإنشاء' : 'Extraction complete — review & edit before creating'}
              </p>
            </div>
            <div className="flex items-center gap-2">
              {confidencePct != null && (
                <Badge variant={confidencePct >= 70 ? 'default' : 'secondary'} className="text-[10px]">
                  {isRTL ? `الثقة ${confidencePct}%` : `Confidence ${confidencePct}%`}
                </Badge>
              )}
              <Button
                variant="ghost"
                size="sm"
                className="h-8 text-[11px]"
                onClick={() => { setExtract(null); setFile(null); }}
              >
                {isRTL ? 'ملف آخر' : 'Another file'}
              </Button>
            </div>
          </div>

          {/* Title + summary */}
          <Section icon={<FileText className="w-4 h-4" />} title={isRTL ? 'عنوان العقد' : 'Contract title'}>
            <div className="grid sm:grid-cols-2 gap-3">
              <FieldGroup label={isRTL ? 'العنوان (عربي)' : 'Title (Arabic)'}>
                <Input dir="auto" value={extract.title_ar ?? ''} onChange={(e) => updateExtract('title_ar', e.target.value)} className="h-10" />
              </FieldGroup>
              <FieldGroup label={isRTL ? 'العنوان (إنجليزي)' : 'Title (English)'}>
                <Input dir="auto" value={extract.title_en ?? ''} onChange={(e) => updateExtract('title_en', e.target.value)} className="h-10" />
              </FieldGroup>
            </div>
            {(extract.summary_ar || extract.summary_en) && (
              <FieldGroup label={isRTL ? 'ملخص العقد' : 'Summary'}>
                <Textarea
                  dir="auto"
                  rows={2}
                  value={isRTL ? (extract.summary_ar ?? '') : (extract.summary_en ?? extract.summary_ar ?? '')}
                  onChange={(e) => updateExtract(isRTL ? 'summary_ar' : 'summary_en', e.target.value)}
                  className="text-xs"
                />
              </FieldGroup>
            )}
          </Section>

          {/* Parties */}
          <div className="grid lg:grid-cols-2 gap-3">
            <PartyCard
              icon={<Building2 className="w-4 h-4" />}
              title={isRTL ? 'بيانات المنشأة (المزوّد)' : 'Provider (Business)'}
              party={extract.provider ?? {}}
              onChange={(f, v) => updateParty('provider', f, v)}
              isRTL={isRTL}
            />
            <PartyCard
              icon={<User className="w-4 h-4" />}
              title={isRTL ? 'بيانات العميل' : 'Client'}
              party={extract.client ?? {}}
              onChange={(f, v) => updateParty('client', f, v)}
              isRTL={isRTL}
            />
          </div>

          {/* Financial + dates */}
          <Section icon={<Receipt className="w-4 h-4" />} title={isRTL ? 'البيانات المالية والزمنية' : 'Financial & timeline'}>
            <div className="grid sm:grid-cols-3 gap-3">
              <FieldGroup label={isRTL ? 'القيمة الإجمالية' : 'Total amount'}>
                <Input
                  type="number" inputMode="decimal" className="h-10 tech-content"
                  value={extract.total_amount ?? ''}
                  onChange={(e) => updateExtract('total_amount', Number(e.target.value) || 0)}
                />
              </FieldGroup>
              <FieldGroup label={isRTL ? 'العملة' : 'Currency'}>
                <Input
                  className="h-10 tech-content uppercase"
                  value={extract.currency_code ?? 'SAR'}
                  onChange={(e) => updateExtract('currency_code', e.target.value.toUpperCase())}
                />
              </FieldGroup>
              <FieldGroup label={isRTL ? 'نسبة الضريبة %' : 'VAT rate %'}>
                <Input
                  type="number" className="h-10 tech-content"
                  value={extract.vat_rate ?? 15}
                  onChange={(e) => updateExtract('vat_rate', Number(e.target.value) || 0)}
                />
              </FieldGroup>
              <FieldGroup label={isRTL ? 'تاريخ البداية' : 'Start date'}>
                <Input type="date" className="h-10 tech-content" value={extract.start_date ?? ''} onChange={(e) => updateExtract('start_date', e.target.value)} />
              </FieldGroup>
              <FieldGroup label={isRTL ? 'تاريخ النهاية' : 'End date'}>
                <Input type="date" className="h-10 tech-content" value={extract.end_date ?? ''} onChange={(e) => updateExtract('end_date', e.target.value)} />
              </FieldGroup>
              <FieldGroup label={isRTL ? 'شامل الضريبة' : 'VAT inclusive'}>
                <select
                  className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
                  value={extract.vat_inclusive ? '1' : '0'}
                  onChange={(e) => updateExtract('vat_inclusive', e.target.value === '1')}
                >
                  <option value="0">{isRTL ? 'غير شامل' : 'Exclusive'}</option>
                  <option value="1">{isRTL ? 'شامل' : 'Inclusive'}</option>
                </select>
              </FieldGroup>
            </div>
          </Section>

          {/* Clauses */}
          {extract.clauses && extract.clauses.length > 0 && (
            <Section icon={<ListChecks className="w-4 h-4" />} title={`${isRTL ? 'البنود' : 'Clauses'} (${extract.clauses.length})`}>
              <ol className="space-y-2 list-decimal ps-5">
                {extract.clauses.map((c, i) => (
                  <li key={i} className="text-xs leading-relaxed">
                    {c.title && <div className="font-semibold mb-0.5" dir="auto">{c.title}</div>}
                    <div className="text-muted-foreground whitespace-pre-wrap" dir="auto">{c.body}</div>
                  </li>
                ))}
              </ol>
            </Section>
          )}

          {/* Line items */}
          {extract.line_items && extract.line_items.length > 0 && (
            <Section icon={<Calendar className="w-4 h-4" />} title={`${isRTL ? 'بنود الأعمال (BOQ)' : 'Line items (BOQ)'} (${extract.line_items.length})`}>
              <div className="overflow-x-auto -mx-3 px-3">
                <table className="w-full text-xs">
                  <thead className="text-muted-foreground">
                    <tr className="border-b border-border/40">
                      <th className="text-start py-1.5 ps-1">{isRTL ? 'الوصف' : 'Description'}</th>
                      <th className="text-end py-1.5">{isRTL ? 'الكمية' : 'Qty'}</th>
                      <th className="text-end py-1.5">{isRTL ? 'الوحدة' : 'Unit'}</th>
                      <th className="text-end py-1.5">{isRTL ? 'السعر' : 'Unit price'}</th>
                      <th className="text-end py-1.5 pe-1">{isRTL ? 'الإجمالي' : 'Total'}</th>
                    </tr>
                  </thead>
                  <tbody>
                    {extract.line_items.map((li, i) => (
                      <tr key={i} className="border-b border-border/20">
                        <td className="py-1.5 ps-1" dir="auto">{li.description}</td>
                        <td className="py-1.5 text-end tech-content">{li.quantity ?? '—'}</td>
                        <td className="py-1.5 text-end" dir="auto">{li.unit ?? '—'}</td>
                        <td className="py-1.5 text-end tech-content">{li.unit_price ?? '—'}</td>
                        <td className="py-1.5 text-end pe-1 tech-content">{li.total ?? '—'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </Section>
          )}

          {/* Measurements */}
          {extract.measurements && extract.measurements.length > 0 && (
            <Section icon={<Ruler className="w-4 h-4" />} title={`${isRTL ? 'المقاسات الفنية' : 'Measurements'} (${extract.measurements.length})`}>
              <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-2">
                {extract.measurements.map((m, i) => (
                  <div key={i} className="rounded-lg border border-border/40 p-2 text-[11px]">
                    <div className="font-semibold" dir="auto">{m.label || `#${i + 1}`}</div>
                    <div className="text-muted-foreground tech-content">
                      {m.width_mm ?? '—'} × {m.height_mm ?? '—'} mm · ×{m.quantity ?? 1}
                    </div>
                    {m.notes && <div className="text-muted-foreground mt-0.5" dir="auto">{m.notes}</div>}
                  </div>
                ))}
              </div>
            </Section>
          )}

          {/* Terms */}
          {(extract.terms_ar || extract.terms_en) && (
            <Section icon={<FileText className="w-4 h-4" />} title={isRTL ? 'الشروط' : 'Terms'}>
              <Textarea
                dir="auto"
                rows={4}
                value={isRTL ? (extract.terms_ar ?? '') : (extract.terms_en ?? extract.terms_ar ?? '')}
                onChange={(e) => updateExtract(isRTL ? 'terms_ar' : 'terms_en', e.target.value)}
                className="text-xs"
              />
            </Section>
          )}

          <Separator />

          {/* CTAs */}
          <div className="flex flex-wrap items-center justify-end gap-2 pb-2">
            <Button variant="ghost" size="sm" className="h-10 text-xs" onClick={() => { setExtract(null); setFile(null); }}>
              {isRTL ? 'إعادة' : 'Reset'}
            </Button>
            <Button
              variant="outline"
              size="sm"
              className="h-10 text-xs gap-1.5"
              disabled={isSavingDraft}
              onClick={() => onSaveDraft(buildForm(extract), extract)}
            >
              {isSavingDraft ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <FileText className="w-3.5 h-3.5" />}
              {isRTL ? 'حفظ مباشر كمسودة' : 'Save as draft'}
            </Button>
            <Button
              variant="hero"
              size="sm"
              className="h-10 text-xs gap-1.5"
              onClick={() => onApplyToForm(buildForm(extract), extract)}
            >
              <Sparkles className="w-3.5 h-3.5" />
              {isRTL ? 'متابعة وتعديل في نموذج العقد' : 'Continue & edit in form'}
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}

/* ───────────── helpers ───────────── */

function Section({
  icon, title, children,
}: { icon: React.ReactNode; title: string; children: React.ReactNode }) {
  return (
    <div className="rounded-2xl border border-border/50 bg-card p-3 sm:p-4 space-y-3">
      <div className="flex items-center gap-2 text-sm font-semibold">
        <span className="text-accent">{icon}</span>
        <span>{title}</span>
      </div>
      {children}
    </div>
  );
}

function FieldGroup({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="space-y-1">
      <Label className="text-[11px] text-muted-foreground">{label}</Label>
      {children}
    </div>
  );
}

function PartyCard({
  icon, title, party, onChange, isRTL,
}: {
  icon: React.ReactNode;
  title: string;
  party: PartyExtract;
  onChange: (field: keyof PartyExtract, value: string) => void;
  isRTL: boolean;
}) {
  return (
    <Section icon={icon} title={title}>
      <div className="grid sm:grid-cols-2 gap-2.5">
        <FieldGroup label={isRTL ? 'الاسم / الجهة' : 'Name / Entity'}>
          <Input dir="auto" value={party.name ?? ''} onChange={(e) => onChange('name', e.target.value)} className="h-9 text-xs" />
        </FieldGroup>
        <FieldGroup label={isRTL ? 'البريد الإلكتروني' : 'Email'}>
          <Input type="email" className="h-9 text-xs tech-content" value={party.email ?? ''} onChange={(e) => onChange('email', e.target.value)} />
        </FieldGroup>
        <FieldGroup label={isRTL ? 'الجوال' : 'Phone'}>
          <Input className="h-9 text-xs tech-content" value={party.phone ?? ''} onChange={(e) => onChange('phone', e.target.value)} />
        </FieldGroup>
        <FieldGroup label={isRTL ? 'السجل التجاري' : 'CR number'}>
          <Input className="h-9 text-xs tech-content" value={party.cr_number ?? ''} onChange={(e) => onChange('cr_number', e.target.value)} />
        </FieldGroup>
        <FieldGroup label={isRTL ? 'الرقم الضريبي' : 'VAT number'}>
          <Input className="h-9 text-xs tech-content" value={party.vat_number ?? ''} onChange={(e) => onChange('vat_number', e.target.value)} />
        </FieldGroup>
        <FieldGroup label={isRTL ? 'العنوان' : 'Address'}>
          <Input dir="auto" className="h-9 text-xs" value={party.address ?? ''} onChange={(e) => onChange('address', e.target.value)} />
        </FieldGroup>
      </div>
    </Section>
  );
}