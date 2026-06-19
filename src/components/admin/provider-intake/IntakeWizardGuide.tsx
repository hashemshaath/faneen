/**
 * PROVIDER INTAKE UX PROFESSIONALIZATION — Wizard guidance + duplicate legend.
 *
 * Shown atop `/admin/data-enrichment` to make the four operational steps
 * explicit (upload / map / review-clean / apply) and to document the
 * duplicate badges used inside the review step. Pure presentation — no
 * network calls.
 */
import React from 'react';
import { toast } from 'sonner';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Upload,
  ListChecks,
  Sparkles,
  CheckCircle2,
  Download,
  FileSpreadsheet,
  AlertTriangle,
  ArrowLeftRight,
  FileJson,
  Search,
} from 'lucide-react';
import { Bi } from '@/components/common/Bilingual';
import {
  INTAKE_AUDIT_EVENT,
  INTAKE_QUEUE_CHANGE_EVENT,
  intakeRowName,
  readIntakeQueue,
  writeIntakeQueue,
} from '@/lib/intakeQueue';

const STEPS: Array<{
  id: string;
  ar: string;
  en: string;
  icon: React.ComponentType<{ className?: string }>;
}> = [
  { id: 'upload', ar: 'رفع الملف أو اختيار مصدر', en: 'Upload file or pick source', icon: Upload },
  { id: 'map', ar: 'مطابقة الأعمدة', en: 'Map columns', icon: ListChecks },
  { id: 'review', ar: 'مراجعة وتنظيف البيانات', en: 'Review & clean data', icon: Sparkles },
  { id: 'apply', ar: 'تطبيق وحفظ Lead', en: 'Apply & save as lead', icon: CheckCircle2 },
];

const DUPLICATE_BADGES: Array<{
  id: string;
  ar: string;
  en: string;
  cls: string;
}> = [
  { id: 'new', ar: 'جديد', en: 'New', cls: 'bg-success/10 text-success border-success/30' },
  { id: 'strong-duplicate', ar: 'مكرر قوي', en: 'Strong duplicate', cls: 'bg-destructive/10 text-destructive border-destructive/30' },
  { id: 'possible-similar', ar: 'مشابه محتمل', en: 'Possible match', cls: 'bg-warning/10 text-warning border-warning/30' },
  { id: 'needs-review', ar: 'يحتاج مراجعة', en: 'Needs review', cls: 'bg-info/10 text-info border-info/30' },
  { id: 'missing-data', ar: 'ناقص بيانات', en: 'Missing data', cls: 'bg-muted text-muted-foreground border-border' },
];

type TemplateId = 'providers' | 'branches';

const TEMPLATES: Array<{ id: TemplateId; ar: string; en: string; href: string; filename: string }> = [
  {
    id: 'providers',
    ar: 'قالب المزودين الرئيسي',
    en: 'Main providers template',
    href: '/templates/qitaat-provider-intake-template.xlsx',
    filename: 'qitaat-provider-intake-template.xlsx',
  },
  {
    id: 'branches',
    ar: 'قالب الفروع',
    en: 'Branches template',
    href: '/templates/qitaat-provider-branches-template.xlsx',
    filename: 'qitaat-provider-branches-template.xlsx',
  },
];

const EXCEL_MIME = 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet';

const REQUIRED_TEMPLATE_COLUMNS: Record<'providers' | 'branches', string[]> = {
  providers: [
    'company_name_ar','company_name_en','unified_number','commercial_registration',
    'established_year','sector','services','phone','email','country','region','city',
    'district','national_short_address','street_address','latitude','longitude',
    'google_maps_url','account_manager_name','account_manager_email',
    'account_manager_phone','contact_role','website','instagram','x_account',
    'linkedin','source','notes',
  ],
  branches: [
    'company_name_ar','unified_number','commercial_registration','branch_name_ar',
    'branch_name_en','country','region','city','district','national_short_address',
    'street_address','latitude','longitude','google_maps_url','branch_phone',
    'branch_email','is_primary_branch','working_hours','branch_notes',
  ],
};

