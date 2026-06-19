/**
 * IntakeBatchStepper — single-page complete cycle for provider intake.
 *
 *   1) Upload Excel  →  2) Results table (validate + dedupe per row)  →
 *   3) Approve & Submit to provider_leads  →  navigate to /admin/provider-leads
 *
 * Consolidates the old `IntakeWizardGuide` table + `IntakeRowPreviewBanner`
 * per-row navigator into one inline flow with NO popups and NO duplicate
 * surfaces. All writes go through the existing `submit_provider_lead` RPC.
 */
import React from 'react';
import { toast } from 'sonner';
import { useNavigate } from 'react-router-dom';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import {
  Upload,
  Table as TableIcon,
  Send,
  CheckCircle2,
  AlertTriangle,
  Loader2,
  ArrowRight,
  RefreshCw,
  Search,
} from 'lucide-react';
import { Bi } from '@/components/common/Bilingual';
import { supabase } from '@/integrations/supabase/client';
import type { Json } from '@/integrations/supabase/types';
import {
  INTAKE_AUDIT_EVENT,
  intakeRowName,
} from '@/lib/intakeQueue';

type Kind = 'providers' | 'branches' | 'unknown';
type RowStatus = 'pending' | 'submitting' | 'created' | 'duplicate' | 'invalid' | 'failed';

interface ParsedRow {
  raw: Record<string, string>;
  validation: string[];          // missing-field reasons
  status: RowStatus;
  resultMessage?: string;
}

interface ParsedFile {
  fileName: string;
  kind: Kind;
  headers: string[];
  rows: ParsedRow[];
}

type LeadPayload = {
  name_ar: string;
  name_en: string | null;
  contact_name: string;
  email: string;
  phone: string;
  preferred_channel: string;
  website: string | null;
  cr_number: string | null;
  unified_number: string | null;
  main_activity: string | null;
  brief: string | null;
  city: string | null;
  national_address: string | null;
  map_link: string | null;
};

function rowToPayload(r: Record<string, string>): { payload: LeadPayload | null; missing: string[] } {
  const missing: string[] = [];
  const nameAr = (r.company_name_ar ?? r.branch_name_ar ?? '').trim();
  const nameEn = (r.company_name_en ?? r.branch_name_en ?? '').trim() || null;
  const contactName =
    (r.account_manager_name ?? r.contact_name ?? '').trim() || nameAr || nameEn || '';
  const email = (r.account_manager_email ?? r.email ?? r.branch_email ?? '').trim().toLowerCase();
  const phoneRaw = (r.account_manager_phone ?? r.phone ?? r.branch_phone ?? '').trim();
  const phoneDigits = phoneRaw.replace(/\D/g, '');

  if (!nameAr || nameAr.length < 2) missing.push('name_ar');
  if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) missing.push('email');
  if (phoneDigits.length < 7 || phoneDigits.length > 15) missing.push('phone');
  if (missing.length) return { payload: null, missing };

  return {
    payload: {
      name_ar: nameAr.slice(0, 200),
      name_en: nameEn,
      contact_name: (contactName || 'Admin Intake').slice(0, 200),
      email,
      phone: phoneRaw.slice(0, 20),
      preferred_channel: 'phone',
      website: (r.website ?? '').trim() || null,
      cr_number: (r.commercial_registration ?? r.cr_number ?? '').trim() || null,
      unified_number: (r.unified_number ?? '').trim() || null,
      main_activity: (r.services ?? r.sector ?? '').trim() || null,
      brief: (r.notes ?? '').trim().slice(0, 2000) || null,
      city: (r.city ?? '').trim() || null,
      national_address: (r.national_short_address ?? r.street_address ?? '').trim() || null,
      map_link: (r.google_maps_url ?? '').trim() || null,
    },
    missing: [],
  };
}

function inferKind(headers: string[]): Kind {
  if (headers.includes('branch_name_ar') || headers.includes('branch_phone')) return 'branches';
  if (headers.includes('company_name_en') || headers.includes('account_manager_email')) return 'providers';
  return 'unknown';
}

const KEY_COLS = [
  'company_name_ar',
  'branch_name_ar',
  'unified_number',
  'city',
  'email',
  'phone',
];

type Step = 'upload' | 'review' | 'done';

