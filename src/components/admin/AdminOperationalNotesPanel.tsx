import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  AlertCircle, CheckCircle2, FileWarning, Loader2, ShieldAlert, StickyNote,
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import { ReferenceBadge } from '@/components/reference/ReferenceBadge';
import {
  listAdminOperationalNotes,
  createAdminOperationalNote,
  resolveAdminOperationalNote,
  getAdminOperationalNotesSummary,
  isOfficialAdminNoteRef,
  type AdminOperationalNoteRow,
  type AdminNoteSeverity,
  type AdminNoteEntityType,
  type AdminNoteStatus,
  type AdminOperationalNotesSummary,
} from '@/modules/admin';

/**
 * BUSINESS-ADMIN-2 — Internal Admin Operational Notes panel.
 *
 * Append-only, admin-only. Renders inline (no popups), supports a small
 * create form, a Resolve action per open note, and an escalation summary.
 * All I/O goes through `@/modules/admin` wrappers — no direct supabase.from.
 */

interface Props {
  /** Optional ref scope from the parent (must be official-ref shaped or empty). */
  scopedRefId?: string;
  isRTL: boolean;
}

function severityTone(sev: AdminNoteSeverity): string {
  if (sev === 'critical') return 'bg-destructive/15 text-destructive border-destructive/30';
  if (sev === 'warning') return 'bg-amber-500/15 text-amber-600 dark:text-amber-400 border-amber-500/30';
  return 'bg-muted text-muted-foreground border-border/40';
}

function formatDateTime(iso: string, isRTL: boolean): string {
  try {
    return new Date(iso).toLocaleString(isRTL ? 'ar-SA' : 'en-US', {
      year: 'numeric', month: 'short', day: '2-digit',
      hour: '2-digit', minute: '2-digit',
    });
  } catch { return iso; }
}

