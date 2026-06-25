/**
 * CONTRACT REVIEW STANDALONE PAGE
 *
 * Phase: post-G UX. Replaces the inline `AlertDialog` review-summary with a
 * dedicated, organized review surface where each contract section is shown
 * as its own card and simple text fields can be edited inline (Expand/Save)
 * without leaving the page.
 *
 * Lifecycle is unchanged:
 *   - draft → draft (inline edits)
 *   - "Send for review" still goes through `sendContractForApproval` RPC.
 * No schema changes, no service_role, no policy changes.
 */
import React, { useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  ArrowLeft, ArrowRight, ChevronDown, ChevronUp, Edit3, FileCheck,
  Loader2, Send, ShieldCheck, Users, Briefcase, MapPin, CreditCard,
  Calendar, ScrollText, User, AlertTriangle, CheckCircle2, Pencil,
} from 'lucide-react';
import { toast } from 'sonner';
import { DashboardLayout } from '@/components/dashboard/DashboardLayout';
import { PageHeader } from '@/components/shared';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { useLanguage } from '@/i18n/LanguageContext';
import { useAuth } from '@/contexts/AuthContext';
import { pickBi } from '@/components/common/Bilingual';
import { supabase } from '@/integrations/supabase/client';
import { sendContractForApproval } from '@/modules/contracts/services/mutations';
import { createNotification } from '@/modules/notifications';
import { computeSendForReviewEligibility } from '@/modules/contracts/services/sendForReviewEligibility';

type ContractRow = Record<string, any> & {
  id: string;
  status: string;
  provider_id: string | null;
  client_id: string | null;
  business_id: string | null;
  template_version_id: string | null;
  title_ar: string | null;
  title_en: string | null;
  description_ar: string | null;
  description_en: string | null;
  terms_ar: string | null;
  terms_en: string | null;
  total_amount: number | string | null;
  currency_code: string | null;
  start_date: string | null;
  end_date: string | null;
  supervisor_name: string | null;
  supervisor_phone: string | null;
  supervisor_email: string | null;
  contract_number: string | null;
};

type LineItemRow = {
  id: string;
  name_ar: string | null;
  name_en: string | null;
  quantity: number | null;
  unit_price: number | null;
  total_cost: number | null;
};

/** Tiny presentational helper for read-only field rows inside a section. */
const Field: React.FC<{ label: string; value: React.ReactNode; testId?: string }> = ({
  label, value, testId,
}) => (
  <div data-testid={testId} className="flex flex-col gap-0.5">
    <span className="text-[10px] font-medium uppercase tracking-wide text-muted-foreground">{label}</span>
    <span className="text-sm font-semibold text-foreground break-words">
      {value && String(value).trim() ? value : <span className="text-muted-foreground/70 italic font-normal">—</span>}
    </span>
  </div>
);