export const IntakeBatchStepper: React.FC<{ className?: string }> = ({ className }) => {
  const navigate = useNavigate();
  const [step, setStep] = React.useState<Step>('upload');
  const [parsed, setParsed] = React.useState<ParsedFile | null>(null);
  const [selected, setSelected] = React.useState<Set<number>>(new Set());
  const [busy, setBusy] = React.useState(false);
  const [parseError, setParseError] = React.useState<string | null>(null);

  const handleUpload = React.useCallback(async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.currentTarget.files?.[0];
    e.currentTarget.value = '';
    if (!file) return;
    setParseError(null);
    try {
      const XLSX = await import('xlsx');
      const wb = XLSX.read(await file.arrayBuffer(), { type: 'array' });
      const sheetName = wb.SheetNames[0];
      if (!sheetName) throw new Error('empty workbook');
      const matrix = XLSX.utils.sheet_to_json<unknown[]>(wb.Sheets[sheetName], {
        header: 1,
        blankrows: false,
      });
      const headers = (matrix[0] ?? []).map((v) => String(v).trim()).filter(Boolean);
      const kind = inferKind(headers);
      const rows: ParsedRow[] = (matrix.slice(1) as unknown[][])
        .map((row) => {
          const raw: Record<string, string> = {};
          headers.forEach((h, i) => {
            const v = row?.[i];
            raw[h] = v === undefined || v === null ? '' : String(v).trim();
          });
          return raw;
        })
        .filter((r) => Object.values(r).some((v) => v !== ''))
        .map((raw) => {
          const { missing } = rowToPayload(raw);
          return {
            raw,
            validation: missing,
            status: 'pending' as RowStatus,
          };
        });
      const next: ParsedFile = { fileName: file.name, kind, headers, rows };
      setParsed(next);
      // Auto-select all valid rows.
      const initial = new Set<number>();
      rows.forEach((r, i) => {
        if (r.validation.length === 0) initial.add(i);
      });
      setSelected(initial);
      setStep('review');
      toast.success(`تم تحميل ${rows.length} صف — ${initial.size} صالح للإرسال`);
    } catch (err: unknown) {
      setParseError(err instanceof Error ? err.message : 'Unable to read file');
    }
  }, []);

  const toggleRow = (i: number) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(i)) next.delete(i);
      else next.add(i);
      return next;
    });
  };

  const toggleAll = () => {
    if (!parsed) return;
    const selectableIdx = parsed.rows
      .map((r, i) => (r.status === 'created' || r.status === 'submitting' ? -1 : i))
      .filter((i) => i >= 0);
    setSelected((prev) =>
      prev.size === selectableIdx.length ? new Set() : new Set(selectableIdx),
    );
  };

  const auditRow = (row: Record<string, string>, idx: number) => {
    const name = intakeRowName(row);
    if (!name) {
      toast.error('الصف يفتقد اسم المنشأة');
      return;
    }
    if (typeof window !== 'undefined') {
      window.dispatchEvent(
        new CustomEvent(INTAKE_AUDIT_EVENT, {
          detail: { name, query: name, row, index: idx, total: parsed?.rows.length ?? 1 },
        }),
      );
      const target = document.querySelector('[data-intake-workspace]');
      target?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  };

  const submitOne = async (idx: number): Promise<RowStatus> => {
    if (!parsed) return 'failed';
    const r = parsed.rows[idx];
    const { payload } = rowToPayload(r.raw);
    if (!payload) return 'invalid';
    const { error } = await supabase.rpc('submit_provider_lead', {
      payload: payload as unknown as Json,
    });
    if (!error) return 'created';
    if (/duplicate_request/i.test(error.message)) return 'duplicate';
    return 'failed';
  };

  const setRowStatus = (idx: number, status: RowStatus, msg?: string) => {
    setParsed((p) => {
      if (!p) return p;
      const rows = [...p.rows];
      rows[idx] = { ...rows[idx], status, resultMessage: msg };
      return { ...p, rows };
    });
  };

  const submitBatch = async () => {
    if (!parsed || busy) return;
    const targets = Array.from(selected).sort((a, b) => a - b);
    if (targets.length === 0) {
      toast('اختر صفًا واحدًا على الأقل');
      return;
    }
    setBusy(true);
    let created = 0;
    let duplicates = 0;
    let invalid = 0;
    let failed = 0;
    for (const idx of targets) {
      setRowStatus(idx, 'submitting');
      const status = await submitOne(idx);
      setRowStatus(idx, status);
      if (status === 'created') created += 1;
      else if (status === 'duplicate') duplicates += 1;
      else if (status === 'invalid') invalid += 1;
      else failed += 1;
    }
    setBusy(false);
    const summary =
      `تم: ${created} إنشاء` +
      (duplicates ? ` · ${duplicates} مكرر` : '') +
      (invalid ? ` · ${invalid} ناقص` : '') +
      (failed ? ` · ${failed} فشل` : '');
    if (created > 0 || duplicates > 0) {
      toast.success(summary);
      setStep('done');
    } else {
      toast.error(summary);
    }
  };

  const reset = () => {
    setParsed(null);
    setSelected(new Set());
    setStep('upload');
    setParseError(null);
  };

  const steps: Array<{ id: Step; ar: string; en: string; icon: React.ComponentType<{ className?: string }> }> = [
    { id: 'upload', ar: '١. رفع الملف', en: '1. Upload', icon: Upload },
    { id: 'review', ar: '٢. جدول النتائج والاعتماد', en: '2. Review & Approve', icon: TableIcon },
    { id: 'done', ar: '٣. حفظ في العملاء المحتملين', en: '3. Saved to Leads', icon: CheckCircle2 },
  ];

  return (
    <Card data-testid="intake-batch-stepper" className={`mb-5 p-4 ${className ?? ''}`}>
      <div className="mb-4 flex items-center justify-between gap-2">
        <div>
          <h2 className="text-sm font-bold">
            <Bi ar="دورة استيراد كاملة — Excel إلى العملاء المحتملين" en="Full intake cycle — Excel to Provider Leads" />
          </h2>
          <p className="text-[11px] text-muted-foreground">
            <Bi
              ar="ارفع الملف، راجع النتائج في الجدول، ثم اعتمد لحفظها في قائمة العملاء المحتملين."
              en="Upload, review results in the table, then approve to save to Provider Leads."
            />
          </p>
        </div>
        {parsed && (
          <Button type="button" size="sm" variant="ghost" onClick={reset} className="h-8 rounded-lg text-[11px]">
            <RefreshCw className="me-1 h-3 w-3" aria-hidden />
            <Bi ar="ابدأ من جديد" en="Start over" />
          </Button>
        )}
      </div>

      <ol className="mb-4 grid grid-cols-3 gap-2">
        {steps.map((s) => {
          const Icon = s.icon;
          const active = s.id === step;
          const done = (s.id === 'upload' && step !== 'upload') || (s.id === 'review' && step === 'done');
          return (
            <li
              key={s.id}
              className={`flex items-center gap-2 rounded-xl border p-2.5 ${
                active ? 'border-primary bg-primary/5' : done ? 'border-emerald-200 bg-emerald-50/40' : 'border-border bg-muted/20'
              }`}
            >
              <span
                className={`inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-full ${
                  active ? 'bg-primary text-primary-foreground' : done ? 'bg-emerald-500 text-white' : 'bg-muted text-muted-foreground'
                }`}
              >
                <Icon className="h-3.5 w-3.5" aria-hidden />
              </span>
              <span className={`text-[11px] font-semibold ${active ? 'text-primary' : ''}`}>
                <Bi ar={s.ar} en={s.en} />
              </span>
            </li>
          );
        })}
      </ol>

      {/* STEP 1: UPLOAD */}
      {step === 'upload' && (
        <div className="rounded-xl border border-dashed bg-background p-4">
          <Label htmlFor="intake-batch-upload" className="mb-2 flex items-center gap-2 text-xs font-semibold">
            <Upload className="h-3.5 w-3.5 text-primary" aria-hidden />
            <Bi ar="ارفع ملف Excel (.xlsx) لقالب المزودين أو الفروع" en="Upload Excel (.xlsx) for providers or branches template" />
          </Label>
          <Input
            id="intake-batch-upload"
            data-testid="intake-batch-upload"
            type="file"
            accept=".xlsx,.xls,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
            onChange={handleUpload}
            className="h-11 rounded-xl text-xs"
          />
          {parseError && (
            <p className="mt-2 flex items-center gap-1.5 text-[11px] text-destructive">
              <AlertTriangle className="h-3 w-3" aria-hidden />
              <Bi ar="تعذر قراءة الملف" en="Could not read file" />: <span className="tech-content">{parseError}</span>
            </p>
          )}
        </div>
      )}

      {/* STEP 2: REVIEW TABLE */}
      {step === 'review' && parsed && (
        <div className="space-y-3">
          <div className="flex flex-wrap items-center gap-2 rounded-xl border bg-muted/30 p-2.5">
            <Badge variant="outline" className="bg-primary/10 text-primary border-primary/30 text-[10px]">
              <Bi ar={parsed.kind === 'branches' ? 'قالب فروع' : parsed.kind === 'providers' ? 'قالب مزودين' : 'نوع غير معروف'} en={parsed.kind} />
            </Badge>
            <span className="text-[11px] tech-content">{parsed.fileName}</span>
            <span className="text-[11px] text-muted-foreground">
              <Bi ar={`${parsed.rows.length} صف`} en={`${parsed.rows.length} rows`} />
            </span>
            <span className="ms-auto text-[11px] font-semibold text-emerald-700">
              <Bi ar={`المحدد: ${selected.size}`} en={`Selected: ${selected.size}`} />
            </span>
            <Button
              type="button"
              size="sm"
              onClick={submitBatch}
              disabled={busy || selected.size === 0}
              data-testid="intake-batch-submit"
              className="h-9 rounded-xl text-[11px]"
            >
              {busy ? (
                <Loader2 className="me-1 h-3.5 w-3.5 animate-spin" aria-hidden />
              ) : (
                <Send className="me-1 h-3.5 w-3.5" aria-hidden />
              )}
              <Bi
                ar={`اعتمد وأرسل المحدد (${selected.size})`}
                en={`Approve & Send Selected (${selected.size})`}
              />
            </Button>
          </div>

          <div className="max-h-[480px] overflow-auto rounded-xl border bg-background">
            <table className="w-full text-[11px]" data-testid="intake-batch-table">
              <thead className="sticky top-0 z-10 bg-muted/80 backdrop-blur">
                <tr>
                  <th className="px-2 py-2 text-start">
                    <Checkbox
                      checked={
                        selected.size > 0 &&
                        selected.size ===
                          parsed.rows.filter(
                            (r) => r.status !== 'created' && r.status !== 'submitting',
                          ).length
                      }
                      onCheckedChange={toggleAll}
                      aria-label="Select all"
                    />
                  </th>
                  <th className="px-2 py-2 text-start text-muted-foreground">#</th>
                  <th className="px-2 py-2 text-start text-muted-foreground">
                    <Bi ar="الحالة" en="Status" />
                  </th>
                  {KEY_COLS.map((c) => (
                    <th key={c} className="px-2 py-2 text-start font-medium text-muted-foreground tech-content">
                      {c}
                    </th>
                  ))}
                  <th className="px-2 py-2 text-end text-muted-foreground">
                    <Bi ar="إجراء" en="Action" />
                  </th>
                </tr>
              </thead>
              <tbody>
                {parsed.rows.map((r, idx) => {
                  const invalid = r.validation.length > 0;
                  const checked = selected.has(idx);
                  return (
                    <tr
                      key={idx}
                      className={`border-t ${
                        r.status === 'created'
                          ? 'bg-emerald-50/40 dark:bg-emerald-900/10'
                          : r.status === 'duplicate'
                            ? 'bg-amber-50/40 dark:bg-amber-900/10'
                            : r.status === 'failed' || r.status === 'invalid'
                              ? 'bg-rose-50/40 dark:bg-rose-900/10'
                              : checked
                                ? 'bg-primary/5'
                                : ''
                      }`}
                    >
                      <td className="px-2 py-1.5 align-top">
                        <Checkbox
                          checked={checked}
                          disabled={r.status === 'created' || r.status === 'submitting'}
                          onCheckedChange={() => toggleRow(idx)}
                          aria-label={`Select row ${idx + 1}`}
                        />
                      </td>
                      <td className="px-2 py-1.5 align-top tech-content text-muted-foreground">{idx + 1}</td>
                      <td className="px-2 py-1.5 align-top">
                        {r.status === 'submitting' && (
                          <Badge variant="outline" className="text-[10px]">
                            <Loader2 className="me-1 h-3 w-3 animate-spin" aria-hidden />
                            <Bi ar="إرسال…" en="Sending…" />
                          </Badge>
                        )}
                        {r.status === 'created' && (
                          <Badge variant="outline" className="bg-success/10 text-success border-success/30 text-[10px]">
                            <CheckCircle2 className="me-1 h-3 w-3" aria-hidden />
                            <Bi ar="تم الحفظ" en="Saved" />
                          </Badge>
                        )}
                        {r.status === 'duplicate' && (
                          <Badge variant="outline" className="bg-warning/10 text-warning border-warning/30 text-[10px]">
                            <Bi ar="مكرر" en="Duplicate" />
                          </Badge>
                        )}
                        {(r.status === 'failed' || r.status === 'invalid') && (
                          <Badge variant="outline" className="bg-destructive/10 text-destructive border-destructive/30 text-[10px]">
                            <AlertTriangle className="me-1 h-3 w-3" aria-hidden />
                            <Bi ar="فشل" en="Failed" />
                          </Badge>
                        )}
                        {r.status === 'pending' && invalid && (
                          <Badge variant="outline" className="bg-muted text-muted-foreground border-border text-[10px]" title={r.validation.join(', ')}>
                            <Bi ar={`ناقص: ${r.validation.join('، ')}`} en={`Missing: ${r.validation.join(', ')}`} />
                          </Badge>
                        )}
                        {r.status === 'pending' && !invalid && (
                          <Badge variant="outline" className="bg-info/10 text-info border-info/30 text-[10px]">
                            <Bi ar="جاهز" en="Ready" />
                          </Badge>
                        )}
                      </td>
                      {KEY_COLS.map((c) => (
                        <td key={c} className="px-2 py-1.5 align-top tech-content max-w-[160px] truncate" title={r.raw[c] ?? ''}>
                          {r.raw[c] ?? ''}
                        </td>
                      ))}
                      <td className="px-2 py-1.5 align-top text-end">
                        <Button
                          type="button"
                          size="sm"
                          variant="ghost"
                          className="h-7 rounded-lg px-2 text-[10px]"
                          onClick={() => auditRow(r.raw, idx)}
                          title="تدقيق عبر Google"
                        >
                          <Search className="me-1 h-3 w-3" aria-hidden />
                          <Bi ar="تدقيق" en="Audit" />
                        </Button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* STEP 3: DONE */}
      {step === 'done' && parsed && (
        <div className="rounded-xl border border-emerald-200 bg-emerald-50/50 p-4 dark:bg-emerald-900/10">
          <div className="mb-3 flex items-center gap-2">
            <CheckCircle2 className="h-5 w-5 text-emerald-600" aria-hidden />
            <h3 className="text-sm font-bold text-emerald-800 dark:text-emerald-200">
              <Bi ar="تم حفظ الدفعة في العملاء المحتملين" en="Batch saved to Provider Leads" />
            </h3>
          </div>
          <ul className="mb-3 grid gap-1 text-[11px] sm:grid-cols-4">
            <li>
              <Bi ar="إنشاء" en="Created" />:{' '}
              <span className="font-semibold tech-content text-emerald-700">
                {parsed.rows.filter((r) => r.status === 'created').length}
              </span>
            </li>
            <li>
              <Bi ar="مكرر" en="Duplicate" />:{' '}
              <span className="font-semibold tech-content text-amber-700">
                {parsed.rows.filter((r) => r.status === 'duplicate').length}
              </span>
            </li>
            <li>
              <Bi ar="ناقص" en="Invalid" />:{' '}
              <span className="font-semibold tech-content text-rose-700">
                {parsed.rows.filter((r) => r.status === 'invalid').length}
              </span>
            </li>
            <li>
              <Bi ar="فشل" en="Failed" />:{' '}
              <span className="font-semibold tech-content text-rose-700">
                {parsed.rows.filter((r) => r.status === 'failed').length}
              </span>
            </li>
          </ul>
          <div className="flex flex-wrap gap-2">
            <Button
              type="button"
              size="sm"
              onClick={() => navigate('/admin/provider-leads')}
              className="h-9 rounded-xl text-[11px]"
              data-testid="intake-batch-go-to-leads"
            >
              <ArrowRight className="me-1 h-3.5 w-3.5 rtl:hidden" aria-hidden />
              <Bi ar="فتح قائمة العملاء المحتملين" en="Open Provider Leads" />
            </Button>
            <Button type="button" size="sm" variant="outline" onClick={reset} className="h-9 rounded-xl text-[11px]">
              <RefreshCw className="me-1 h-3.5 w-3.5" aria-hidden />
              <Bi ar="استيراد دفعة جديدة" en="Import another batch" />
            </Button>
          </div>
        </div>
      )}
    </Card>
  );
};

export default IntakeBatchStepper;