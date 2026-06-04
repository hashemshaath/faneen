import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { useLanguage } from '@/i18n/LanguageContext';
import { usePageMeta } from '@/hooks/usePageMeta';
import { useNoIndex } from '@/hooks/useNoIndex';
import { MaybeDashboardLayout as DashboardLayout } from '@/components/admin/MaybeDashboardLayout';
import { AdminPageHeader } from '@/components/admin/AdminPageHeader';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Skeleton } from '@/components/ui/skeleton';
import { Textarea } from '@/components/ui/textarea';
import {
  Loader2, Check, X, Building2, User, Clock, CheckCircle2, XCircle,
  RefreshCw, AlertTriangle, ArrowRightLeft, ExternalLink, Inbox,
} from 'lucide-react';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';

type Status = 'pending' | 'approved' | 'rejected' | 'cancelled';
type Filter = Status | 'all';

interface RequestRow {
  id: string;
  business_id: string;
  requester_user_id: string;
  status: Status;
  message: string | null;
  admin_note: string | null;
  reviewed_by: string | null;
  reviewed_at: string | null;
  created_at: string;
  updated_at: string;
  business?: {
    id: string;
    name_ar: string | null;
    name_en: string | null;
    username: string | null;
    ref_id: string | null;
    placeholder_owner: boolean | null;
  } | null;
  requester?: {
    user_id: string;
    full_name: string | null;
    full_name_ar: string | null;
    email: string | null;
    ref_id: string | null;
  } | null;
}

interface PlaceholderReport {
  placeholder_email: string;
  placeholder_user_id: string | null;
  linked_businesses_count: number;
  transfer_requests: { pending: number; approved: number; rejected: number };
  generated_at: string;
}

const STATUS_LABEL: Record<Status, { ar: string; en: string }> = {
  pending:   { ar: 'قيد المراجعة', en: 'Pending' },
  approved:  { ar: 'تمت الموافقة',  en: 'Approved' },
  rejected:  { ar: 'مرفوض',         en: 'Rejected' },
  cancelled: { ar: 'ملغى',          en: 'Cancelled' },
};
const STATUS_STYLE: Record<Status, string> = {
  pending:   'bg-warning/10 text-warning border-warning/30',
  approved:  'bg-success/10 text-success border-success/30',
  rejected:  'bg-destructive/10 text-destructive border-destructive/30',
  cancelled: 'bg-muted text-muted-foreground border-border',
};
const STATUS_ICON: Record<Status, React.ComponentType<{ className?: string }>> = {
  pending: Clock, approved: CheckCircle2, rejected: XCircle, cancelled: XCircle,
};

