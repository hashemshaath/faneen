/**
 * CT7 — Legal Review Panel (admin-only).
 *
 * Inline (no popups) panel that shows the legal-review status of a single
 * contract template version, exposes the gated workflow actions, and renders
 * the audit timeline. All mutations call SECURITY DEFINER RPCs that re-verify
 * the admin role and enforce status transitions server-side.
 *
 * legal_review_notes and the review event log are NEVER exposed outside the
 * admin role (RLS on contract_template_review_events; ctv RLS already hides
 * non-published versions from non-admins).
 */
import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { toast } from 'sonner';
import {
  ShieldCheck, AlertTriangle, Send, RotateCcw, Archive, Upload, Scale, FileClock,
} from 'lucide-react';
import {
  CTVersion, CTReviewEvent, VERSION_STATUS_META, REVIEW_ACTION_META,
} from './types';

type RiskLevel = 'low' | 'medium' | 'high';
type LangPrec = 'ar' | 'en';

const RISK_LABELS: Record<RiskLevel, { ar: string; en: string; cls: string }> = {
  low:    { ar: 'منخفضة',  en: 'Low',    cls: 'bg-emerald-100 text-emerald-800' },
  medium: { ar: 'متوسطة',  en: 'Medium', cls: 'bg-amber-100 text-amber-800' },
  high:   { ar: 'عالية',   en: 'High',   cls: 'bg-rose-100 text-rose-800' },
};

interface Props {
  version: CTVersion;
  templateId: string;
  isRTL: boolean;
}