type UploadedTemplateKind = 'providers' | 'branches' | 'unknown';

interface UploadedTemplateSummary {
  fileName: string;
  sheetName: string;
  rowCount: number;
  columnCount: number;
  kind: UploadedTemplateKind;
  missingColumns: string[];
  headers: string[];
  rows: Record<string, string>[];
}

function inferTemplateKind(headers: string[]): UploadedTemplateKind {
  if (headers.includes('branch_name_ar') || headers.includes('branch_phone')) return 'branches';
  if (headers.includes('company_name_en') || headers.includes('account_manager_email')) return 'providers';
  return 'unknown';
}

async function buildTemplateBlob(id: TemplateId): Promise<Blob> {
  const XLSX = await import('xlsx');
  const workbook = XLSX.utils.book_new();
  const headers = REQUIRED_TEMPLATE_COLUMNS[id];
  const worksheet = XLSX.utils.aoa_to_sheet<string>([headers]);
  worksheet['!cols'] = headers.map((header) => ({ wch: Math.max(header.length + 2, 14) }));
  XLSX.utils.book_append_sheet(workbook, worksheet, id === 'providers' ? 'providers' : 'branches');
  const guideSheet = XLSX.utils.aoa_to_sheet<string>([
    ['template', id],
    ['required_columns', headers.join(', ')],
  ]);
  XLSX.utils.book_append_sheet(workbook, guideSheet, 'readme');
  const output = XLSX.write(workbook, { bookType: 'xlsx', type: 'array' }) as ArrayBuffer;
  return new Blob([output], { type: EXCEL_MIME });
}

function triggerBlobDownload(blob: Blob, filename: string): void {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.rel = 'noopener';
  document.body.appendChild(a);
  a.click();
  a.remove();
  window.setTimeout(() => URL.revokeObjectURL(url), 5000);
}

export interface IntakeWizardGuideProps {
  className?: string;
  testId?: string;
}