export function AdminOperationalNotesPanel({ scopedRefId, isRTL }: Props) {
  const tx = useMemo(() => ({
    title: isRTL ? 'ملاحظات الدعم والتصعيد' : 'Admin Notes & Escalations',
    subtitle: isRTL
      ? 'سجل داخلي للمسؤولين فقط — لا يظهر لمقدمي الخدمة أو المستخدمين.'
      : 'Internal admin-only log — not visible to providers or users.',
    summaryOpen: isRTL ? 'مفتوحة' : 'Open',
    summaryCritical: isRTL ? 'حرجة' : 'Critical',
    summaryStale: isRTL ? 'متأخرة > 7 أيام' : 'Older than 7 days',
    filtersStatus: isRTL ? 'الحالة' : 'Status',
    filtersSeverity: isRTL ? 'الخطورة' : 'Severity',
    all: isRTL ? 'الكل' : 'All',
    open: isRTL ? 'مفتوحة' : 'Open',
    resolved: isRTL ? 'مغلقة' : 'Resolved',
    info: isRTL ? 'معلومة' : 'Info',
    warning: isRTL ? 'تحذير' : 'Warning',
    critical: isRTL ? 'حرج' : 'Critical',
    createTitle: isRTL ? 'إضافة ملاحظة' : 'Add a note',
    createScopeHint: isRTL
      ? 'يلزم رقم مرجعي رسمي (مثل WO-1000001) في حقل البحث أعلاه.'
      : 'Enter an official ref (e.g. WO-1000001) in the search above to add a note.',
    entity: isRTL ? 'النوع' : 'Entity',
    severity: isRTL ? 'الخطورة' : 'Severity',
    notePh: isRTL ? 'اكتب ملاحظة دعم داخلية (لا تذكر بيانات حساسة)' : 'Internal support note (avoid sensitive data)',
    submit: isRTL ? 'إضافة' : 'Add note',
    submitting: isRTL ? 'جارٍ الحفظ…' : 'Saving…',
    resolve: isRTL ? 'إغلاق' : 'Resolve',
    resolveErr: isRTL ? 'تعذّر الإغلاق.' : 'Failed to resolve.',
    createErr: isRTL ? 'تعذّر الحفظ. تحقق من المحتوى.' : 'Could not save. Check the content.',
    loadErr: isRTL ? 'تعذّر تحميل الملاحظات.' : 'Failed to load notes.',
    empty: isRTL ? 'لا توجد ملاحظات.' : 'No notes yet.',
    listScope: (ref: string) => isRTL ? `النطاق: ${ref}` : `Scope: ${ref}`,
    listGlobal: isRTL ? 'النطاق: كل المراجع' : 'Scope: all refs',
    resolvedAt: isRTL ? 'أُغلقت' : 'Resolved',
  }), [isRTL]);

  const trimmedScope = (scopedRefId ?? '').trim().toUpperCase();
  const scopeValid = trimmedScope.length > 0 && isOfficialAdminNoteRef(trimmedScope);

  const [status, setStatus] = useState<AdminNoteStatus | 'all'>('open');
  const [severity, setSeverity] = useState<AdminNoteSeverity | 'all'>('all');
  const [notes, setNotes] = useState<AdminOperationalNoteRow[]>([]);
  const [summary, setSummary] = useState<AdminOperationalNotesSummary | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [formEntity, setFormEntity] = useState<AdminNoteEntityType>('other');
  const [formSeverity, setFormSeverity] = useState<AdminNoteSeverity>('info');
  const [formNote, setFormNote] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [resolvingId, setResolvingId] = useState<string | null>(null);

  const reload = useCallback(async () => {
    setLoading(true);
    setError(null);
    const [listRes, sumRes] = await Promise.all([
      listAdminOperationalNotes({
        refId: scopeValid ? trimmedScope : undefined,
        status,
        severity,
        limit: 100,
      }),
      getAdminOperationalNotesSummary(),
    ]);
    if (listRes.error || sumRes.error) setError(tx.loadErr);
    setNotes(listRes.data ?? []);
    setSummary(sumRes.data ?? null);
    setLoading(false);
  }, [trimmedScope, scopeValid, status, severity, tx.loadErr]);

  useEffect(() => { void reload(); }, [reload]);

  const handleCreate = useCallback(async () => {
    if (!scopeValid) return;
    setSubmitting(true);
    setFormError(null);
    const res = await createAdminOperationalNote({
      refId: trimmedScope,
      entityType: formEntity,
      note: formNote,
      severity: formSeverity,
    });
    setSubmitting(false);
    if (res.error) {
      setFormError(tx.createErr);
      return;
    }
    setFormNote('');
    setFormSeverity('info');
    void reload();
  }, [scopeValid, trimmedScope, formEntity, formNote, formSeverity, tx.createErr, reload]);

  const handleResolve = useCallback(async (id: string) => {
    setResolvingId(id);
    const res = await resolveAdminOperationalNote({ id });
    setResolvingId(null);
    if (res.error) {
      setError(tx.resolveErr);
      return;
    }
    void reload();
  }, [reload, tx.resolveErr]);

  return (
    <Card className="border-border/40" data-testid="admin-notes-panel">
      <CardHeader className="pb-2">
        <CardTitle className="text-sm flex items-center gap-2">
          <StickyNote className="w-4 h-4 text-accent" />
          {tx.title}
        </CardTitle>
        <p className="text-[11px] text-muted-foreground">{tx.subtitle}</p>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="grid grid-cols-3 gap-2">
          <div className="rounded-xl border border-border/40 p-2">
            <div className="text-[10px] text-muted-foreground">{tx.summaryOpen}</div>
            <div className="text-lg font-semibold tabular-nums">{summary?.open ?? 0}</div>
          </div>
          <div className="rounded-xl border border-destructive/30 bg-destructive/5 p-2">
            <div className="text-[10px] text-destructive">{tx.summaryCritical}</div>
            <div className="text-lg font-semibold tabular-nums text-destructive">
              {summary?.critical ?? 0}
            </div>
          </div>
          <div className="rounded-xl border border-amber-500/30 bg-amber-500/5 p-2">
            <div className="text-[10px] text-amber-600 dark:text-amber-400">{tx.summaryStale}</div>
            <div className="text-lg font-semibold tabular-nums text-amber-600 dark:text-amber-400">
              {summary?.staleOpen ?? 0}
            </div>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <Select value={status} onValueChange={(v) => setStatus(v as AdminNoteStatus | 'all')}>
            <SelectTrigger className="h-8 w-32 text-xs" aria-label={tx.filtersStatus}>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">{tx.all}</SelectItem>
              <SelectItem value="open">{tx.open}</SelectItem>
              <SelectItem value="resolved">{tx.resolved}</SelectItem>
            </SelectContent>
          </Select>
          <Select value={severity} onValueChange={(v) => setSeverity(v as AdminNoteSeverity | 'all')}>
            <SelectTrigger className="h-8 w-32 text-xs" aria-label={tx.filtersSeverity}>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">{tx.all}</SelectItem>
              <SelectItem value="info">{tx.info}</SelectItem>
              <SelectItem value="warning">{tx.warning}</SelectItem>
              <SelectItem value="critical">{tx.critical}</SelectItem>
            </SelectContent>
          </Select>
          <span className="text-[11px] text-muted-foreground ms-auto tech-content">
            {scopeValid ? tx.listScope(trimmedScope) : tx.listGlobal}
          </span>
        </div>

        <div className="rounded-xl border border-border/40 p-3 space-y-2">
          <div className="text-xs font-medium flex items-center gap-1">
            <FileWarning className="w-3.5 h-3.5 text-accent" /> {tx.createTitle}
          </div>
          {!scopeValid ? (
            <p className="text-[11px] text-muted-foreground">{tx.createScopeHint}</p>
          ) : (
            <>
              <div className="grid grid-cols-2 gap-2">
                <Select value={formEntity} onValueChange={(v) => setFormEntity(v as AdminNoteEntityType)}>
                  <SelectTrigger className="h-8 text-xs" aria-label={tx.entity}>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {(['work_order','contract','quote','lead','booking','task','other'] as AdminNoteEntityType[]).map((e) => (
                      <SelectItem key={e} value={e}>{e}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Select value={formSeverity} onValueChange={(v) => setFormSeverity(v as AdminNoteSeverity)}>
                  <SelectTrigger className="h-8 text-xs" aria-label={tx.severity}>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="info">{tx.info}</SelectItem>
                    <SelectItem value="warning">{tx.warning}</SelectItem>
                    <SelectItem value="critical">{tx.critical}</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <Textarea
                value={formNote}
                onChange={(e) => setFormNote(e.target.value)}
                placeholder={tx.notePh}
                maxLength={2000}
                rows={3}
                className="text-xs"
                dir="auto"
              />
              {formError ? (
                <div className="text-[11px] text-destructive inline-flex items-center gap-1">
                  <AlertCircle className="w-3 h-3" /> {formError}
                </div>
              ) : null}
              <div className="flex justify-end">
                <Button
                  type="button"
                  size="sm"
                  className="rounded-xl h-8"
                  onClick={() => void handleCreate()}
                  disabled={submitting || formNote.trim().length === 0}
                  data-testid="admin-notes-create-submit"
                >
                  {submitting ? (
                    <><Loader2 className="w-3 h-3 me-1 animate-spin" /> {tx.submitting}</>
                  ) : tx.submit}
                </Button>
              </div>
            </>
          )}
        </div>

        {error ? (
          <div className="text-[11px] text-destructive inline-flex items-center gap-1">
            <AlertCircle className="w-3 h-3" /> {error}
          </div>
        ) : null}

        <div className="space-y-2" data-testid="admin-notes-list">
          {loading && notes.length === 0 ? (
            <p className="text-xs text-muted-foreground inline-flex items-center gap-1">
              <Loader2 className="w-3 h-3 animate-spin" /> …
            </p>
          ) : notes.length === 0 ? (
            <p className="text-xs text-muted-foreground">{tx.empty}</p>
          ) : notes.map((n) => (
            <div
              key={n.id}
              data-testid="admin-note-row"
              className="rounded-xl border border-border/40 p-2.5 space-y-1.5"
            >
              <div className="flex items-center gap-2 flex-wrap">
                <ReferenceBadge refId={n.ref_id} />
                <Badge variant="outline" className="tech-content text-[10px]">
                  {n.entity_type}
                </Badge>
                <Badge
                  variant="outline"
                  className={`text-[10px] ${severityTone(n.severity)}`}
                >
                  {n.severity === 'critical' && <ShieldAlert className="w-3 h-3 me-1 inline" />}
                  {n.severity}
                </Badge>
                <Badge variant="secondary" className="text-[10px]">
                  {n.status === 'open' ? tx.open : tx.resolved}
                </Badge>
                <span className="text-[10px] text-muted-foreground ms-auto tech-content">
                  {formatDateTime(n.created_at, isRTL)}
                </span>
              </div>
              <p className="text-xs whitespace-pre-wrap break-words text-foreground" dir="auto">
                {n.note}
              </p>
              {n.status === 'resolved' && n.resolved_at ? (
                <p className="text-[10px] text-muted-foreground inline-flex items-center gap-1">
                  <CheckCircle2 className="w-3 h-3 text-emerald-600 dark:text-emerald-400" />
                  {tx.resolvedAt} · {formatDateTime(n.resolved_at, isRTL)}
                </p>
              ) : (
                <div className="flex justify-end">
                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    className="rounded-xl h-7"
                    onClick={() => void handleResolve(n.id)}
                    disabled={resolvingId === n.id}
                    data-testid="admin-note-resolve"
                  >
                    {resolvingId === n.id ? (
                      <Loader2 className="w-3 h-3 animate-spin" />
                    ) : (
                      <><CheckCircle2 className="w-3 h-3 me-1" /> {tx.resolve}</>
                    )}
                  </Button>
                </div>
              )}
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}