interface ReviewSectionProps {
  id: string;
  icon: React.ComponentType<{ className?: string }>;
  title: string;
  subtitle?: string;
  defaultOpen?: boolean;
  /** When provided, an "Edit" button toggles the editor render-prop. */
  renderEditor?: (close: () => void) => React.ReactNode;
  /** When provided, button navigates back to the full creator at the given step. */
  editInCreatorStep?: string;
  contractId?: string;
  children: React.ReactNode;
}
const ReviewSection: React.FC<ReviewSectionProps> = ({
  id, icon: Icon, title, subtitle, defaultOpen = true,
  renderEditor, editInCreatorStep, contractId, children,
}) => {
  const { isRTL } = useLanguage();
  const navigate = useNavigate();
  const [open, setOpen] = useState(defaultOpen);
  const [editing, setEditing] = useState(false);
  return (
    <Card data-testid={`review-section-${id}`} className="overflow-hidden">
      <CardHeader className="flex flex-row items-center justify-between gap-2 py-3 px-4 bg-muted/30 border-b">
        <button
          type="button"
          onClick={() => setOpen((v) => !v)}
          className="flex items-center gap-2 text-start flex-1 min-w-0"
        >
          <div className="w-8 h-8 rounded-lg bg-primary/10 text-primary flex items-center justify-center shrink-0">
            <Icon className="w-4 h-4" />
          </div>
          <div className="min-w-0">
            <CardTitle className="text-sm font-bold leading-tight">{title}</CardTitle>
            {subtitle && <p className="text-[11px] text-muted-foreground truncate">{subtitle}</p>}
          </div>
          {open ? <ChevronUp className="w-4 h-4 text-muted-foreground" /> : <ChevronDown className="w-4 h-4 text-muted-foreground" />}
        </button>
        <div className="flex items-center gap-1.5">
          {renderEditor && !editing && (
            <Button
              size="sm" variant="outline" className="h-7 text-[11px]"
              data-testid={`review-section-${id}-edit`}
              onClick={() => { setEditing(true); setOpen(true); }}
            >
              <Pencil className="w-3 h-3 me-1" />
              {pickBi(isRTL, 'تعديل', 'Edit')}
            </Button>
          )}
          {editInCreatorStep && contractId && !editing && (
            <Button
              size="sm" variant="ghost" className="h-7 text-[11px]"
              data-testid={`review-section-${id}-edit-in-creator`}
              onClick={() => navigate(`/dashboard/contracts?edit=${contractId}&step=${editInCreatorStep}`)}
            >
              <Edit3 className="w-3 h-3 me-1" />
              {pickBi(isRTL, 'تعديل في شاشة الإنشاء', 'Edit in creator')}
            </Button>
          )}
        </div>
      </CardHeader>
      {open && (
        <CardContent className="p-4 space-y-3">
          {editing && renderEditor
            ? renderEditor(() => setEditing(false))
            : children}
        </CardContent>
      )}
    </Card>
  );
};

