import { useCallback, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  AlertCircle, CheckCircle2, ExternalLink, Loader2, ShieldCheck,
  StickyNote, Search as SearchIcon,
} from 'lucide-react';
import { DashboardLayout } from '@/components/dashboard/DashboardLayout';
import { useLanguage } from '@/i18n/LanguageContext';
import { useNoIndex } from '@/hooks/useNoIndex';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { Checkbox } from '@/components/ui/checkbox';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import { ReferenceBadge } from '@/components/reference/ReferenceBadge';
import {
  getAdminBulkReferenceTriage,
  createAdminOperationalNote,
  ADMIN_BULK_REF_MAX,
  type AdminBulkTriageResult,
  type AdminBulkTriageRow,
  type AdminBulkTriageStatus,
  type AdminNoteSeverity,
  type AdminNoteEntityType,
} from '@/modules/admin';
import { OperationsBreadcrumbs } from '@/components/operations/OperationsBreadcrumbs';

/**
 * BUSINESS-ADMIN-5 — Admin Bulk Reference Triage.
 *
 * Route: /admin/ref/triage (requireAdmin). useNoIndex. Read-only triage
 * over admin-safe wrappers. Optional bulk note creation reuses
 * `createAdminOperationalNote` per selected ref. No destructive actions,
 * no realtime/cron/notifications, no PII/secrets/tokens rendered.
 */

type Filter = 'all' | 'found' | 'not_found' | 'unsupported' | 'with_notes' | 'critical';

const ENTITY_TO_NOTE: Record<string, AdminNoteEntityType> = {
  work_order: 'work_order',
  work_order_task: 'task',
  contract: 'contract',
  quote: 'quote',
  lead: 'lead',
  booking: 'booking',
};

function statusBadgeTone(s: AdminBulkTriageStatus): string {
  if (s === 'found') return 'bg-emerald-500/10 text-emerald-600 border-emerald-500/30';
  if (s === 'not_found') return 'bg-amber-500/10 text-amber-600 border-amber-500/30';
  if (s === 'unsupported') return 'bg-muted text-muted-foreground border-border/40';
  return 'bg-destructive/10 text-destructive border-destructive/30';
}

function noteEntityFor(row: AdminBulkTriageRow): AdminNoteEntityType {
  const t = row.bundle?.summary?.entity_type ?? 'unknown';
  return ENTITY_TO_NOTE[t] ?? 'other';
}