export const IntakeWizardGuide: React.FC<IntakeWizardGuideProps> = ({
  className,
  testId = 'intake-wizard-guide',
}) => {
  const [downloadingId, setDownloadingId] = React.useState<string | null>(null);
  const [uploadSummary, setUploadSummary] = React.useState<UploadedTemplateSummary | null>(null);
  const [uploadError, setUploadError] = React.useState<string | null>(null);
  const [reviewedIdx, setReviewedIdx] = React.useState<Set<number>>(new Set());
  const [activeIdx, setActiveIdx] = React.useState<number | null>(null);
  const [columnMap, setColumnMap] = React.useState<Record<string, string>>({});

  React.useEffect(() => {
    setColumnMap({});
  }, [uploadSummary?.fileName]);

  // Keep per-row badges in sync with the queue in sessionStorage so
  // refreshes and the inline review banner stay aligned.
  React.useEffect(() => {
    const sync = () => {
      const q = readIntakeQueue();
      setReviewedIdx(new Set(q?.reviewed ?? []));
      setActiveIdx(typeof q?.index === 'number' ? q.index : null);
    };
    sync();
    if (typeof window === 'undefined') return;
    window.addEventListener(INTAKE_QUEUE_CHANGE_EVENT, sync);
    return () => window.removeEventListener(INTAKE_QUEUE_CHANGE_EVENT, sync);
  }, []);

  const handleDownload = React.useCallback(
    async (id: TemplateId, href: string, filename: string) => {
      setDownloadingId(id);
      try {
        const res = await fetch(href, {
          credentials: 'omit',
          cache: 'reload',
          headers: { Accept: EXCEL_MIME },
        });
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const sourceBlob = await res.blob();
        if (sourceBlob.type.includes('text/html')) throw new Error('Template returned HTML');
        const blob = new Blob([sourceBlob], { type: EXCEL_MIME });
        triggerBlobDownload(blob, filename);
      } catch (err: unknown) {
        const generatedBlob = await buildTemplateBlob(id);
        triggerBlobDownload(generatedBlob, filename);
        // No navigation / no new tab fallback — generate the workbook locally.
        if (typeof console !== 'undefined' && console.warn) {
          console.warn('[intake-template] static template unavailable; generated locally', href, err instanceof Error ? err.message : 'unknown error');
        }
      } finally {
        setDownloadingId(null);
      }
    },
    [],
  );

  const handleUpload = React.useCallback(async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.currentTarget.files?.[0];
    if (!file) return;
    setUploadError(null);
    setUploadSummary(null);
    try {
      const XLSX = await import('xlsx');
      const workbook = XLSX.read(await file.arrayBuffer(), { type: 'array' });
      const sheetName = workbook.SheetNames[0];
      if (!sheetName) throw new Error('empty workbook');
      const sheet = workbook.Sheets[sheetName];
      const matrix = XLSX.utils.sheet_to_json<unknown[]>(sheet, { header: 1, blankrows: false });
      const headers = (matrix[0] ?? []).map((v) => String(v).trim()).filter(Boolean);
      const kind = inferTemplateKind(headers);
      const required = kind === 'unknown' ? [] : REQUIRED_TEMPLATE_COLUMNS[kind];
      const rows: Record<string, string>[] = (matrix.slice(1) as unknown[][])
        .map((row) => {
          const out: Record<string, string> = {};
          headers.forEach((h, i) => {
            const v = row?.[i];
            out[h] = v === undefined || v === null ? '' : String(v).trim();
          });
          return out;
        })
        .filter((r) => Object.values(r).some((v) => v !== ''));
      setUploadSummary({
        fileName: file.name,
        sheetName,
        rowCount: Math.max(matrix.length - 1, 0),
        columnCount: headers.length,
        kind,
        missingColumns: required.filter((col) => !headers.includes(col)),
        headers,
        rows,
      });
    } catch (err: unknown) {
      setUploadError(err instanceof Error ? err.message : 'Unable to read file');
    } finally {
      e.currentTarget.value = '';
    }
  }, []);

  const handleContinue = React.useCallback(() => {
    if (!uploadSummary) return;
    const existing = readIntakeQueue();
    const reviewed =
      existing && existing.fileName === uploadSummary.fileName ? existing.reviewed : [];
    writeIntakeQueue({
      kind: uploadSummary.kind,
      fileName: uploadSummary.fileName,
      rows: uploadSummary.rows,
      index: 0,
      reviewed,
      updatedAt: new Date().toISOString(),
    });
    const first = uploadSummary.rows[0];
    const name = intakeRowName(first);
    if (typeof window !== 'undefined' && name) {
      window.dispatchEvent(
        new CustomEvent(INTAKE_AUDIT_EVENT, {
          detail: { name, query: name, row: first, index: 0, total: uploadSummary.rows.length },
        }),
      );
    }
    const total = uploadSummary.rows.length;
    const done = reviewed.length;
    toast.success(`جاهز للمراجعة: ${total} صف${total === 1 ? '' : 'وفًا'}`, {
      description: `تم تدقيق ${done}/${total} — تابع داخل لوحة "تدقيق الصف الحالي" أسفل بطاقة "ابحث عن المنشأة" في نفس الصفحة.`,
    });
  }, [uploadSummary]);

  const handleAuditRow = React.useCallback(
    (row: Record<string, string>, idx: number) => {
      const name = intakeRowName(row);
      if (!name) {
        toast.error('الصف يفتقد اسم المنشأة');
        return;
      }
      if (uploadSummary) {
        const existing = readIntakeQueue();
        const reviewed =
          existing && existing.fileName === uploadSummary.fileName ? existing.reviewed : [];
        writeIntakeQueue({
          kind: uploadSummary.kind,
          fileName: uploadSummary.fileName,
          rows: uploadSummary.rows,
          index: idx,
          reviewed,
          updatedAt: new Date().toISOString(),
        });
      }
      if (typeof window !== 'undefined') {
        window.dispatchEvent(
          new CustomEvent(INTAKE_AUDIT_EVENT, {
            detail: { name, query: name, row, index: idx, total: uploadSummary?.rows.length ?? 1 },
          }),
        );
      }
    },
    [uploadSummary],
  );

  const handleExportJson = React.useCallback(() => {
    if (!uploadSummary) return;
    const blob = new Blob(
      [JSON.stringify({ kind: uploadSummary.kind, rows: uploadSummary.rows }, null, 2)],
      { type: 'application/json' },
    );
    triggerBlobDownload(blob, `${uploadSummary.fileName.replace(/\.[^.]+$/, '')}-parsed.json`);
  }, [uploadSummary]);

  const handleApplyMapping = React.useCallback(() => {
    if (!uploadSummary) return;
    const pairs = Object.entries(columnMap).filter(([, src]) => src && src !== '__none__');
    if (pairs.length === 0) {
      toast('اختر عمودًا مصدرًا لعمود ناقص واحد على الأقل');
      return;
    }
    const newRows = uploadSummary.rows.map((r) => {
      const next = { ...r };
      for (const [target, src] of pairs) {
        if (!next[target] && r[src] != null) next[target] = r[src];
      }
      return next;
    });
    const newHeaders = Array.from(new Set([...uploadSummary.headers, ...pairs.map(([t]) => t)]));
    const required = REQUIRED_TEMPLATE_COLUMNS[uploadSummary.kind === 'branches' ? 'branches' : 'providers'];
    const missing = uploadSummary.kind === 'unknown' ? [] : required.filter((c) => !newHeaders.includes(c));
    setUploadSummary({ ...uploadSummary, headers: newHeaders, rows: newRows, missingColumns: missing });
    setColumnMap({});
    toast.success(`تم تعيين ${pairs.length} عمود — الأعمدة الناقصة: ${missing.length}`);
  }, [uploadSummary, columnMap]);

  const canContinue =
    !!uploadSummary &&
    uploadSummary.kind !== 'unknown' &&
    uploadSummary.missingColumns.length === 0 &&
    uploadSummary.rows.length > 0;
  return (
    <Card data-testid={testId} className={`p-4 mb-5 ${className ?? ''}`}>
      <div className="text-xs font-semibold mb-3 text-muted-foreground uppercase tracking-wide">
        <Bi ar="خطوات إدخال المزود" en="Provider intake steps" />
      </div>
      <ol
        data-testid={`${testId}-steps`}
        className="grid grid-cols-2 md:grid-cols-4 gap-2 mb-4"
      >
        {STEPS.map((s, i) => {
          const Icon = s.icon;
          return (
            <li
              key={s.id}
              data-testid={`${testId}-step-${s.id}`}
              className="flex items-start gap-2 rounded-xl border bg-muted/30 p-3"
            >
              <span className="inline-flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary text-[11px] font-bold tech-content">
                {i + 1}
              </span>
              <div className="min-w-0">
                <div className="flex items-center gap-1.5 text-xs font-medium">
                  <Icon className="h-3.5 w-3.5 text-primary" aria-hidden />
                  <Bi ar={s.ar} en={s.en} />
                </div>
              </div>
            </li>
          );
        })}
      </ol>
      <div data-testid={`${testId}-templates`} className="mb-4 rounded-xl border bg-muted/20 p-3">
        <div className="mb-3 flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <div className="text-[11px] font-semibold text-muted-foreground">
              <Bi ar="تحميل ورفع قوالب الإدخال" en="Download and upload intake templates" />
            </div>
            <p className="mt-1 text-[11px] text-muted-foreground">
              <Bi ar="القوالب تُفتح هنا داخل مركز العملاء، بدون تبويب خارجي أو انتقال." en="Templates stay inside the customer center with no new tab or navigation." />
            </p>
          </div>
          <Badge variant="outline" className="w-fit text-[10px] bg-primary/10 text-primary border-primary/25">
            Excel
          </Badge>
        </div>
        <div className="grid gap-2 md:grid-cols-2">
          {TEMPLATES.map((t) => {
            const isDownloading = downloadingId === t.id;
            return (
              <button
                key={t.id}
                type="button"
                onClick={() => handleDownload(t.id, t.href, t.filename)}
                disabled={isDownloading}
                data-testid={`intake-template-${t.id}`}
                className="group flex min-h-12 items-center justify-between gap-3 rounded-xl border bg-background px-3 py-2 text-start text-xs font-medium transition-colors hover:bg-accent disabled:cursor-wait disabled:opacity-70"
              >
                <span className="flex min-w-0 items-center gap-2">
                  <span className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
                    <FileSpreadsheet className="h-4 w-4" aria-hidden />
                  </span>
                  <span className="min-w-0">
                    <span className="block truncate"><Bi ar={isDownloading ? 'جاري التحميل…' : t.ar} en={isDownloading ? 'Downloading…' : t.en} /></span>
                    <span className="block truncate text-[10px] font-normal text-muted-foreground tech-content">{t.filename}</span>
                  </span>
                </span>
                <Download className="h-4 w-4 shrink-0 text-muted-foreground transition-colors group-hover:text-primary" aria-hidden />
              </button>
            );
          })}
        </div>
        <div className="mt-3 rounded-xl border border-dashed bg-background/70 p-3">
          <Label htmlFor="provider-intake-template-upload" className="mb-2 flex items-center gap-2 text-xs font-semibold">
            <Upload className="h-3.5 w-3.5 text-primary" aria-hidden />
            <Bi ar="رفع ملف Excel للفحص قبل الإدخال" en="Upload Excel for pre-ingest check" />
          </Label>
          <Input
            id="provider-intake-template-upload"
            data-testid="intake-template-upload"
            type="file"
            accept=".xlsx,.xls,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet,application/vnd.ms-excel"
            onChange={handleUpload}
            className="h-11 rounded-xl text-xs"
          />
          {uploadSummary && (
            <div data-testid="intake-template-upload-summary" className="mt-3 rounded-lg bg-muted/40 p-3 text-[11px]">
              <div className="mb-2 flex flex-wrap items-center gap-2">
                <Badge variant="outline" className="bg-success/10 text-success border-success/30">
                  <Bi ar={uploadSummary.kind === 'branches' ? 'قالب فروع' : uploadSummary.kind === 'providers' ? 'قالب مزودين' : 'نوع غير معروف'} en={uploadSummary.kind === 'branches' ? 'Branches template' : uploadSummary.kind === 'providers' ? 'Providers template' : 'Unknown template'} />
                </Badge>
                <span className="font-medium tech-content">{uploadSummary.fileName}</span>
              </div>
              <div className="grid gap-1 sm:grid-cols-3 text-muted-foreground">
                <span><Bi ar="الورقة" en="Sheet" />: <span className="tech-content">{uploadSummary.sheetName}</span></span>
                <span><Bi ar="الأعمدة" en="Columns" />: <span className="tech-content">{uploadSummary.columnCount}</span></span>
                <span><Bi ar="الصفوف" en="Rows" />: <span className="tech-content">{uploadSummary.rowCount}</span></span>
              </div>
              {uploadSummary.missingColumns.length > 0 && (
                <p className="mt-2 text-warning">
                  <Bi ar="أعمدة ناقصة" en="Missing columns" />: <span className="tech-content">{uploadSummary.missingColumns.join(', ')}</span>
                </p>
              )}
              {uploadSummary.rows.length > 0 && (
                <div className="mt-3 max-h-80 overflow-auto rounded-lg border bg-background">
                  <table className="w-full text-[10px]" data-testid="intake-template-upload-preview">
                    <thead className="sticky top-0 bg-muted/60 backdrop-blur">
                      <tr>
                        <th className="px-2 py-1 text-start font-medium text-muted-foreground">#</th>
                        {uploadSummary.headers.slice(0, 5).map((h) => (
                          <th key={h} className="px-2 py-1 text-start font-medium text-muted-foreground tech-content">{h}</th>
                        ))}
                        <th className="px-2 py-1 text-end font-medium text-muted-foreground">
                          <Bi ar="إجراء" en="Action" />
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      {uploadSummary.rows.map((row, idx) => (
                        <tr
                          key={idx}
                          className={`border-t ${activeIdx === idx ? 'bg-primary/5' : reviewedIdx.has(idx) ? 'bg-emerald-50/50 dark:bg-emerald-900/10' : ''}`}
                        >
                          <td className="px-2 py-1 align-top tech-content text-muted-foreground">
                            <span className="inline-flex items-center gap-1">
                              {idx + 1}
                              {reviewedIdx.has(idx) && (
                                <CheckCircle2 className="h-3 w-3 text-emerald-600" aria-label="reviewed" />
                              )}
                            </span>
                          </td>
                          {uploadSummary.headers.slice(0, 5).map((h) => (
                            <td key={h} className="px-2 py-1 align-top tech-content">{row[h]}</td>
                          ))}
                          <td className="px-2 py-1 text-end">
                            <Button
                              type="button"
                              size="sm"
                              variant="ghost"
                              onClick={() => handleAuditRow(row, idx)}
                              data-testid={`intake-template-audit-row-${idx}`}
                              className={`h-7 rounded-lg px-2 text-[10px] ${activeIdx === idx ? 'bg-primary/10 text-primary' : ''}`}
                            >
                              <Search className="me-1 h-3 w-3" aria-hidden />
                              <Bi ar="تدقيق" en="Audit" />
                            </Button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
              <div className="mt-3 flex flex-wrap items-center gap-2">
                <Button
                  type="button"
                  size="sm"
                  onClick={handleContinue}
                  disabled={!canContinue}
                  data-testid="intake-template-continue"
                  className="h-9 rounded-xl text-[11px]"
                >
                  <ArrowLeftRight className="me-1.5 h-3.5 w-3.5" aria-hidden />
                  <Bi ar="متابعة إلى المراجعة والتطبيق" en="Continue to review & apply" />
                </Button>
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  onClick={handleExportJson}
                  disabled={uploadSummary.rows.length === 0}
                  data-testid="intake-template-export-json"
                  className="h-9 rounded-xl text-[11px]"
                >
                  <FileJson className="me-1.5 h-3.5 w-3.5" aria-hidden />
                  <Bi ar="تنزيل JSON المعاينة" en="Download parsed JSON" />
                </Button>
                {!canContinue && uploadSummary.kind !== 'unknown' && (
                  <span className="text-[10px] text-warning">
                    <Bi
                      ar="أكمل الأعمدة الناقصة ثم تابع"
                      en="Resolve missing columns to continue"
                    />
                  </span>
                )}
              </div>
            </div>
          )}
          {uploadError && (
            <p data-testid="intake-template-upload-error" className="mt-2 flex items-center gap-1.5 text-[11px] text-destructive">
              <AlertTriangle className="h-3 w-3" aria-hidden />
              <Bi ar="تعذر قراءة الملف" en="Could not read file" />: <span className="tech-content">{uploadError}</span>
            </p>
          )}
        </div>
        <p className="mt-2 text-[11px] text-muted-foreground">
          <Bi
            ar="يشمل: الإحداثيات، العنوان الوطني المختصر، الدولة/المنطقة، سنة التأسيس، مدير الحساب، وملف مستقل للفروع."
            en="Includes coordinates, short national address, country/region, establishment year, account manager, and a separate branches file."
          />
        </p>
      </div>
      <div>
        <div className="text-[11px] font-semibold mb-2 text-muted-foreground">
          <Bi ar="دلالات تكرار البيانات" en="Duplicate detection badges" />
        </div>
        <div
          data-testid={`${testId}-duplicate-legend`}
          className="flex flex-wrap gap-1.5"
        >
          {DUPLICATE_BADGES.map((b) => (
            <Badge
              key={b.id}
              variant="outline"
              data-testid={`duplicate-badge-${b.id}`}
              className={`text-[10px] ${b.cls}`}
            >
              <Bi ar={b.ar} en={b.en} />
            </Badge>
          ))}
        </div>
        <p className="mt-2 text-[11px] text-muted-foreground">
          <Bi
            ar="لا يتم إدخال أي صف مباشرة إلى جدول المنشآت — التحويل دائمًا يدوي عبر مراجعة المسؤول."
            en="No row is written directly to the businesses table — every conversion is manual after admin review."
          />
        </p>
      </div>
    </Card>
  );
};

export default IntakeWizardGuide;