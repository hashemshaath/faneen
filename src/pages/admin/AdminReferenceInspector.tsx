import { useCallback, useEffect, useMemo, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import {
  Activity, AlertCircle, ExternalLink, GitBranch, Loader2, RefreshCw,
  ShieldCheck, Search as SearchIcon,
} from 'lucide-react';
import { DashboardLayout } from '@/components/dashboard/DashboardLayout';
import { useLanguage } from '@/i18n/LanguageContext';
import { useNoIndex } from '@/hooks/useNoIndex';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { ReferenceBadge } from '@/components/reference/ReferenceBadge';
import { UnifiedOperationsFeed } from '@/components/operations/UnifiedOperationsFeed';
import { AdminOperationalNotesPanel } from '@/components/admin/AdminOperationalNotesPanel';
import {
  getAdminReferenceSummary,
  isOfficialAdminRef,
  ADMIN_REF_OFFICIAL,
  type AdminReferenceInspectorBundle,
} from '@/modules/admin';

/**
 * BUSINESS-ADMIN-3 — Admin Reference Inspector.
 *
 * Deep-link inspector at /admin/ref/:refId. Read-only, admin-only,
 * useNoIndex. Uses ONLY admin-safe wrappers from @/modules/admin —
 * no direct supabase.from, no mutations except notes create/resolve
 * (delegated to AdminOperationalNotesPanel). Rejects UUIDs.
 */

const PREFIX_LABELS: Record<string, { en: string; ar: string }> = {
  WO: { en: 'Work Order', ar: 'أمر عمل' },
  TASK: { en: 'Task', ar: 'مهمة' },
  CNT: { en: 'Contract', ar: 'عقد' },
  QTE: { en: 'Quote', ar: 'عرض سعر' },
  LED: { en: 'Lead', ar: 'طلب' },
  BKG: { en: 'Booking', ar: 'حجز' },
  ENT: { en: 'Business', ar: 'منشأة' },
  PAY: { en: 'Payment', ar: 'دفع' },
  PVS: { en: 'Provider Subscription', ar: 'اشتراك مزود' },
  STF: { en: 'Staff', ar: 'موظف' },
};

function prefixOf(ref: string): string {
  const i = ref.indexOf('-');
  return i > 0 ? ref.slice(0, i).toUpperCase() : '';
}

export default function AdminReferenceInspector() {
  useNoIndex();
  const { isRTL } = useLanguage();
  const params = useParams<{ refId: string }>();
  const rawRef = (params.refId ?? '').trim();
  const refId = rawRef.toUpperCase();
  const refValid = isOfficialAdminRef(refId);

  const tx = useMemo(() => ({
    title: isRTL ? 'مستكشف المراجع' : 'Admin Reference Inspector',
    subtitle: isRTL
      ? 'فحص آمن للمراجع الرسمية — قراءة فقط للدعم والمراجعة.'
      : 'Safe inspection of official references — read-only for support.',
    refresh: isRTL ? 'تحديث' : 'Refresh',
    retry: isRTL ? 'إعادة المحاولة' : 'Retry',
    invalidTitle: isRTL ? 'مرجع غير صالح' : 'Invalid reference',
    invalidDesc: isRTL
      ? 'يُقبل فقط مراجع رسمية بالنمط PREFIX-NNNN. لا تُقبل معرّفات UUID.'
      : 'Only official refs (PREFIX-NNNN) are accepted. UUIDs are rejected.',
    notFoundTitle: isRTL ? 'لم يُعثر على هذا المرجع' : 'Reference not found',
    notFoundDesc: isRTL
      ? 'لم يتم العثور على عنصر مطابق. قد يكون محذوفًا أو خارج النطاق.'
      : 'No matching entity. It may be deleted or out of scope.',
    loadErr: isRTL ? 'تعذّر التحميل.' : 'Failed to load.',
    summary: isRTL ? 'الملخص' : 'Summary',
    entityType: isRTL ? 'النوع' : 'Type',
    status: isRTL ? 'الحالة' : 'Status',
    priority: isRTL ? 'الأولوية' : 'Priority',
    business: isRTL ? 'المنشأة' : 'Business',
    source: isRTL ? 'المصدر' : 'Source',
    created: isRTL ? 'تاريخ الإنشاء' : 'Created',
    updated: isRTL ? 'آخر تحديث' : 'Updated',
    canonical: isRTL ? 'الصفحة الرسمية' : 'Canonical page',
    open: isRTL ? 'فتح' : 'Open',
    related: isRTL ? 'المراجع المرتبطة' : 'Related references',
    relatedEmpty: isRTL ? 'لا توجد مراجع مرتبطة.' : 'No related references.',
    activity: isRTL ? 'النشاط (مفلتر بهذا المرجع)' : 'Activity (filtered to this ref)',
    safe: isRTL ? 'قراءة فقط — لا يوجد تعديل.' : 'Read-only — no mutations.',
    inspectAnother: isRTL ? 'فحص مرجع آخر' : 'Inspect another ref',
    inspectPh: isRTL ? 'مثل WO-1000001' : 'e.g. WO-1000001',
    go: isRTL ? 'انتقل' : 'Go',
    backToConsole: isRTL ? 'العودة إلى مركز العمليات' : 'Back to Operations Console',
  }), [isRTL]);

  const [bundle, setBundle] = useState<AdminReferenceInspectorBundle | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [searchInput, setSearchInput] = useState('');
  const searchUp = searchInput.trim().toUpperCase();
  const searchValid = isOfficialAdminRef(searchUp);

  const reload = useCallback(async () => {
    if (!refValid) return;
    setLoading(true);
    setError(null);
    const res = await getAdminReferenceSummary({ refId });
    if (res.error) setError(tx.loadErr);
    setBundle(res.data);
    setLoading(false);
  }, [refValid, refId, tx.loadErr]);

  useEffect(() => { void reload(); }, [reload]);

  const prefix = prefixOf(refId);
  const typeLabel = PREFIX_LABELS[prefix]
    ? (isRTL ? PREFIX_LABELS[prefix].ar : PREFIX_LABELS[prefix].en)
    : '—';

  function formatDate(iso: string | null | undefined): string {
    if (!iso) return '—';
    try {
      return new Date(iso).toLocaleString(isRTL ? 'ar-SA-u-nu-latn' : 'en-US', {
        year: 'numeric', month: 'short', day: '2-digit',
        hour: '2-digit', minute: '2-digit',
      });
    } catch { return iso; }
  }

  return (
    <DashboardLayout>
      <div className="space-y-4" dir={isRTL ? 'rtl' : 'ltr'}>
        <div className="flex items-start justify-between gap-2 flex-wrap">
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
          <div className="flex items-center gap-2">
            <Button
              asChild
              type="button"
              variant="ghost"
              size="sm"
              className="rounded-xl h-8"
            >
              <Link to="/admin/operations/console">{tx.backToConsole}</Link>
            </Button>
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="rounded-xl h-8"
              onClick={() => void reload()}
              disabled={!refValid || loading}
              aria-label={tx.refresh}
            >
              <RefreshCw className={`w-3.5 h-3.5 me-1 ${loading ? 'animate-spin' : ''}`} />
              {tx.refresh}
            </Button>
          </div>
        </div>

        {/* Header badge row */}
        <Card className="border-border/40">
          <CardContent className="p-4 flex flex-wrap items-center gap-2">
            {refValid ? (
              <ReferenceBadge refId={refId} />
            ) : (
              <Badge variant="outline" className="tech-content text-[10px]">{refId || '—'}</Badge>
            )}
            <Badge variant="secondary" className="text-[10px]">{typeLabel}</Badge>
            {bundle?.summary?.status ? (
              <Badge variant="outline" className="tech-content text-[10px]">
                {bundle.summary.status}
              </Badge>
            ) : null}
            {bundle?.summary?.priority ? (
              <Badge variant="secondary" className="tech-content text-[10px]">
                {bundle.summary.priority}
              </Badge>
            ) : null}
          </CardContent>
        </Card>

        {/* Inspect-another form */}
        <Card className="border-border/40">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm flex items-center gap-2">
              <SearchIcon className="w-4 h-4 text-muted-foreground" /> {tx.inspectAnother}
            </CardTitle>
          </CardHeader>
          <CardContent className="flex flex-wrap items-center gap-2">
            <Input
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
              placeholder={tx.inspectPh}
              aria-label={tx.inspectAnother}
              className="h-9 text-xs tech-content max-w-xs"
            />
            <Button
              asChild={searchValid}
              type="button"
              size="sm"
              className="rounded-xl h-9"
              disabled={!searchValid}
            >
              {searchValid
                ? <Link to={`/admin/ref/${searchUp}`}>{tx.go}</Link>
                : <span>{tx.go}</span>}
            </Button>
          </CardContent>
        </Card>

        {/* Invalid-ref state */}
        {!refValid ? (
          <Card className="border-destructive/40 bg-destructive/5">
            <CardContent className="p-4">
              <div className="text-sm font-medium text-destructive flex items-center gap-2">
                <AlertCircle className="w-4 h-4" /> {tx.invalidTitle}
              </div>
              <p className="text-xs text-muted-foreground mt-1">{tx.invalidDesc}</p>
            </CardContent>
          </Card>
        ) : null}

        {/* Error state */}
        {refValid && error ? (
          <div className="flex items-center justify-between gap-2 rounded-xl border border-destructive/30 bg-destructive/5 px-3 py-2 text-xs text-destructive">
            <span className="inline-flex items-center gap-2">
              <AlertCircle className="w-3.5 h-3.5" /> {error}
            </span>
            <Button onClick={() => void reload()} size="sm" variant="outline" className="rounded-xl h-7">
              {tx.retry}
            </Button>
          </div>
        ) : null}

        {/* Loading state */}
        {refValid && loading && !bundle ? (
          <Card className="border-border/40">
            <CardContent className="p-6 text-xs text-muted-foreground inline-flex items-center gap-2">
              <Loader2 className="w-3.5 h-3.5 animate-spin" /> …
            </CardContent>
          </Card>
        ) : null}

        {/* Not-found state */}
        {refValid && !loading && bundle && !bundle.found ? (
          <Card className="border-border/40">
            <CardContent className="p-4">
              <div className="text-sm font-medium flex items-center gap-2">
                <AlertCircle className="w-4 h-4 text-amber-600 dark:text-amber-400" />
                {tx.notFoundTitle}
              </div>
              <p className="text-xs text-muted-foreground mt-1">{tx.notFoundDesc}</p>
            </CardContent>
          </Card>
        ) : null}

        {/* Summary card */}
        {refValid && bundle?.summary ? (
          <Card className="border-border/40">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm">{tx.summary}</CardTitle>
            </CardHeader>
            <CardContent className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
              <div>
                <div className="text-[10px] text-muted-foreground">{tx.entityType}</div>
                <div className="tech-content">{bundle.summary.entity_type}</div>
              </div>
              {bundle.summary.label ? (
                <div className="sm:col-span-2">
                  <div className="text-[10px] text-muted-foreground">{tx.summary}</div>
                  <div className="break-words" dir="auto">{bundle.summary.label}</div>
                </div>
              ) : null}
              <div>
                <div className="text-[10px] text-muted-foreground">{tx.status}</div>
                <div className="tech-content">{bundle.summary.status ?? '—'}</div>
              </div>
              <div>
                <div className="text-[10px] text-muted-foreground">{tx.priority}</div>
                <div className="tech-content">{bundle.summary.priority ?? '—'}</div>
              </div>
              <div>
                <div className="text-[10px] text-muted-foreground">{tx.source}</div>
                {bundle.summary.source_ref_id
                  && ADMIN_REF_OFFICIAL.test(bundle.summary.source_ref_id) ? (
                  <Link
                    to={`/admin/ref/${bundle.summary.source_ref_id}`}
                    className="hover:opacity-80"
                  >
                    <ReferenceBadge refId={bundle.summary.source_ref_id} />
                  </Link>
                ) : <span className="text-muted-foreground">—</span>}
              </div>
              <div>
                <div className="text-[10px] text-muted-foreground">{tx.created}</div>
                <div className="tech-content">{formatDate(bundle.summary.created_at)}</div>
              </div>
              <div>
                <div className="text-[10px] text-muted-foreground">{tx.updated}</div>
                <div className="tech-content">{formatDate(bundle.summary.updated_at)}</div>
              </div>
              {bundle.summary.canonical_route ? (
                <div className="sm:col-span-2">
                  <div className="text-[10px] text-muted-foreground">{tx.canonical}</div>
                  <Button
                    asChild
                    type="button"
                    size="sm"
                    variant="outline"
                    className="rounded-xl h-8 mt-1"
                  >
                    <Link to={bundle.summary.canonical_route}>
                      <ExternalLink className="w-3 h-3 me-1" /> {tx.open}
                    </Link>
                  </Button>
                </div>
              ) : null}
            </CardContent>
          </Card>
        ) : null}

        {/* Related references */}
        {refValid && bundle ? (
          <Card className="border-border/40">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm flex items-center gap-2">
                <GitBranch className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                {tx.related}
              </CardTitle>
            </CardHeader>
            <CardContent className="p-3">
              {bundle.related_refs.length === 0 ? (
                <p className="text-xs text-muted-foreground">{tx.relatedEmpty}</p>
              ) : (
                <div className="flex flex-wrap gap-1.5" data-testid="related-refs">
                  {bundle.related_refs
                    .filter((r) => ADMIN_REF_OFFICIAL.test(r))
                    .map((r) => (
                      <Link
                        key={r}
                        to={`/admin/ref/${r}`}
                        className="hover:opacity-80"
                        aria-label={r}
                      >
                        <ReferenceBadge refId={r} />
                      </Link>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        ) : null}

        {/* Activity feed (filtered to this ref) */}
        {refValid && bundle ? (
          <Card className="border-border/40">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm flex items-center gap-2">
                <Activity className="w-4 h-4 text-accent" /> {tx.activity}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <UnifiedOperationsFeed
                businessId=""
                isRTL={isRTL}
                initialEvents={bundle.events}
              />
            </CardContent>
          </Card>
        ) : null}

        {/* Admin notes panel scoped to this ref */}
        {refValid ? (
          <AdminOperationalNotesPanel scopedRefId={refId} isRTL={isRTL} />
        ) : null}
      </div>
    </DashboardLayout>
  );
}