export default function AdminBulkReferenceTriage() {
  useNoIndex();
  const { isRTL } = useLanguage();

  const tx = useMemo(() => ({
    title: isRTL ? 'فحص المراجع المتعدد' : 'Bulk Reference Triage',
    subtitle: isRTL
      ? 'الصق حتى 100 مرجع رسمي للحصول على ملخص آمن دفعة واحدة — قراءة فقط.'
      : `Paste up to ${ADMIN_BULK_REF_MAX} official refs for a sanitized batch summary — read-only.`,
    safe: isRTL ? 'قراءة فقط — لا يوجد تعديل.' : 'Read-only — no mutations.',
    inputLabel: isRTL ? 'المراجع' : 'References',
    inputPh: isRTL
      ? 'مرجع واحد لكل سطر أو مفصول بفواصل/مسافات (مثال: WO-1000001, CNT-100)'
      : 'One per line or comma/space separated (e.g. WO-1000001, CNT-100)',
    run: isRTL ? 'تشغيل الفحص' : 'Run triage',
    running: isRTL ? 'جارٍ الفحص…' : 'Running…',
    clear: isRTL ? 'مسح' : 'Clear',
    parsedValid: isRTL ? 'صالحة' : 'valid',
    parsedInvalid: isRTL ? 'غير صالحة' : 'invalid',
    parsedDup: isRTL ? 'مكررة' : 'duplicates',
    parsedTrunc: isRTL ? 'متجاوزة الحد' : 'truncated',
    invalidTitle: isRTL ? 'مرفوضة' : 'Rejected',
    invalidDesc: isRTL
      ? 'لا تُقبل معرّفات UUID أو الصيغ غير الرسمية.'
      : 'UUIDs and non-official refs are rejected.',
    filter: isRTL ? 'تصفية' : 'Filter',
    fAll: isRTL ? 'الكل' : 'All',
    fFound: isRTL ? 'موجودة' : 'Found',
    fNotFound: isRTL ? 'غير موجودة' : 'Not found',
    fUnsupported: isRTL ? 'غير مدعومة' : 'Unsupported',
    fWithNotes: isRTL ? 'مع ملاحظات مفتوحة' : 'With open notes',
    fCritical: isRTL ? 'حرجة' : 'Critical',
    selectAll: isRTL ? 'تحديد الكل' : 'Select all',
    selected: isRTL ? 'محدد' : 'selected',
    refCol: isRTL ? 'المرجع' : 'Ref',
    statusCol: isRTL ? 'الحالة' : 'Status',
    typeCol: isRTL ? 'النوع' : 'Type',
    labelCol: isRTL ? 'العنوان' : 'Label',
    notesCol: isRTL ? 'ملاحظات' : 'Notes',
    relatedCol: isRTL ? 'مرتبطة' : 'Related',
    actionsCol: isRTL ? 'إجراءات' : 'Actions',
    inspect: isRTL ? 'فحص' : 'Inspect',
    openCanonical: isRTL ? 'فتح' : 'Open',
    empty: isRTL ? 'لا توجد نتائج لعرضها.' : 'No results to display.',
    bulkTitle: isRTL ? 'إنشاء ملاحظة جماعية' : 'Create bulk note',
    bulkDesc: isRTL
      ? 'تطبق على المراجع المحددة فقط. ملاحظة داخلية للمسؤولين فقط.'
      : 'Applied to selected refs only. Internal admin-only note.',
    severity: isRTL ? 'الشدة' : 'Severity',
    info: isRTL ? 'معلومة' : 'Info',
    warning: isRTL ? 'تحذير' : 'Warning',
    critical: isRTL ? 'حرج' : 'Critical',
    noteLabel: isRTL ? 'نص الملاحظة' : 'Note text',
    notePh: isRTL ? 'سياق داخلي للدعم…' : 'Internal support context…',
    submitBulk: isRTL ? 'إنشاء للملاحظات المحددة' : 'Create for selected',
    submitting: isRTL ? 'جارٍ الإرسال…' : 'Submitting…',
    noSelection: isRTL ? 'حدد مرجعًا واحدًا على الأقل.' : 'Select at least one ref.',
    bulkOk: isRTL ? 'نجحت' : 'succeeded',
    bulkFail: isRTL ? 'فشلت' : 'failed',
    maxHit: isRTL
      ? `تم اقتطاع المدخلات إلى ${ADMIN_BULK_REF_MAX} مرجع.`
      : `Input truncated to ${ADMIN_BULK_REF_MAX} refs.`,
  }), [isRTL]);

  const [text, setText] = useState('');
  const [result, setResult] = useState<AdminBulkTriageResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [filter, setFilter] = useState<Filter>('all');
  const [selected, setSelected] = useState<Set<string>>(new Set());

  // Bulk note form state.
  const [noteText, setNoteText] = useState('');
  const [noteSeverity, setNoteSeverity] = useState<AdminNoteSeverity>('info');
  const [submitting, setSubmitting] = useState(false);
  const [bulkReport, setBulkReport] =
    useState<{ ok: string[]; fail: { ref: string; msg: string }[] } | null>(null);

  const runTriage = useCallback(async () => {
    setLoading(true);
    setError(null);
    setBulkReport(null);
    const res = await getAdminBulkReferenceTriage({ rawInput: text });
    if (res.error) {
      setError(isRTL ? 'تعذّر تشغيل الفحص.' : 'Failed to run triage.');
      setResult(null);
    } else {
      setResult(res.data);
      setSelected(new Set());
    }
    setLoading(false);
  }, [text, isRTL]);

  const rows = result?.rows ?? [];
  const visibleRows = useMemo(() => {
    if (filter === 'all') return rows;
    if (filter === 'with_notes') return rows.filter((r) => r.openNotes > 0);
    if (filter === 'critical') return rows.filter((r) => r.criticalNotes > 0);
    return rows.filter((r) => r.status === filter);
  }, [rows, filter]);

  const allVisibleSelected =
    visibleRows.length > 0 && visibleRows.every((r) => selected.has(r.ref_id));

  function toggleSelected(refId: string) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(refId)) next.delete(refId); else next.add(refId);
      return next;
    });
  }
  function toggleSelectAllVisible() {
    setSelected((prev) => {
      const next = new Set(prev);
      if (allVisibleSelected) {
        for (const r of visibleRows) next.delete(r.ref_id);
      } else {
        for (const r of visibleRows) next.add(r.ref_id);
      }
      return next;
    });
  }

  const submitBulkNotes = useCallback(async () => {
    if (selected.size === 0) {
      setBulkReport({ ok: [], fail: [{ ref: '—', msg: tx.noSelection }] });
      return;
    }
    setSubmitting(true);
    setBulkReport(null);
    const ok: string[] = [];
    const fail: { ref: string; msg: string }[] = [];
    for (const row of rows) {
      if (!selected.has(row.ref_id)) continue;
      const res = await createAdminOperationalNote({
        refId: row.ref_id,
        entityType: noteEntityFor(row),
        note: noteText,
        severity: noteSeverity,
      });
      if (res.error || !res.data) {
        const msg = res.error instanceof Error ? res.error.message : 'error';
        fail.push({ ref: row.ref_id, msg });
      } else {
        ok.push(row.ref_id);
      }
    }
    setBulkReport({ ok, fail });
    setSubmitting(false);
  }, [rows, selected, noteText, noteSeverity, tx.noSelection]);

  return (
    <DashboardLayout>
      <div className="space-y-4" dir={isRTL ? 'rtl' : 'ltr'}>
        <OperationsBreadcrumbs
          homeTo="/admin"
          crumbs={[
            { labelEn: 'Operations', labelAr: 'العمليات', to: '/admin/operations/console' },
            { labelEn: 'Bulk Reference Triage', labelAr: 'فحص المراجع المتعدد' },
          ]}
        />
        <div>
          <h1 className="font-heading font-bold text-xl sm:text-2xl flex items-center gap-2">
            <ShieldCheck className="w-5 h-5 sm:w-6 sm:h-6 text-accent" aria-hidden="true" />
            {tx.title}
          </h1>
          <p className="text-xs text-muted-foreground mt-1 max-w-2xl">{tx.subtitle}</p>
          <p className="text-[11px] text-muted-foreground mt-1 inline-flex items-center gap-1">
            <ShieldCheck className="w-3 h-3" /> {tx.safe}
          </p>
        </div>

        {/* Input */}
        <Card className="border-border/40">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm flex items-center gap-2">
              <SearchIcon className="w-4 h-4 text-muted-foreground" /> {tx.inputLabel}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            <Textarea
              value={text}
              onChange={(e) => setText(e.target.value)}
              placeholder={tx.inputPh}
              aria-label={tx.inputLabel}
              rows={5}
              className="tech-content text-xs"
              dir="ltr"
            />
            <div className="flex flex-wrap items-center gap-2">
              <Button
                type="button"
                size="sm"
                className="rounded-xl h-9"
                onClick={() => void runTriage()}
                disabled={loading || text.trim().length === 0}
              >
                {loading
                  ? <><Loader2 className="w-3.5 h-3.5 me-1 animate-spin" />{tx.running}</>
                  : tx.run}
              </Button>
              <Button
                type="button"
                size="sm"
                variant="outline"
                className="rounded-xl h-9"
                onClick={() => { setText(''); setResult(null); setSelected(new Set()); setBulkReport(null); }}
                disabled={loading}
              >
                {tx.clear}
              </Button>
              {result ? (
                <div className="text-[11px] text-muted-foreground tech-content flex flex-wrap gap-2">
                  <span>{rows.length} {tx.parsedValid}</span>
                  <span>{result.invalid.length} {tx.parsedInvalid}</span>
                  <span>{result.duplicates} {tx.parsedDup}</span>
                  {result.truncated > 0 ? (
                    <span className="text-amber-600 dark:text-amber-400">
                      {result.truncated} {tx.parsedTrunc}
                    </span>
                  ) : null}
                </div>
              ) : null}
            </div>
            {result && result.truncated > 0 ? (
              <p className="text-[11px] text-amber-600 dark:text-amber-400">{tx.maxHit}</p>
            ) : null}
            {error ? (
              <p className="text-xs text-destructive inline-flex items-center gap-1">
                <AlertCircle className="w-3.5 h-3.5" /> {error}
              </p>
            ) : null}
          </CardContent>
        </Card>

        {/* Rejected refs */}
        {result && result.invalid.length > 0 ? (
          <Card className="border-amber-500/30 bg-amber-500/5">
            <CardContent className="p-3">
              <div className="text-xs font-medium text-amber-700 dark:text-amber-400 flex items-center gap-1">
                <AlertCircle className="w-3.5 h-3.5" /> {tx.invalidTitle} ({result.invalid.length})
              </div>
              <p className="text-[11px] text-muted-foreground mt-1">{tx.invalidDesc}</p>
              <div className="mt-2 flex flex-wrap gap-1 tech-content text-[11px]">
                {result.invalid.slice(0, 50).map((r) => (
                  <Badge key={r} variant="outline" className="text-[10px]">{r || '∅'}</Badge>
                ))}
              </div>
            </CardContent>
          </Card>
        ) : null}

        {/* Results */}
        {result ? (
          <Card className="border-border/40">
            <CardHeader className="pb-2 flex flex-row items-center justify-between gap-2">
              <CardTitle className="text-sm">{tx.filter}</CardTitle>
              <Select value={filter} onValueChange={(v) => setFilter(v as Filter)}>
                <SelectTrigger className="h-8 w-44 text-xs rounded-xl">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">{tx.fAll} ({rows.length})</SelectItem>
                  <SelectItem value="found">{tx.fFound}</SelectItem>
                  <SelectItem value="not_found">{tx.fNotFound}</SelectItem>
                  <SelectItem value="unsupported">{tx.fUnsupported}</SelectItem>
                  <SelectItem value="with_notes">{tx.fWithNotes}</SelectItem>
                  <SelectItem value="critical">{tx.fCritical}</SelectItem>
                </SelectContent>
              </Select>
            </CardHeader>
            <CardContent className="p-0">
              {visibleRows.length === 0 ? (
                <p className="p-4 text-xs text-muted-foreground">{tx.empty}</p>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-xs">
                    <thead className="bg-muted/40">
                      <tr className="text-start">
                        <th className="px-2 py-2 w-8">
                          <Checkbox
                            checked={allVisibleSelected}
                            onCheckedChange={toggleSelectAllVisible}
                            aria-label={tx.selectAll}
                          />
                        </th>
                        <th className="px-2 py-2 text-start">{tx.refCol}</th>
                        <th className="px-2 py-2 text-start">{tx.statusCol}</th>
                        <th className="px-2 py-2 text-start">{tx.typeCol}</th>
                        <th className="px-2 py-2 text-start">{tx.labelCol}</th>
                        <th className="px-2 py-2 text-start">{tx.notesCol}</th>
                        <th className="px-2 py-2 text-start">{tx.relatedCol}</th>
                        <th className="px-2 py-2 text-start">{tx.actionsCol}</th>
                      </tr>
                    </thead>
                    <tbody data-testid="bulk-triage-rows">
                      {visibleRows.map((row) => {
                        const sum = row.bundle?.summary;
                        const related = row.bundle?.related_refs?.length ?? 0;
                        return (
                          <tr key={row.ref_id} className="border-t border-border/30">
                            <td className="px-2 py-2 align-top">
                              <Checkbox
                                checked={selected.has(row.ref_id)}
                                onCheckedChange={() => toggleSelected(row.ref_id)}
                                aria-label={row.ref_id}
                              />
                            </td>
                            <td className="px-2 py-2 align-top">
                              <ReferenceBadge refId={row.ref_id} />
                            </td>
                            <td className="px-2 py-2 align-top">
                              <Badge variant="outline" className={`text-[10px] ${statusBadgeTone(row.status)}`}>
                                {row.status}
                              </Badge>
                              {row.errorMessage ? (
                                <div className="text-[10px] text-destructive mt-1">{row.errorMessage}</div>
                              ) : null}
                            </td>
                            <td className="px-2 py-2 align-top tech-content">
                              {sum?.entity_type ?? '—'}
                            </td>
                            <td className="px-2 py-2 align-top max-w-[20rem]">
                              <div className="break-words" dir="auto">{sum?.label ?? '—'}</div>
                              <div className="text-[10px] text-muted-foreground tech-content mt-0.5">
                                {sum?.status ?? '—'}{sum?.priority ? ` · ${sum.priority}` : ''}
                              </div>
                            </td>
                            <td className="px-2 py-2 align-top">
                              <div className="inline-flex items-center gap-1">
                                <StickyNote className="w-3 h-3 text-muted-foreground" />
                                <span className="tech-content">{row.openNotes}</span>
                                {row.criticalNotes > 0 ? (
                                  <Badge variant="outline" className="text-[10px] bg-destructive/10 text-destructive border-destructive/30">
                                    {row.criticalNotes}
                                  </Badge>
                                ) : null}
                              </div>
                            </td>
                            <td className="px-2 py-2 align-top tech-content">{related}</td>
                            <td className="px-2 py-2 align-top">
                              <div className="flex items-center gap-1 flex-wrap">
                                <Button asChild size="sm" variant="outline" className="rounded-xl h-7 text-[11px]">
                                  <Link to={`/admin/ref/${row.ref_id}`}>{tx.inspect}</Link>
                                </Button>
                                {sum?.canonical_route ? (
                                  <Button asChild size="sm" variant="ghost" className="rounded-xl h-7 text-[11px]">
                                    <Link to={sum.canonical_route}>
                                      <ExternalLink className="w-3 h-3 me-1" />{tx.openCanonical}
                                    </Link>
                                  </Button>
                                ) : null}
                              </div>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}
              <div className="px-3 py-2 text-[11px] text-muted-foreground border-t border-border/30">
                {selected.size} {tx.selected}
              </div>
            </CardContent>
          </Card>
        ) : null}

        {/* Bulk note creation */}
        {result && rows.length > 0 ? (
          <Card className="border-border/40">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm flex items-center gap-2">
                <StickyNote className="w-4 h-4 text-accent" /> {tx.bulkTitle}
              </CardTitle>
              <p className="text-[11px] text-muted-foreground">{tx.bulkDesc}</p>
            </CardHeader>
            <CardContent className="space-y-2">
              <div className="flex flex-wrap items-center gap-2">
                <div className="space-y-1">
                  <label className="text-[10px] text-muted-foreground block">{tx.severity}</label>
                  <Select value={noteSeverity} onValueChange={(v) => setNoteSeverity(v as AdminNoteSeverity)}>
                    <SelectTrigger className="h-9 w-36 text-xs rounded-xl">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="info">{tx.info}</SelectItem>
                      <SelectItem value="warning">{tx.warning}</SelectItem>
                      <SelectItem value="critical">{tx.critical}</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="space-y-1">
                <label className="text-[10px] text-muted-foreground block">{tx.noteLabel}</label>
                <Textarea
                  value={noteText}
                  onChange={(e) => setNoteText(e.target.value)}
                  placeholder={tx.notePh}
                  rows={3}
                  className="text-xs"
                  dir="auto"
                />
              </div>
              <Button
                type="button"
                size="sm"
                className="rounded-xl h-9"
                onClick={() => void submitBulkNotes()}
                disabled={submitting || selected.size === 0 || noteText.trim().length === 0}
              >
                {submitting
                  ? <><Loader2 className="w-3.5 h-3.5 me-1 animate-spin" />{tx.submitting}</>
                  : `${tx.submitBulk} (${selected.size})`}
              </Button>

              {bulkReport ? (
                <div className="rounded-xl border border-border/40 p-2 text-[11px] space-y-1" data-testid="bulk-note-report">
                  <div className="inline-flex items-center gap-1 text-emerald-600 dark:text-emerald-400">
                    <CheckCircle2 className="w-3.5 h-3.5" />
                    {bulkReport.ok.length} {tx.bulkOk}
                  </div>
                  {bulkReport.fail.length > 0 ? (
                    <div className="inline-flex items-center gap-1 text-destructive ms-3">
                      <AlertCircle className="w-3.5 h-3.5" />
                      {bulkReport.fail.length} {tx.bulkFail}
                    </div>
                  ) : null}
                  {bulkReport.fail.length > 0 ? (
                    <ul className="list-disc pl-4 mt-1 tech-content">
                      {bulkReport.fail.slice(0, 10).map((f, i) => (
                        <li key={i} className="text-destructive">{f.ref}: {f.msg}</li>
                      ))}
                    </ul>
                  ) : null}
                </div>
              ) : null}
            </CardContent>
          </Card>
        ) : null}
      </div>
    </DashboardLayout>
  );
}