const AdminOwnershipTransferRequests: React.FC = () => {
  const { isRTL } = useLanguage();
  usePageMeta({ title: isRTL ? 'طلبات نقل ملكية المنشآت' : 'Ownership Transfer Requests', noindex: true });
  useNoIndex();

  const [rows, setRows] = useState<RequestRow[]>([]);
  const [report, setReport] = useState<PlaceholderReport | null>(null);
  const [loading, setLoading] = useState(false);
  const [filter, setFilter] = useState<Filter>('pending');
  const [acting, setActing] = useState<string | null>(null);
  const [noteFor, setNoteFor] = useState<string | null>(null);
  const [noteText, setNoteText] = useState('');
  const [errorFor, setErrorFor] = useState<{ id: string; msg: string; action: 'approve' | 'reject' } | null>(null);

  const loadReport = useCallback(async () => {
    const { data, error } = await supabase.rpc('get_placeholder_owner_report');
    if (!error && data) setReport(data as unknown as PlaceholderReport);
  }, []);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      let q = supabase
        .from('business_ownership_transfer_requests')
        .select('id, business_id, requester_user_id, status, message, admin_note, reviewed_by, reviewed_at, created_at, updated_at')
        .order('created_at', { ascending: false })
        .limit(200);
      if (filter !== 'all') q = q.eq('status', filter);
      const { data: reqs, error } = await q;
      if (error) throw error;
      const list = (reqs ?? []) as RequestRow[];
      const bizIds = Array.from(new Set(list.map((r) => r.business_id)));
      const userIds = Array.from(new Set(list.map((r) => r.requester_user_id)));
      const [biz, profs] = await Promise.all([
        bizIds.length
          ? supabase.from('businesses').select('id, name_ar, name_en, username, ref_id, placeholder_owner').in('id', bizIds)
          : Promise.resolve({ data: [] as RequestRow['business'][] }),
        userIds.length
          ? supabase.from('profiles').select('user_id, full_name, full_name_ar, email, ref_id').in('user_id', userIds)
          : Promise.resolve({ data: [] as RequestRow['requester'][] }),
      ]);
      const bizMap = new Map<string, RequestRow['business']>((biz.data ?? []).map((b) => [(b as { id: string }).id, b as RequestRow['business']]));
      const profMap = new Map<string, RequestRow['requester']>((profs.data ?? []).map((p) => [(p as { user_id: string }).user_id, p as RequestRow['requester']]));
      setRows(list.map((r) => ({ ...r, business: bizMap.get(r.business_id) ?? null, requester: profMap.get(r.requester_user_id) ?? null })));
    } catch (err) {
      toast.error(err instanceof Error ? err.message : String(err));
    } finally {
      setLoading(false);
    }
  }, [filter]);

  useEffect(() => { void load(); void loadReport(); }, [load, loadReport]);

  const counts = useMemo(() => {
    const c = { pending: 0, approved: 0, rejected: 0, cancelled: 0 };
    for (const r of rows) c[r.status] = (c[r.status] ?? 0) + 1;
    return c;
  }, [rows]);

  const runApprove = useCallback(async (req: RequestRow, note: string) => {
    setActing(req.id); setErrorFor(null);
    try {
      const { error } = await supabase.rpc('admin_transfer_business_ownership', {
        _request_id: req.id,
        _admin_note: note || null,
      });
      if (error) throw error;
      toast.success(isRTL ? 'تم نقل الملكية بنجاح' : 'Ownership transferred successfully');
      setNoteFor(null); setNoteText('');
      await Promise.all([load(), loadReport()]);
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      setErrorFor({ id: req.id, msg, action: 'approve' });
      toast.error(isRTL ? `تعذّر تنفيذ النقل: ${msg}` : `Transfer failed: ${msg}`);
    } finally {
      setActing(null);
    }
  }, [isRTL, load, loadReport]);

  const runReject = useCallback(async (req: RequestRow, note: string) => {
    setActing(req.id); setErrorFor(null);
    try {
      const { error } = await supabase.rpc('admin_reject_business_ownership_transfer', {
        _request_id: req.id,
        _admin_note: note || null,
      });
      if (error) throw error;
      toast.success(isRTL ? 'تم رفض الطلب' : 'Request rejected');
      setNoteFor(null); setNoteText('');
      await load();
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      setErrorFor({ id: req.id, msg, action: 'reject' });
      toast.error(isRTL ? `تعذّر الرفض: ${msg}` : `Reject failed: ${msg}`);
    } finally {
      setActing(null);
    }
  }, [isRTL, load]);

  const FILTERS: { id: Filter; ar: string; en: string }[] = [
    { id: 'pending', ar: 'معلّقة', en: 'Pending' },
    { id: 'approved', ar: 'موافق عليها', en: 'Approved' },
    { id: 'rejected', ar: 'مرفوضة', en: 'Rejected' },
    { id: 'cancelled', ar: 'ملغاة', en: 'Cancelled' },
    { id: 'all', ar: 'الكل', en: 'All' },
  ];

  return (
    <DashboardLayout>
      <div className="space-y-4 max-w-6xl mx-auto">
        <AdminPageHeader
          icon={ArrowRightLeft}
          title={isRTL ? 'طلبات نقل ملكية المنشآت' : 'Ownership Transfer Requests'}
          subtitle={isRTL
            ? 'المنشآت المُنشأة تحت الحساب المؤقت (com@qitaat.com) يمكن لمالكها الحقيقي طلب تسلّمها. راجع الطلب ووافق لنقل الملكية، أو ارفض مع سبب.'
            : 'Entities created under the placeholder account (com@qitaat.com) can be claimed by their real owner. Review, then approve to transfer ownership or reject with a reason.'}
          actions={
            <Button variant="outline" size="sm" onClick={() => { void load(); void loadReport(); }} disabled={loading} className="rounded-xl">
              <RefreshCw className={`w-3.5 h-3.5 me-1.5 ${loading ? 'animate-spin' : ''}`} /> {isRTL ? 'تحديث' : 'Refresh'}
            </Button>
          }
        />

        {/* Placeholder account report */}
        {report && (
          <div className="rounded-2xl border border-primary/30 bg-primary/5 p-4 grid grid-cols-2 sm:grid-cols-4 gap-3 text-center">
            <div>
              <div className="text-[10.5px] text-muted-foreground">{isRTL ? 'الحساب المؤقت' : 'Placeholder account'}</div>
              <div className="text-xs font-mono tech-content mt-1 truncate">{report.placeholder_email}</div>
            </div>
            <div>
              <div className="text-[10.5px] text-muted-foreground">{isRTL ? 'المنشآت المرتبطة' : 'Linked entities'}</div>
              <div className="text-xl font-bold mt-0.5">{report.linked_businesses_count}</div>
            </div>
            <div>
              <div className="text-[10.5px] text-muted-foreground">{isRTL ? 'طلبات معلّقة' : 'Pending requests'}</div>
              <div className="text-xl font-bold text-warning mt-0.5">{report.transfer_requests.pending}</div>
            </div>
            <div>
              <div className="text-[10.5px] text-muted-foreground">{isRTL ? 'تم نقلها' : 'Transferred'}</div>
              <div className="text-xl font-bold text-success mt-0.5">{report.transfer_requests.approved}</div>
            </div>
          </div>
        )}

        {/* Filter tabs */}
        <div className="flex flex-wrap gap-1.5 rounded-xl border border-border/40 bg-card p-1.5">
          {FILTERS.map((f) => {
            const active = filter === f.id;
            const count = f.id === 'all' ? rows.length : (counts[f.id as Status] ?? 0);
            return (
              <button
                key={f.id}
                type="button"
                onClick={() => setFilter(f.id)}
                className={`h-9 px-3 rounded-lg text-[11.5px] font-medium transition-all flex items-center gap-1.5 ${
                  active ? 'bg-primary text-primary-foreground shadow-sm' : 'text-muted-foreground hover:bg-muted/60'
                }`}
              >
                {isRTL ? f.ar : f.en}
                {count > 0 && (
                  <span className={`text-[10px] px-1.5 py-0.5 rounded-md ${active ? 'bg-primary-foreground/20' : 'bg-muted'}`}>{count}</span>
                )}
              </button>
            );
          })}
        </div>

        {/* List */}
        {loading ? (
          <div className="space-y-2">{[...Array(4)].map((_, i) => <Skeleton key={i} className="h-32 rounded-2xl" />)}</div>
        ) : rows.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-border bg-card/40 p-10 text-center">
            <Inbox className="w-10 h-10 mx-auto text-muted-foreground mb-3" />
            <p className="text-sm text-muted-foreground">
              {isRTL ? 'لا توجد طلبات في هذه الحالة.' : 'No requests in this state.'}
            </p>
          </div>
        ) : (
          <div className="space-y-2.5">
            {rows.map((r) => {
              const StatusIcon = STATUS_ICON[r.status];
              const isOpenNote = noteFor === r.id;
              const isActing = acting === r.id;
              const err = errorFor && errorFor.id === r.id ? errorFor : null;
              const reqName = r.requester?.full_name_ar || r.requester?.full_name || r.requester?.email || (isRTL ? 'مستخدم بدون اسم' : 'Unnamed user');
              const bizName = (isRTL ? r.business?.name_ar : r.business?.name_en) || r.business?.name_ar || r.business?.name_en || r.business?.username || '—';
              return (
                <div key={r.id} className="rounded-2xl border border-border bg-card p-4 space-y-3">
                  <div className="flex flex-wrap items-start gap-3 justify-between">
                    <div className="flex items-start gap-3 min-w-0 flex-1">
                      <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center shrink-0">
                        <ArrowRightLeft className="w-4 h-4 text-primary" />
                      </div>
                      <div className="min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <Link to={`/admin/businesses?focus=${r.business_id}`} className="text-sm font-bold hover:underline truncate inline-flex items-center gap-1">
                            <Building2 className="w-3.5 h-3.5 text-muted-foreground" /> {bizName}
                            <ExternalLink className="w-3 h-3 opacity-60" />
                          </Link>
                          {r.business?.ref_id && <span className="text-[10.5px] font-mono text-muted-foreground tech-content">{r.business.ref_id}</span>}
                          {r.business?.username && <span className="text-[10.5px] text-muted-foreground">@{r.business.username}</span>}
                        </div>
                        <div className="text-[11.5px] text-muted-foreground mt-1 flex items-center gap-1.5 flex-wrap">
                          <User className="w-3 h-3" />
                          <span className="font-medium text-foreground">{reqName}</span>
                          {r.requester?.ref_id && <span className="font-mono tech-content">· {r.requester.ref_id}</span>}
                          {r.requester?.email && <span className="tech-content truncate">· {r.requester.email}</span>}
                        </div>
                        {r.message && (
                          <p className="text-[12px] text-foreground/80 mt-2 leading-relaxed bg-muted/40 rounded-lg p-2" dir="auto">
                            {r.message}
                          </p>
                        )}
                      </div>
                    </div>
                    <div className="flex flex-col items-end gap-1 shrink-0">
                      <Badge variant="outline" className={`rounded-lg gap-1 ${STATUS_STYLE[r.status]}`}>
                        <StatusIcon className="w-3 h-3" /> {isRTL ? STATUS_LABEL[r.status].ar : STATUS_LABEL[r.status].en}
                      </Badge>
                      <span className="text-[10px] text-muted-foreground tech-content">{new Date(r.created_at).toLocaleString(isRTL ? 'ar-SA' : 'en-GB')}</span>
                    </div>
                  </div>

                  {r.status !== 'pending' && r.admin_note && (
                    <div className="text-[11.5px] text-muted-foreground border-t border-border/60 pt-2">
                      <span className="font-semibold text-foreground">{isRTL ? 'ملاحظة الادمن:' : 'Admin note:'}</span> {r.admin_note}
                      {r.reviewed_at && <span className="ms-2 tech-content opacity-70">· {new Date(r.reviewed_at).toLocaleString(isRTL ? 'ar-SA' : 'en-GB')}</span>}
                    </div>
                  )}

                  {r.status === 'pending' && (
                    <>
                      {!r.business?.placeholder_owner && (
                        <div className="text-[11px] text-warning bg-warning/10 border border-warning/30 rounded-lg px-2.5 py-1.5 flex items-center gap-1.5">
                          <AlertTriangle className="w-3 h-3" />
                          {isRTL ? 'هذه المنشأة لم تعد مرتبطة بالحساب المؤقت. لا يمكن إكمال النقل.' : 'This entity is no longer linked to the placeholder account. Transfer cannot proceed.'}
                        </div>
                      )}

                      {isOpenNote && (
                        <Textarea
                          value={noteText}
                          onChange={(e) => setNoteText(e.target.value)}
                          dir="auto"
                          placeholder={isRTL ? 'ملاحظة اختيارية تُحفظ في سجل التدقيق…' : 'Optional note saved to the audit log…'}
                          className="rounded-xl text-[12px] min-h-[60px]"
                        />
                      )}

                      <div className="flex flex-wrap items-center gap-2 pt-1">
                        {!isOpenNote ? (
                          <>
                            <Button
                              size="sm"
                              variant="default"
                              disabled={isActing || !r.business?.placeholder_owner}
                              onClick={() => { setNoteFor(r.id); setNoteText(''); }}
                              className="rounded-xl h-9"
                            >
                              <Check className="w-3.5 h-3.5 me-1.5" /> {isRTL ? 'موافقة ونقل الملكية' : 'Approve & transfer'}
                            </Button>
                            <Button
                              size="sm"
                              variant="outline"
                              disabled={isActing}
                              onClick={() => { setNoteFor(`reject:${r.id}`); setNoteText(''); }}
                              className="rounded-xl h-9 border-destructive/40 text-destructive hover:bg-destructive/10"
                            >
                              <X className="w-3.5 h-3.5 me-1.5" /> {isRTL ? 'رفض' : 'Reject'}
                            </Button>
                            <p className="text-[11px] text-muted-foreground">
                              {isRTL
                                ? 'الأثر: ستُحوَّل ملكية المنشأة من الحساب المؤقت إلى المستخدم الطالب، وتُرفَض تلقائياً أي طلبات أخرى معلّقة على نفس المنشأة، ويُسجَّل ذلك في سجل التدقيق.'
                                : 'Impact: ownership moves from the placeholder account to the requester, any other pending requests on the same entity are auto-rejected, and the action is written to the audit log.'}
                            </p>
                          </>
                        ) : (
                          <>
                            <Button
                              size="sm"
                              variant="default"
                              disabled={isActing}
                              onClick={() => {
                                if (noteFor === `reject:${r.id}`) void runReject(r, noteText.trim());
                                else void runApprove(r, noteText.trim());
                              }}
                              className="rounded-xl h-9"
                            >
                              {isActing ? <Loader2 className="w-3.5 h-3.5 me-1.5 animate-spin" /> : <Check className="w-3.5 h-3.5 me-1.5" />}
                              {noteFor === `reject:${r.id}`
                                ? (isRTL ? 'تأكيد الرفض' : 'Confirm reject')
                                : (isRTL ? 'تأكيد النقل' : 'Confirm transfer')}
                            </Button>
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() => { setNoteFor(null); setNoteText(''); setErrorFor(null); }}
                              disabled={isActing}
                              className="rounded-xl h-9"
                            >
                              {isRTL ? 'إلغاء' : 'Cancel'}
                            </Button>
                          </>
                        )}
                      </div>

                      {err && (
                        <div className="rounded-lg border border-destructive/40 bg-destructive/5 px-3 py-2 text-[12px] text-destructive flex items-start gap-2">
                          <AlertTriangle className="w-3.5 h-3.5 mt-0.5 shrink-0" />
                          <div className="flex-1">
                            <div className="font-semibold">{isRTL ? 'فشل تنفيذ العملية' : 'Action failed'}</div>
                            <div className="opacity-90 break-words">{err.msg}</div>
                          </div>
                          <Button
                            size="sm"
                            variant="outline"
                            disabled={isActing}
                            onClick={() => err.action === 'approve' ? void runApprove(r, noteText.trim()) : void runReject(r, noteText.trim())}
                            className="rounded-lg h-7 text-[11px] border-destructive/40 text-destructive hover:bg-destructive/10"
                          >
                            <RefreshCw className="w-3 h-3 me-1" /> {isRTL ? 'إعادة المحاولة' : 'Retry'}
                          </Button>
                        </div>
                      )}
                    </>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </DashboardLayout>
  );
};

export default AdminOwnershipTransferRequests;