export const LegalReviewPanel: React.FC<Props> = ({ version, templateId, isRTL }) => {
  const qc = useQueryClient();
  const [note, setNote] = useState('');
  const [risk, setRisk] = useState<RiskLevel>(
    (version.risk_level as RiskLevel) || 'medium',
  );
  const [lang, setLang] = useState<LangPrec>(
    (version.language_precedence as LangPrec) || 'ar',
  );
  const [effective, setEffective] = useState('');

  const eventsQ = useQuery({
    queryKey: ['ct-review-events', version.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('contract_template_review_events')
        .select('*')
        .eq('template_version_id', version.id)
        .order('created_at', { ascending: false });
      if (error) throw error;
      return (data || []) as CTReviewEvent[];
    },
  });

  const invalidate = () => {
    qc.invalidateQueries({ queryKey: ['ct-versions', templateId] });
    qc.invalidateQueries({ queryKey: ['ct-templates'] });
    qc.invalidateQueries({ queryKey: ['ct-review-events', version.id] });
    setNote('');
  };

  const handleErr = (e: unknown) =>
    toast.error(e instanceof Error ? e.message : (isRTL ? 'فشلت العملية' : 'Action failed'));

  const submitForReview = useMutation({
    mutationFn: async () => {
      const { error } = await supabase.rpc('template_version_submit_for_review', {
        p_version_id: version.id, p_note: note || null,
      });
      if (error) throw error;
    },
    onSuccess: () => { toast.success(isRTL ? 'تم الإرسال للمراجعة' : 'Sent for review'); invalidate(); },
    onError: handleErr,
  });

  const requestChanges = useMutation({
    mutationFn: async () => {
      if (!note.trim()) throw new Error(isRTL ? 'الملاحظة مطلوبة' : 'Note is required');
      const { error } = await supabase.rpc('template_version_request_changes', {
        p_version_id: version.id, p_note: note,
      });
      if (error) throw error;
    },
    onSuccess: () => { toast.success(isRTL ? 'تم طلب التعديلات' : 'Changes requested'); invalidate(); },
    onError: handleErr,
  });

  const revertToDraft = useMutation({
    mutationFn: async () => {
      const { error } = await supabase.rpc('template_version_revert_to_draft', {
        p_version_id: version.id, p_note: note || null,
      });
      if (error) throw error;
    },
    onSuccess: () => { toast.success(isRTL ? 'تمت إعادتها للمسودة' : 'Reverted to draft'); invalidate(); },
    onError: handleErr,
  });

  const legalApprove = useMutation({
    mutationFn: async () => {
      const { error } = await supabase.rpc('template_version_legal_approve', {
        p_version_id: version.id,
        p_risk_level: risk,
        p_language_precedence: lang,
        p_note: note || null,
      });
      if (error) throw error;
    },
    onSuccess: () => { toast.success(isRTL ? 'تم الاعتماد القانوني' : 'Legally approved'); invalidate(); },
    onError: handleErr,
  });

  const publish = useMutation({
    mutationFn: async () => {
      const { error } = await supabase.rpc('template_version_publish', {
        p_version_id: version.id,
        p_effective_from: effective ? new Date(effective).toISOString() : null,
        p_note: note || null,
      });
      if (error) throw error;
    },
    onSuccess: () => { toast.success(isRTL ? 'تم النشر' : 'Published'); invalidate(); },
    onError: handleErr,
  });

  const archive = useMutation({
    mutationFn: async () => {
      const { error } = await supabase.rpc('template_version_archive', {
        p_version_id: version.id, p_note: note || null,
      });
      if (error) throw error;
    },
    onSuccess: () => { toast.success(isRTL ? 'تمت الأرشفة' : 'Archived'); invalidate(); },
    onError: handleErr,
  });

  const status = version.status;
  const meta = VERSION_STATUS_META[status];
  const riskMeta = version.risk_level ? RISK_LABELS[version.risk_level as RiskLevel] : null;

  return (
    <Card>
      <CardContent className="p-4 space-y-4">
        <div className="flex items-center justify-between flex-wrap gap-2">
          <h2 className="text-sm font-semibold flex items-center gap-2">
            <Scale className="h-4 w-4 text-primary" />
            {isRTL ? 'المراجعة القانونية' : 'Legal Review'}
          </h2>
          <Badge variant="outline" className={meta?.cls}>
            {isRTL ? meta?.ar : meta?.en}
          </Badge>
        </div>

        {/* Snapshot of current legal metadata */}
        <div className="grid sm:grid-cols-2 gap-3 text-xs">
          <Field label={isRTL ? 'مستوى المخاطر' : 'Risk level'}>
            {riskMeta
              ? <Badge variant="outline" className={riskMeta.cls}>{isRTL ? riskMeta.ar : riskMeta.en}</Badge>
              : <span className="text-muted-foreground">—</span>}
          </Field>
          <Field label={isRTL ? 'اللغة المعتمدة عند التعارض' : 'Language precedence'}>
            <span className="font-medium" dir="ltr">{version.language_precedence?.toUpperCase() || '—'}</span>
          </Field>
          <Field label={isRTL ? 'المراجع القانوني' : 'Legal reviewer'}>
            <span className="font-mono text-[11px]" dir="ltr">
              {version.legal_reviewer_id ? `${version.legal_reviewer_id.slice(0, 8)}…` : '—'}
            </span>
          </Field>
          <Field label={isRTL ? 'تاريخ الاعتماد' : 'Reviewed at'}>
            <span dir="ltr">{version.legal_reviewed_at ? new Date(version.legal_reviewed_at).toLocaleString() : '—'}</span>
          </Field>
          <Field label={isRTL ? 'تاريخ النفاذ' : 'Effective from'}>
            <span dir="ltr">{version.effective_from ? new Date(version.effective_from).toLocaleString() : '—'}</span>
          </Field>
          <Field label={isRTL ? 'تاريخ النشر' : 'Published at'}>
            <span dir="ltr">{version.published_at ? new Date(version.published_at).toLocaleString() : '—'}</span>
          </Field>
        </div>

        {version.legal_review_notes && (
          <div className="rounded-md border bg-muted/40 p-3">
            <div className="text-[11px] font-semibold text-muted-foreground mb-1 flex items-center gap-1">
              <ShieldCheck className="h-3 w-3" />
              {isRTL ? 'ملاحظات قانونية (للأدمن فقط)' : 'Legal notes (admin-only)'}
            </div>
            <p className="text-xs whitespace-pre-wrap">{version.legal_review_notes}</p>
          </div>
        )}

        {/* Inline form (no dialogs) */}
        {(['draft','changes_requested','in_review','legal_approved'] as const).includes(status as never) && (
          <div className="rounded-md border p-3 space-y-3 bg-background">
            {/* risk + lang shown when approving */}
            {status === 'in_review' && (
              <div className="grid sm:grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label className="text-xs">{isRTL ? 'مستوى المخاطر' : 'Risk level'} *</Label>
                  <div className="flex gap-1.5">
                    {(['low','medium','high'] as RiskLevel[]).map(r => (
                      <Button key={r} type="button" size="sm"
                        variant={risk === r ? 'default' : 'outline'}
                        onClick={() => setRisk(r)}>
                        {isRTL ? RISK_LABELS[r].ar : RISK_LABELS[r].en}
                      </Button>
                    ))}
                  </div>
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs">{isRTL ? 'اللغة المعتمدة' : 'Language precedence'} *</Label>
                  <div className="flex gap-1.5">
                    {(['ar','en'] as LangPrec[]).map(l => (
                      <Button key={l} type="button" size="sm"
                        variant={lang === l ? 'default' : 'outline'}
                        onClick={() => setLang(l)}>
                        {l.toUpperCase()}
                      </Button>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {status === 'legal_approved' && (
              <div className="space-y-1.5">
                <Label className="text-xs">{isRTL ? 'تاريخ النفاذ (اختياري)' : 'Effective from (optional)'}</Label>
                <Input type="datetime-local" value={effective} onChange={(e) => setEffective(e.target.value)} />
              </div>
            )}

            <div className="space-y-1.5">
              <Label className="text-xs">
                {isRTL ? 'ملاحظة (داخلية)' : 'Note (internal)'}
                {status === 'in_review' && (
                  <span className="text-muted-foreground ms-1">
                    {isRTL ? '— مطلوبة عند طلب التعديلات' : '— required for change requests'}
                  </span>
                )}
              </Label>
              <Textarea rows={2} value={note} onChange={(e) => setNote(e.target.value)}
                placeholder={isRTL ? 'سياق المراجعة، أسباب الرفض، إلخ...' : 'Review context, rejection reasons, etc...'} />
            </div>

            <div className="flex flex-wrap gap-2">
              {status === 'draft' && (
                <Button size="sm" onClick={() => submitForReview.mutate()} disabled={submitForReview.isPending}>
                  <Send className="h-3.5 w-3.5" />
                  {isRTL ? 'إرسال للمراجعة القانونية' : 'Send for legal review'}
                </Button>
              )}
              {status === 'changes_requested' && (
                <>
                  <Button size="sm" onClick={() => submitForReview.mutate()} disabled={submitForReview.isPending}>
                    <Send className="h-3.5 w-3.5" />
                    {isRTL ? 'إعادة إرسال للمراجعة' : 'Resubmit for review'}
                  </Button>
                  <Button size="sm" variant="outline" onClick={() => revertToDraft.mutate()} disabled={revertToDraft.isPending}>
                    <RotateCcw className="h-3.5 w-3.5" />
                    {isRTL ? 'إعادة للمسودة' : 'Revert to draft'}
                  </Button>
                </>
              )}
              {status === 'in_review' && (
                <>
                  <Button size="sm" onClick={() => legalApprove.mutate()} disabled={legalApprove.isPending}>
                    <ShieldCheck className="h-3.5 w-3.5" />
                    {isRTL ? 'اعتماد قانوني' : 'Legally approve'}
                  </Button>
                  <Button size="sm" variant="outline" onClick={() => requestChanges.mutate()} disabled={requestChanges.isPending}>
                    <AlertTriangle className="h-3.5 w-3.5" />
                    {isRTL ? 'طلب تعديلات' : 'Request changes'}
                  </Button>
                </>
              )}
              {status === 'legal_approved' && (
                <>
                  <Button size="sm" onClick={() => publish.mutate()} disabled={publish.isPending}>
                    <Upload className="h-3.5 w-3.5" />
                    {isRTL ? 'نشر القالب' : 'Publish template'}
                  </Button>
                  <Button size="sm" variant="outline" onClick={() => archive.mutate()} disabled={archive.isPending}>
                    <Archive className="h-3.5 w-3.5" />
                    {isRTL ? 'أرشفة' : 'Archive'}
                  </Button>
                </>
              )}
            </div>
          </div>
        )}

        {(status === 'published' || status === 'superseded') && (
          <div className="flex justify-end">
            <Button size="sm" variant="outline" onClick={() => archive.mutate()} disabled={archive.isPending}>
              <Archive className="h-3.5 w-3.5" />
              {isRTL ? 'أرشفة هذه النسخة' : 'Archive this version'}
            </Button>
          </div>
        )}

        {/* Timeline */}
        <div>
          <h3 className="text-xs font-semibold mb-2 flex items-center gap-1">
            <FileClock className="h-3.5 w-3.5" />
            {isRTL ? 'سجل المراجعة' : 'Review timeline'}
          </h3>
          {eventsQ.isLoading && <p className="text-xs text-muted-foreground">{isRTL ? 'جارٍ التحميل...' : 'Loading...'}</p>}
          {eventsQ.data && eventsQ.data.length === 0 && (
            <p className="text-xs text-muted-foreground">{isRTL ? 'لا توجد أحداث بعد.' : 'No events yet.'}</p>
          )}
          <ol className="space-y-1.5">
            {(eventsQ.data || []).map((ev) => {
              const am = REVIEW_ACTION_META[ev.action];
              return (
                <li key={ev.id} className="rounded-md border px-2.5 py-1.5 text-xs flex items-start justify-between gap-2">
                  <div className="flex flex-col gap-0.5">
                    <div className="flex items-center gap-1.5">
                      <Badge variant="outline" className={`${am.cls} text-[10px]`}>{isRTL ? am.ar : am.en}</Badge>
                      {ev.from_status && ev.to_status && (
                        <span className="text-muted-foreground text-[10px]" dir="ltr">
                          {ev.from_status} → {ev.to_status}
                        </span>
                      )}
                      {ev.risk_level && (
                        <Badge variant="outline" className="text-[9px]">{ev.risk_level}</Badge>
                      )}
                    </div>
                    {ev.note && <p className="text-muted-foreground whitespace-pre-wrap">{ev.note}</p>}
                  </div>
                  <span className="text-[10px] text-muted-foreground shrink-0" dir="ltr">
                    {new Date(ev.created_at).toLocaleString()}
                  </span>
                </li>
              );
            })}
          </ol>
        </div>
      </CardContent>
    </Card>
  );
};

const Field: React.FC<{ label: string; children: React.ReactNode }> = ({ label, children }) => (
  <div className="space-y-0.5">
    <div className="text-[10px] uppercase tracking-wide text-muted-foreground">{label}</div>
    <div>{children}</div>
  </div>
);

export default LegalReviewPanel;