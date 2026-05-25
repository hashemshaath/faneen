import React, { useEffect, useState, useCallback } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useLanguage } from '@/i18n/LanguageContext';
import { usePageMeta } from '@/hooks/usePageMeta';
import { useNoIndex } from '@/hooks/useNoIndex';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Loader2, Check, X, Mail, Building2, RefreshCw } from 'lucide-react';
import { toast } from 'sonner';
import {
  listEntityAccessRequests,
  reviewEntityAccessRequest,
  type EntityAccessRequestListRow,
} from '@/modules/entities/services/access';

/**
 * REGISTRATION-UX-FULL-COMPLETE-1 Part 2 — admin queue for
 * `entity_access_requests`. Admin-only route (gated in `App.tsx` via
 * `requireAdmin`). Safe fields only — no requester email/phone, no tokens.
 */
type StatusFilter = 'pending' | 'approved' | 'rejected' | 'all';

const STATUS_LABEL: Record<string, { ar: string; en: string }> = {
  pending: { ar: 'قيد المراجعة', en: 'Pending' },
  approved: { ar: 'تمت الموافقة', en: 'Approved' },
  rejected: { ar: 'مرفوض', en: 'Rejected' },
  cancelled: { ar: 'ملغى', en: 'Cancelled' },
};

const AdminEntityAccessRequests: React.FC = () => {
  const { user, isAdmin, isSuperAdmin } = useAuth();
  const { isRTL } = useLanguage();
  usePageMeta({ title: isRTL ? 'طلبات الانضمام للمنشآت' : 'Entity Access Requests', noindex: true });
  useNoIndex();

  const [rows, setRows] = useState<EntityAccessRequestListRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [filter, setFilter] = useState<StatusFilter>('pending');
  const [acting, setActing] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    const { data, error } = await listEntityAccessRequests({ status: filter });
    if (error) toast.error(isRTL ? 'تعذّر تحميل الطلبات' : 'Could not load requests');
    setRows(data);
    setLoading(false);
  }, [filter, isRTL]);

  useEffect(() => { void load(); }, [load]);

  const onReview = async (row: EntityAccessRequestListRow, action: 'approve' | 'reject') => {
    if (!user) return;
    setActing(row.id);
    try {
      const { ok, error } = await reviewEntityAccessRequest({
        requestId: row.id,
        reviewerUserId: user.id,
        action,
      });
      if (!ok) {
        toast.error(
          error instanceof Error && error.message
            ? error.message
            : (isRTL ? 'تعذّر تنفيذ الإجراء' : 'Action failed'),
        );
      } else {
        toast.success(
          action === 'approve'
            ? (isRTL ? 'تمت الموافقة على الطلب' : 'Request approved')
            : (isRTL ? 'تم رفض الطلب' : 'Request rejected'),
        );
        await load();
      }
    } finally {
      setActing(null);
    }
  };

  if (!isAdmin && !isSuperAdmin) {
    return (
      <div className="p-6 text-sm text-muted-foreground">
        {isRTL ? 'هذه الصفحة للمشرفين فقط.' : 'This page is admin-only.'}
      </div>
    );
  }

  const filters: { id: StatusFilter; ar: string; en: string }[] = [
    { id: 'pending', ar: 'قيد المراجعة', en: 'Pending' },
    { id: 'approved', ar: 'تمت الموافقة', en: 'Approved' },
    { id: 'rejected', ar: 'مرفوض', en: 'Rejected' },
    { id: 'all', ar: 'الكل', en: 'All' },
  ];

  return (
    <div className="max-w-5xl mx-auto p-4 sm:p-6 space-y-4">
      <header className="flex items-center justify-between gap-2 flex-wrap">
        <div>
          <h1 className="font-heading font-bold text-2xl text-foreground">
            {isRTL ? 'طلبات الانضمام للمنشآت' : 'Entity Access Requests'}
          </h1>
          <p className="text-xs text-muted-foreground mt-1">
            {isRTL
              ? 'مراجعة طلبات الانضمام التي يرسلها المستخدمون للمنشآت القائمة.'
              : 'Review user requests to join existing entities.'}
          </p>
        </div>
        <Button variant="outline" size="sm" onClick={load} disabled={loading}>
          <RefreshCw className={`w-3.5 h-3.5 me-1 ${loading ? 'animate-spin' : ''}`} />
          {isRTL ? 'تحديث' : 'Refresh'}
        </Button>
      </header>

      <div className="flex items-center gap-2 flex-wrap" role="tablist">
        {filters.map((f) => (
          <button
            key={f.id}
            role="tab"
            aria-selected={filter === f.id}
            onClick={() => setFilter(f.id)}
            className={`px-3 h-8 rounded-full text-xs border transition-colors ${filter === f.id ? 'bg-primary text-primary-foreground border-primary' : 'bg-card border-border hover:bg-muted/40'}`}
          >
            {isRTL ? f.ar : f.en}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />
        </div>
      ) : rows.length === 0 ? (
        <div className="rounded-xl border border-dashed border-border p-8 text-center text-sm text-muted-foreground">
          {isRTL ? 'لا توجد طلبات.' : 'No requests.'}
        </div>
      ) : (
        <ul className="space-y-2" data-feature="admin-access-requests-list">
          {rows.map((r) => {
            const label = STATUS_LABEL[r.status] ?? { ar: r.status, en: r.status };
            const tb = r.target_business;
            return (
              <li key={r.id} className="rounded-xl border border-border bg-card p-3 sm:p-4">
                <div className="flex items-start justify-between gap-3 flex-wrap">
                  <div className="min-w-0 space-y-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="tech-content text-[11px] font-semibold text-foreground">
                        {r.ref_id}
                      </span>
                      <Badge variant="outline" className="text-[10px]">
                        {isRTL ? label.ar : label.en}
                      </Badge>
                    </div>
                    {tb ? (
                      <p className="text-sm text-foreground flex items-center gap-1.5">
                        <Building2 className="w-3.5 h-3.5 text-primary shrink-0" />
                        <span className="tech-content text-[11px] text-muted-foreground">
                          {tb.ref_id ?? tb.legacy_ref_id ?? '—'}
                        </span>
                        <span className="truncate">
                          {isRTL ? (tb.name_ar ?? tb.name_en ?? '—') : (tb.name_en ?? tb.name_ar ?? '—')}
                        </span>
                      </p>
                    ) : r.target_ref ? (
                      <p className="text-sm text-muted-foreground flex items-center gap-1.5">
                        <Mail className="w-3.5 h-3.5 shrink-0" />
                        <span className="truncate">
                          {isRTL ? 'منشأة مجهولة الرابط — ' : 'Unresolved entity — '}
                          <span className="tech-content">{r.target_ref}</span>
                        </span>
                      </p>
                    ) : null}
                    {r.message && (
                      <p className="text-xs text-muted-foreground whitespace-pre-wrap line-clamp-3">
                        {r.message}
                      </p>
                    )}
                    <p className="text-[10px] text-muted-foreground tech-content">
                      {new Date(r.created_at).toLocaleString(isRTL ? 'ar-SA' : 'en-US')}
                    </p>
                  </div>
                  {r.status === 'pending' && (
                    <div className="flex items-center gap-2 shrink-0">
                      <Button
                        size="sm"
                        variant="outline"
                        disabled={acting === r.id}
                        onClick={() => onReview(r, 'reject')}
                      >
                        <X className="w-3.5 h-3.5 me-1" />
                        {isRTL ? 'رفض' : 'Reject'}
                      </Button>
                      <Button
                        size="sm"
                        variant="hero"
                        disabled={acting === r.id || !r.target_business_id}
                        onClick={() => onReview(r, 'approve')}
                        title={!r.target_business_id ? (isRTL ? 'يجب ربط المنشأة أولاً' : 'Link a target entity first') : undefined}
                      >
                        {acting === r.id ? <Loader2 className="w-3.5 h-3.5 animate-spin me-1" /> : <Check className="w-3.5 h-3.5 me-1" />}
                        {isRTL ? 'موافقة' : 'Approve'}
                      </Button>
                    </div>
                  )}
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
};

export default AdminEntityAccessRequests;