const DashboardContractReview: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { isRTL } = useLanguage();
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [sendOpen, setSendOpen] = useState(false);

  const contractQuery = useQuery({
    queryKey: ['contract-review', id],
    enabled: !!id,
    queryFn: async (): Promise<{ contract: ContractRow; lineItems: LineItemRow[] }> => {
      const { data: contract, error } = await supabase
        .from('contracts')
        .select('*')
        .eq('id', id!)
        .maybeSingle();
      if (error) throw error;
      if (!contract) throw new Error('not_found');
      const { data: lineItems } = await supabase
        .from('contract_line_items')
        .select('id, name_ar, name_en, quantity, unit_price, total_cost')
        .eq('contract_id', id!)
        .order('sort_order');
      return {
        contract: contract as ContractRow,
        lineItems: (lineItems ?? []) as LineItemRow[],
      };
    },
  });

  const inlineUpdate = useMutation({
    mutationFn: async (patch: Partial<ContractRow>) => {
      const { error } = await supabase.from('contracts').update(patch).eq('id', id!);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['contract-review', id] });
      queryClient.invalidateQueries({ queryKey: ['dashboard-contracts'] });
      queryClient.invalidateQueries({ queryKey: ['provider-contracts'] });
      toast.success(pickBi(isRTL, 'تم حفظ التعديل', 'Changes saved'));
    },
    onError: () => {
      toast.error(pickBi(isRTL, 'تعذّر حفظ التعديل، حاول مجددًا', 'Could not save, please retry'));
    },
  });

  const sendMutation = useMutation({
    mutationFn: async (c: ContractRow) => {
      await sendContractForApproval(c.id);
      if (c.client_id) {
        await createNotification({
          user_id: c.client_id,
          title_ar: `عقد جديد بانتظار مراجعتك: ${c.title_ar ?? ''}`,
          title_en: `New contract pending review: ${c.title_en || c.title_ar || ''}`,
          notification_type: 'contract',
          reference_id: c.id,
          reference_type: 'contract',
          action_url: `/contracts/${c.id}`,
        });
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['dashboard-contracts'] });
      queryClient.invalidateQueries({ queryKey: ['contract-review', id] });
      toast.success(pickBi(isRTL, 'تم إرسال العقد للمراجعة', 'Contract sent for review'));
      setSendOpen(false);
      navigate('/dashboard/contracts');
    },
    onError: () => {
      toast.error(pickBi(isRTL, 'تعذّر إرسال العقد للمراجعة', 'Could not send the contract for review'));
    },
  });

  if (contractQuery.isLoading) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center min-h-[40vh]">
          <Loader2 className="w-6 h-6 animate-spin text-primary" />
        </div>
      </DashboardLayout>
    );
  }

  if (contractQuery.isError || !contractQuery.data) {
    return (
      <DashboardLayout>
        <div className="text-center py-12 space-y-3">
          <AlertTriangle className="w-10 h-10 text-warning mx-auto" />
          <p className="text-sm">{pickBi(isRTL, 'لم نتمكّن من فتح العقد', 'Unable to open this contract')}</p>
          <Button variant="outline" onClick={() => navigate('/dashboard/contracts')}>
            {pickBi(isRTL, 'العودة للعقود', 'Back to contracts')}
          </Button>
        </div>
      </DashboardLayout>
    );
  }

  const { contract, lineItems } = contractQuery.data;
  const canEdit = contract.status === 'draft' && user?.id === contract.provider_id;
  const eligibility = computeSendForReviewEligibility(
    {
      id: contract.id,
      business_id: contract.business_id,
      client_id: contract.client_id,
      template_version_id: contract.template_version_id,
      terms_ar: contract.terms_ar,
      total_amount: contract.total_amount,
    },
    { hasLineItems: lineItems.length > 0, isRTL },
  );

  const datesLabel = contract.start_date || contract.end_date
    ? `${contract.start_date ?? '—'} → ${contract.end_date ?? '—'}`
    : '';
  const ArrowBack = isRTL ? ArrowRight : ArrowLeft;

  return (
    <DashboardLayout>
      <div className="space-y-5 pb-24 md:pb-28" data-testid="contract-review-page">
        <PageHeader
          icon={FileCheck}
          tone="primary"
          eyebrow={pickBi(isRTL, 'مراجعة العقد', 'Contract review')}
          title={pickBi(isRTL, contract.title_ar || 'مراجعة العقد قبل الإرسال', contract.title_en || contract.title_ar || 'Review contract before sending')}
          subtitle={pickBi(
            isRTL,
            'راجع كل قسم على حدة، عدّل ما يلزم، ثم أرسل للمراجعة عندما تكون البيانات مكتملة.',
            'Review every section independently, edit what you need, then send for review once complete.',
          )}
          actions={
            <div className="flex items-center gap-2 flex-wrap">
              <Badge variant="outline" className="text-[10px]">
                {contract.contract_number ?? contract.id.slice(0, 8)}
              </Badge>
              <Button size="sm" variant="ghost" className="h-8 text-xs" onClick={() => navigate('/dashboard/contracts')}>
                <ArrowBack className="w-3.5 h-3.5 me-1" />
                {pickBi(isRTL, 'العودة', 'Back')}
              </Button>
            </div>
          }
        />

        {/* Status + completeness banner */}
        <Card data-testid="review-status-banner" className="border-primary/20 bg-primary/5">
          <CardContent className="p-3 flex flex-wrap items-center gap-3 justify-between">
            <div className="flex items-center gap-2">
              <Badge className="text-[10px] bg-primary/15 text-primary">{contract.status}</Badge>
              {eligibility.isEligible ? (
                <Badge className="text-[10px] bg-success text-success-foreground gap-1">
                  <CheckCircle2 className="w-3 h-3" />
                  {pickBi(isRTL, 'جاهز للإرسال', 'Ready to submit')}
                </Badge>
              ) : (
                <Badge variant="outline" className="text-[10px] border-warning/50 text-warning gap-1">
                  <AlertTriangle className="w-3 h-3" />
                  {pickBi(isRTL, `${eligibility.missing.length} حقل ناقص`, `${eligibility.missing.length} missing`)}
                </Badge>
              )}
            </div>
            <Button
              size="sm" variant="hero" className="h-8 text-xs"
              data-testid="review-send-btn"
              disabled={!canEdit || !eligibility.isEligible || sendMutation.isPending}
              onClick={() => setSendOpen(true)}
            >
              <Send className="w-3.5 h-3.5 me-1" />
              {pickBi(isRTL, 'إرسال للمراجعة', 'Send for review')}
            </Button>
          </CardContent>
        </Card>

        {/* Missing fields helper */}
        {!eligibility.isEligible && (
          <Card data-testid="review-missing-list" className="border-warning/30 bg-warning/5">
            <CardContent className="p-3 space-y-1.5">
              <div className="text-[11px] font-bold text-warning flex items-center gap-1.5">
                <AlertTriangle className="w-3.5 h-3.5" />
                {pickBi(isRTL, 'حقول مطلوبة ناقصة', 'Missing required fields')}
              </div>
              <ul className="grid grid-cols-1 sm:grid-cols-2 gap-1">
                {eligibility.missing.map((m) => (
                  <li key={m} className="text-[11px] text-foreground/80 flex gap-1.5 items-start">
                    <span className="w-1 h-1 mt-1.5 rounded-full bg-warning shrink-0" />{m}
                  </li>
                ))}
              </ul>
            </CardContent>
          </Card>
        )}

        {/* 1) Parties */}
        <ReviewSection
          id="parties" icon={Users}
          title={pickBi(isRTL, 'الأطراف', 'Parties')}
          subtitle={pickBi(isRTL, 'الطرف الأول والطرف الثاني', 'First and second parties')}
          editInCreatorStep="client" contractId={contract.id}
        >
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <Field label={pickBi(isRTL, 'الطرف الأول (المنفّذ)', 'First party (provider)')} value={contract.business_id ?? '—'} testId="review-parties-first" />
            <Field label={pickBi(isRTL, 'الطرف الثاني (العميل)', 'Second party (client)')} value={contract.client_id ?? contract.guest_client_name ?? '—'} testId="review-parties-second" />
          </div>
        </ReviewSection>

        {/* 2) Title & description — inline editable */}
        <ReviewSection
          id="title" icon={ScrollText}
          title={pickBi(isRTL, 'العنوان والوصف', 'Title & description')}
          renderEditor={canEdit ? (close) => (
            <InlineTitleEditor
              isRTL={isRTL} contract={contract}
              onCancel={close}
              onSave={async (patch) => { await inlineUpdate.mutateAsync(patch); close(); }}
              saving={inlineUpdate.isPending}
            />
          ) : undefined}
        >
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <Field label={pickBi(isRTL, 'العنوان (عربي)', 'Title (Arabic)')} value={contract.title_ar} />
            <Field label={pickBi(isRTL, 'العنوان (إنجليزي)', 'Title (English)')} value={contract.title_en} />
            <Field label={pickBi(isRTL, 'الوصف (عربي)', 'Description (Arabic)')} value={contract.description_ar} />
            <Field label={pickBi(isRTL, 'الوصف (إنجليزي)', 'Description (English)')} value={contract.description_en} />
          </div>
        </ReviewSection>

        {/* 3) Site & scope — read only (edit in creator) */}
        <ReviewSection
          id="site" icon={MapPin}
          title={pickBi(isRTL, 'الموقع والقطاع', 'Site & sector')}
          editInCreatorStep="site" contractId={contract.id}
        >
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <Field label={pickBi(isRTL, 'موقع التنفيذ', 'Execution site')} value={contract.execution_site_id ?? '—'} />
            <Field label={pickBi(isRTL, 'القطاع', 'Sector')} value={contract.service_category_id ?? '—'} />
          </div>
        </ReviewSection>

        {/* 4) Pricing — line items read-only */}
        <ReviewSection
          id="pricing" icon={CreditCard}
          title={pickBi(isRTL, 'التسعير والبنود', 'Pricing & line items')}
          editInCreatorStep="pricing" contractId={contract.id}
        >
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-3">
            <Field label={pickBi(isRTL, 'طريقة التسعير', 'Pricing method')} value={contract.pricing_method ?? '—'} />
            <Field label={pickBi(isRTL, 'المبلغ الإجمالي', 'Total amount')} value={`${contract.total_amount ?? '—'} ${contract.currency_code ?? ''}`.trim()} />
            <Field label={pickBi(isRTL, 'نسبة الضريبة', 'VAT rate')} value={contract.vat_rate != null ? `${contract.vat_rate}%` : '—'} />
          </div>
          {lineItems.length === 0 ? (
            <p className="text-[11px] text-muted-foreground italic">{pickBi(isRTL, 'لا توجد بنود بعد.', 'No line items yet.')}</p>
          ) : (
            <div className="border rounded-lg overflow-hidden">
              <table className="w-full text-xs">
                <thead className="bg-muted/40">
                  <tr>
                    <th className="text-start p-2 font-semibold">{pickBi(isRTL, 'البند', 'Item')}</th>
                    <th className="text-end p-2 font-semibold">{pickBi(isRTL, 'الكمية', 'Qty')}</th>
                    <th className="text-end p-2 font-semibold">{pickBi(isRTL, 'سعر الوحدة', 'Unit price')}</th>
                    <th className="text-end p-2 font-semibold">{pickBi(isRTL, 'الإجمالي', 'Total')}</th>
                  </tr>
                </thead>
                <tbody>
                  {lineItems.map((li) => (
                    <tr key={li.id} className="border-t">
                      <td className="p-2">{isRTL ? (li.name_ar || li.name_en) : (li.name_en || li.name_ar)}</td>
                      <td className="p-2 text-end tabular-nums">{li.quantity ?? '—'}</td>
                      <td className="p-2 text-end tabular-nums">{li.unit_price ?? '—'}</td>
                      <td className="p-2 text-end tabular-nums">{li.total_cost ?? '—'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </ReviewSection>

        {/* 5) Dates — inline editable */}
        <ReviewSection
          id="dates" icon={Calendar}
          title={pickBi(isRTL, 'التواريخ والمدة', 'Dates & duration')}
          renderEditor={canEdit ? (close) => (
            <InlineDatesEditor
              isRTL={isRTL} contract={contract}
              onCancel={close}
              onSave={async (patch) => { await inlineUpdate.mutateAsync(patch); close(); }}
              saving={inlineUpdate.isPending}
            />
          ) : undefined}
        >
          <Field label={pickBi(isRTL, 'تاريخ البدء / الانتهاء', 'Start / End')} value={datesLabel} />
        </ReviewSection>

        {/* 6) Terms — inline editable */}
        <ReviewSection
          id="terms" icon={ShieldCheck}
          title={pickBi(isRTL, 'بنود وشروط العقد', 'Contract terms')}
          renderEditor={canEdit ? (close) => (
            <InlineTermsEditor
              isRTL={isRTL} contract={contract}
              onCancel={close}
              onSave={async (patch) => { await inlineUpdate.mutateAsync(patch); close(); }}
              saving={inlineUpdate.isPending}
            />
          ) : undefined}
        >
          <Field label={pickBi(isRTL, 'الشروط (عربي)', 'Terms (Arabic)')} value={contract.terms_ar} />
          <Field label={pickBi(isRTL, 'الشروط (إنجليزي)', 'Terms (English)')} value={contract.terms_en} />
        </ReviewSection>

        {/* 7) Supervisor — inline editable */}
        <ReviewSection
          id="supervisor" icon={User}
          title={pickBi(isRTL, 'المشرف على التنفيذ', 'Site supervisor')}
          renderEditor={canEdit ? (close) => (
            <InlineSupervisorEditor
              isRTL={isRTL} contract={contract}
              onCancel={close}
              onSave={async (patch) => { await inlineUpdate.mutateAsync(patch); close(); }}
              saving={inlineUpdate.isPending}
            />
          ) : undefined}
        >
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <Field label={pickBi(isRTL, 'الاسم', 'Name')} value={contract.supervisor_name} />
            <Field label={pickBi(isRTL, 'الجوال', 'Phone')} value={contract.supervisor_phone} />
            <Field label={pickBi(isRTL, 'البريد', 'Email')} value={contract.supervisor_email} />
          </div>
        </ReviewSection>

        {/* 8) Template — read only */}
        <ReviewSection
          id="template" icon={Briefcase}
          title={pickBi(isRTL, 'القالب', 'Template')}
          editInCreatorStep="template" contractId={contract.id}
        >
          <Field label={pickBi(isRTL, 'إصدار القالب', 'Template version')} value={contract.template_version_id ?? '—'} />
        </ReviewSection>

        {/* Sticky bottom send bar (mobile-friendly) */}
        <div className="fixed bottom-0 inset-x-0 bg-background/95 backdrop-blur border-t p-3 flex items-center justify-between gap-2 md:hidden z-40">
          <span className="text-[11px] text-muted-foreground">
            {eligibility.isEligible
              ? pickBi(isRTL, 'العقد جاهز للإرسال', 'Ready to send')
              : pickBi(isRTL, `${eligibility.missing.length} حقل ناقص`, `${eligibility.missing.length} missing`)}
          </span>
          <Button
            size="sm" variant="hero"
            disabled={!canEdit || !eligibility.isEligible || sendMutation.isPending}
            onClick={() => setSendOpen(true)}
          >
            <Send className="w-3.5 h-3.5 me-1" />
            {pickBi(isRTL, 'إرسال للمراجعة', 'Send')}
          </Button>
        </div>

        {/* Send confirmation */}
        <AlertDialog open={sendOpen} onOpenChange={setSendOpen}>
          <AlertDialogContent data-testid="review-send-confirm">
            <AlertDialogHeader>
              <AlertDialogTitle>{pickBi(isRTL, 'إرسال العقد للمراجعة', 'Send contract for review')}</AlertDialogTitle>
              <AlertDialogDescription>
                {pickBi(
                  isRTL,
                  'سيتم إرسال العقد للعميل لمراجعته. لن يتم تفعيل أي توقيع إلكتروني الآن.',
                  'The contract will be sent to the client for review. No electronic signature is activated now.',
                )}
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel disabled={sendMutation.isPending}>{pickBi(isRTL, 'إلغاء', 'Cancel')}</AlertDialogCancel>
              <AlertDialogAction
                disabled={sendMutation.isPending || !eligibility.isEligible}
                onClick={() => sendMutation.mutate(contract)}
              >
                {sendMutation.isPending
                  ? <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  : pickBi(isRTL, 'تأكيد الإرسال', 'Confirm send')}
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>
    </DashboardLayout>
  );
};

/* ── Inline editors ─────────────────────────────────────────────────────── */

interface EditorProps {
  isRTL: boolean;
  contract: ContractRow;
  saving: boolean;
  onCancel: () => void;
  onSave: (patch: Partial<ContractRow>) => Promise<void> | void;
}

const EditorActions: React.FC<{ isRTL: boolean; saving: boolean; onCancel: () => void; onSave: () => void; disabled?: boolean }> = ({
  isRTL, saving, onCancel, onSave, disabled,
}) => (
  <div className="flex items-center justify-end gap-2 pt-2">
    <Button type="button" size="sm" variant="outline" onClick={onCancel} disabled={saving}>
      {pickBi(isRTL, 'إلغاء', 'Cancel')}
    </Button>
    <Button type="button" size="sm" onClick={onSave} disabled={saving || disabled}>
      {saving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : pickBi(isRTL, 'حفظ', 'Save')}
    </Button>
  </div>
);

const InlineTitleEditor: React.FC<EditorProps> = ({ isRTL, contract, saving, onCancel, onSave }) => {
  const [titleAr, setTitleAr] = useState(contract.title_ar ?? '');
  const [titleEn, setTitleEn] = useState(contract.title_en ?? '');
  const [descAr, setDescAr] = useState(contract.description_ar ?? '');
  const [descEn, setDescEn] = useState(contract.description_en ?? '');
  return (
    <div className="space-y-3">
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <div className="space-y-1"><Label>{pickBi(isRTL, 'العنوان (عربي)', 'Title (Arabic)')}</Label>
          <Input value={titleAr} onChange={(e) => setTitleAr(e.target.value)} /></div>
        <div className="space-y-1"><Label>{pickBi(isRTL, 'العنوان (إنجليزي)', 'Title (English)')}</Label>
          <Input value={titleEn} onChange={(e) => setTitleEn(e.target.value)} /></div>
        <div className="space-y-1 sm:col-span-2"><Label>{pickBi(isRTL, 'الوصف (عربي)', 'Description (Arabic)')}</Label>
          <Textarea rows={2} value={descAr} onChange={(e) => setDescAr(e.target.value)} /></div>
        <div className="space-y-1 sm:col-span-2"><Label>{pickBi(isRTL, 'الوصف (إنجليزي)', 'Description (English)')}</Label>
          <Textarea rows={2} value={descEn} onChange={(e) => setDescEn(e.target.value)} /></div>
      </div>
      <EditorActions
        isRTL={isRTL} saving={saving} onCancel={onCancel}
        disabled={!titleAr.trim()}
        onSave={() => onSave({
          title_ar: titleAr.trim(),
          title_en: titleEn.trim() || titleAr.trim(),
          description_ar: descAr.trim() || null,
          description_en: descEn.trim() || null,
        })}
      />
    </div>
  );
};

const InlineDatesEditor: React.FC<EditorProps> = ({ isRTL, contract, saving, onCancel, onSave }) => {
  const [start, setStart] = useState(contract.start_date ?? '');
  const [end, setEnd] = useState(contract.end_date ?? '');
  const invalid = start && end && end < start;
  return (
    <div className="space-y-3">
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <div className="space-y-1"><Label>{pickBi(isRTL, 'تاريخ البدء', 'Start date')}</Label>
          <Input type="date" value={start} onChange={(e) => setStart(e.target.value)} /></div>
        <div className="space-y-1"><Label>{pickBi(isRTL, 'تاريخ الانتهاء', 'End date')}</Label>
          <Input type="date" value={end} onChange={(e) => setEnd(e.target.value)} /></div>
      </div>
      {invalid && (
        <p role="alert" className="text-[11px] text-destructive">
          {pickBi(isRTL, 'تاريخ الانتهاء لا يمكن أن يسبق تاريخ البدء', 'End date cannot precede start date')}
        </p>
      )}
      <EditorActions
        isRTL={isRTL} saving={saving} onCancel={onCancel}
        disabled={!!invalid}
        onSave={() => onSave({ start_date: start || null, end_date: end || null })}
      />
    </div>
  );
};

const InlineTermsEditor: React.FC<EditorProps> = ({ isRTL, contract, saving, onCancel, onSave }) => {
  const [termsAr, setTermsAr] = useState(contract.terms_ar ?? '');
  const [termsEn, setTermsEn] = useState(contract.terms_en ?? '');
  return (
    <div className="space-y-3">
      <div className="space-y-1"><Label>{pickBi(isRTL, 'الشروط (عربي)', 'Terms (Arabic)')}</Label>
        <Textarea rows={6} value={termsAr} onChange={(e) => setTermsAr(e.target.value)} /></div>
      <div className="space-y-1"><Label>{pickBi(isRTL, 'الشروط (إنجليزي)', 'Terms (English)')}</Label>
        <Textarea rows={6} value={termsEn} onChange={(e) => setTermsEn(e.target.value)} /></div>
      <EditorActions
        isRTL={isRTL} saving={saving} onCancel={onCancel}
        disabled={!termsAr.trim()}
        onSave={() => onSave({ terms_ar: termsAr.trim(), terms_en: termsEn.trim() || termsAr.trim() })}
      />
    </div>
  );
};

const InlineSupervisorEditor: React.FC<EditorProps> = ({ isRTL, contract, saving, onCancel, onSave }) => {
  const [name, setName] = useState(contract.supervisor_name ?? '');
  const [phone, setPhone] = useState(contract.supervisor_phone ?? '');
  const [email, setEmail] = useState(contract.supervisor_email ?? '');
  return (
    <div className="space-y-3">
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <div className="space-y-1"><Label>{pickBi(isRTL, 'الاسم', 'Name')}</Label>
          <Input value={name} onChange={(e) => setName(e.target.value)} /></div>
        <div className="space-y-1"><Label>{pickBi(isRTL, 'الجوال', 'Phone')}</Label>
          <Input value={phone} onChange={(e) => setPhone(e.target.value)} /></div>
        <div className="space-y-1"><Label>{pickBi(isRTL, 'البريد', 'Email')}</Label>
          <Input type="email" value={email} onChange={(e) => setEmail(e.target.value)} /></div>
      </div>
      <EditorActions
        isRTL={isRTL} saving={saving} onCancel={onCancel}
        onSave={() => onSave({
          supervisor_name: name.trim() || null,
          supervisor_phone: phone.trim() || null,
          supervisor_email: email.trim() || null,
        })}
      />
    </div>
  );
};

export default DashboardContractReview;