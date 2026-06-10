import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import {
  CheckCircle2, XCircle, Eye, AlertCircle, Loader2, Send, Globe, Tag, Lock,
  Users as UsersIcon, ExternalLink, Building2, ShieldAlert, Rocket,
} from 'lucide-react';
import { CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { toast } from 'sonner';
import { maskEmail, maskPhone } from '@/lib/masking';
import { ReferenceTag } from '@/components/reference/ReferenceTag';
import { CrDocumentScanner } from '@/components/admin/CrDocumentScanner';
import { PublishReadinessPanel } from '@/components/admin/PublishReadinessPanel';
import { STATUSES, TONE, type ApprovalStatus, type ProviderRow, type UsernameStatus } from './types';
import { useBusinessTaxonomyDisplay } from '@/modules/taxonomy/search-integration';
import { useBusinessTaxonomyPresence } from '@/modules/taxonomy/presence';

interface Props {
  selected: ProviderRow | null;
  notes: string;
  setNotes: (v: string) => void;
  language: 'ar' | 'en';
  isRTL: boolean;
  isSuperAdmin: boolean;
  approvalPending: boolean;
  usernamePending: boolean;
  onApprovalChange: (status: ApprovalStatus) => void;
  onUsernameChange: (status: UsernameStatus) => void;
}

export const ProviderReviewDetailPanel: React.FC<Props> = ({
  selected, notes, setNotes, language, isRTL, isSuperAdmin,
  approvalPending, usernamePending, onApprovalChange, onUsernameChange,
}) => {
  // Phase 18d — taxonomy-first display. Replaces the previous reads of
  // `selected.sectors` / `selected.sub_services`. When no taxonomy links
  // exist we surface a "needs taxonomy link" hint instead of legacy data.
  const taxonomyDisplay = useBusinessTaxonomyDisplay(selected?.id ?? null, language);
  const taxonomyPresence = useBusinessTaxonomyPresence(selected?.id ?? null);
  // Inline confirm state for the "Publish Publicly" action. The UX rule
  // forbids dialogs — we toggle a confirm strip inline instead.
  const [confirmPublish, setConfirmPublish] = useState(false);
  // Reset the confirm strip whenever the selected business changes.
  React.useEffect(() => { setConfirmPublish(false); }, [selected?.id]);
  if (!selected) {
    return (
      <CardContent className="flex flex-col items-center justify-center gap-3 py-16 text-center text-sm text-muted-foreground">
        <Eye className="h-8 w-8 opacity-50" />
        {isRTL ? 'اختر ملفاً من القائمة لمراجعته' : 'Pick a profile from the list to review'}
      </CardContent>
    );
  }
  const enrichedSelected = {
    ...selected,
    // Strip legacy arrays so the embedded PublishReadinessPanel uses
    // the taxonomy-first signals below.
    sectors: null,
    sub_services: null,
    taxonomy_primary_present: taxonomyPresence.hasPrimary,
    taxonomy_service_count: taxonomyPresence.serviceCount,
  };

  return (
    <>
      <CardHeader className="pb-3">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="flex items-center gap-3">
            <Avatar className="h-12 w-12">
              <AvatarImage src={selected.logo_url ?? undefined} />
              <AvatarFallback>{(selected.name_ar ?? '?').slice(0, 1)}</AvatarFallback>
            </Avatar>
            <div>
              <CardTitle className="text-base">
                {language === 'ar' ? (selected.name_ar ?? selected.name_en) : (selected.name_en ?? selected.name_ar)}
              </CardTitle>
              {selected.ref_id && (
                <div className="mt-1">
                  <ReferenceTag refId={selected.ref_id} isRTL={isRTL} />
                </div>
              )}
              {selected.username && (
                <a
                  href={`/${selected.username}`}
                  target="_blank"
                  rel="noreferrer"
                  className="mt-0.5 inline-flex items-center gap-1 text-xs text-accent tech-content hover:underline"
                >
                  <Globe className="h-3 w-3" /> qitaat.com/{selected.username}
                  <ExternalLink className="h-2.5 w-2.5" />
                </a>
              )}
              {selected.user_id && (
                <Link
                  to={`/admin/users/${selected.user_id}`}
                  className="mt-0.5 ms-2 inline-flex items-center gap-1 text-xs text-info hover:underline"
                  title={isRTL ? 'فتح حساب المالك' : 'Open owner account'}
                >
                  <UsersIcon className="h-3 w-3" />
                  {isRTL ? 'حساب المالك' : 'Owner account'}
                </Link>
              )}
            </div>
          </div>
          <Badge className={TONE[selected.approval_status ?? 'draft']}>
            {STATUSES.find((s) => s.value === (selected.approval_status ?? 'draft'))?.[language === 'ar' ? 'ar' : 'en']}
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="space-y-5">
        {selected.username && (
          <div className="rounded-xl border border-border/60 bg-muted/30 p-3">
            <div className="mb-2 flex items-center justify-between">
              <div className="text-xs font-semibold text-muted-foreground">
                {isRTL ? 'حالة اسم المستخدم' : 'Username status'}
              </div>
              <Badge variant="outline" className="text-[11px]">
                {selected.username_status ?? 'pending'}
              </Badge>
            </div>
            <div className="flex flex-wrap gap-2">
              <Button size="sm" variant="outline" onClick={() => onUsernameChange('approved')} disabled={usernamePending} className="gap-1">
                <CheckCircle2 className="h-3.5 w-3.5 text-success" />
                {isRTL ? 'الموافقة على الاسم' : 'Approve username'}
              </Button>
              <Button size="sm" variant="outline" onClick={() => onUsernameChange('rejected')} disabled={usernamePending} className="gap-1">
                <XCircle className="h-3.5 w-3.5 text-destructive" />
                {isRTL ? 'رفض الاسم' : 'Reject username'}
              </Button>
            </div>
          </div>
        )}

        <div className="grid gap-3 sm:grid-cols-2 text-sm">
          <div>
            <div className="text-xs text-muted-foreground">{isRTL ? 'البريد' : 'Email'}</div>
            <div className="tech-content inline-flex items-center gap-1.5">
              {selected.email
                ? (isSuperAdmin ? selected.email : <>{maskEmail(selected.email)} <Lock className="w-3 h-3 opacity-60" aria-label={isRTL ? 'متاح فقط لمدير النظام' : 'Super Admin only'} /></>)
                : '—'}
            </div>
          </div>
          <div>
            <div className="text-xs text-muted-foreground">{isRTL ? 'الجوال' : 'Phone'}</div>
            <div className="tech-content inline-flex items-center gap-1.5">
              {selected.phone
                ? (isSuperAdmin ? selected.phone : <>{maskPhone(selected.phone)} <Lock className="w-3 h-3 opacity-60" aria-label={isRTL ? 'متاح فقط لمدير النظام' : 'Super Admin only'} /></>)
                : '—'}
            </div>
          </div>
          <div className="sm:col-span-2">
            <div className="text-xs text-muted-foreground">{isRTL ? 'الوصف' : 'Description'}</div>
            <p className="leading-relaxed">
              {selected.description_ar || selected.short_description_ar || (isRTL ? 'لا يوجد وصف' : 'No description')}
            </p>
          </div>
        </div>

        <div className="space-y-2">
          <div className="text-xs font-semibold text-muted-foreground">{isRTL ? 'النشاط الرئيسي' : 'Primary activity'}</div>
          {taxonomyDisplay.primaryLabel ? (
            <div className="flex flex-wrap gap-1.5">
              <Badge variant="outline" className="gap-1 text-[11px]">
                <Tag className="h-3 w-3" />
                {taxonomyDisplay.primaryLabel}
              </Badge>
            </div>
          ) : (
            <p className="text-xs text-muted-foreground">
              {isRTL ? 'غير مصنّف — يحتاج ربط تصنيف' : 'Unclassified — needs taxonomy link'}
            </p>
          )}
        </div>

        {taxonomyDisplay.secondaryLabels.length > 0 && (
          <div className="space-y-2">
            <div className="text-xs font-semibold text-muted-foreground">{isRTL ? 'تصنيفات إضافية' : 'Secondary categories'}</div>
            <div className="flex flex-wrap gap-1.5">
              {taxonomyDisplay.secondaryLabels.map((label) => (
                <Badge key={label} variant="outline" className="gap-1 text-[11px]">
                  <Tag className="h-3 w-3" />
                  {label}
                </Badge>
              ))}
            </div>
          </div>
        )}

        {taxonomyDisplay.serviceLabels.length > 0 && (
          <div className="space-y-2">
            <div className="text-xs font-semibold text-muted-foreground">{isRTL ? 'تخصصات الخدمات' : 'Service categories'}</div>
            <div className="flex flex-wrap gap-1.5">
              {taxonomyDisplay.serviceLabels.map((label) => (
                <Badge key={label} variant="secondary" className="text-[11px]">{label}</Badge>
              ))}
            </div>
          </div>
        )}

        <div className="grid grid-cols-3 gap-2 rounded-lg border border-border/60 bg-muted/20 p-3 text-[11px] tech-content">
          <div>
            <div className="text-muted-foreground">{isRTL ? 'أُرسل' : 'Submitted'}</div>
            <div>{selected.submitted_at ? new Date(selected.submitted_at).toLocaleDateString() : '—'}</div>
          </div>
          <div>
            <div className="text-muted-foreground">{isRTL ? 'روجع' : 'Reviewed'}</div>
            <div>{selected.reviewed_at ? new Date(selected.reviewed_at).toLocaleDateString() : '—'}</div>
          </div>
          <div>
            <div className="text-muted-foreground">{isRTL ? 'نُشر' : 'Published'}</div>
            <div>{selected.published_at ? new Date(selected.published_at).toLocaleDateString() : '—'}</div>
          </div>
        </div>

        <div className="space-y-2">
          <div className="text-xs font-semibold text-muted-foreground">{isRTL ? 'ملاحظات للمزود' : 'Notes to provider'}</div>
          <Textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value.slice(0, 800))}
            rows={3}
            dir="auto"
            placeholder={isRTL ? 'سبب الرفض، تعديلات مطلوبة...' : 'Reason for rejection or required changes...'}
          />
          <p className="text-[11px] text-muted-foreground tech-content text-end">{notes.length}/800</p>
        </div>

        <CrDocumentScanner
          businessId={selected.id}
          defaults={{
            cr_document_url: selected.cr_document_url,
            cr_document_uploaded_at: selected.cr_document_uploaded_at,
            cr_scan_data: null,
            cr_scan_raw: null,
            national_id: selected.national_id,
            unified_number: selected.unified_number,
            vat_number: selected.vat_number,
            cr_owner_name: selected.cr_owner_name,
            cr_legal_entity: selected.cr_legal_entity,
            cr_issue_date: selected.cr_issue_date,
            cr_expiry_date: selected.cr_expiry_date,
            name_ar: selected.name_ar,
            name_en: selected.name_en,
          }}
        />

        <PublishReadinessPanel business={enrichedSelected} isRTL={isRTL} />

        <div className="flex flex-wrap gap-2">
          <Button size="sm" variant="outline" onClick={() => onApprovalChange('under_review')} disabled={approvalPending} className="gap-1">
            <Eye className="h-3.5 w-3.5" />
            {isRTL ? 'قيد المراجعة' : 'Under review'}
          </Button>
          <Button
            size="sm"
            variant="outline"
            onClick={() => {
              if (!notes.trim()) {
                toast.error(isRTL ? 'الرجاء كتابة ملاحظات' : 'Please add notes');
                return;
              }
              onApprovalChange('needs_changes');
            }}
            disabled={approvalPending}
            className="gap-1"
          >
            <AlertCircle className="h-3.5 w-3.5 text-warning" />
            {isRTL ? 'طلب تعديلات' : 'Request changes'}
          </Button>
          <Button size="sm" variant="outline" onClick={() => onApprovalChange('approved')} disabled={approvalPending} className="gap-1">
            <CheckCircle2 className="h-3.5 w-3.5 text-success" />
            {isRTL ? 'موافقة' : 'Approve'}
          </Button>
          <Button size="sm" variant="outline" onClick={() => onApprovalChange('submitted')} disabled={approvalPending} className="gap-1">
            <ShieldAlert className="h-3.5 w-3.5 text-warning" />
            {isRTL ? 'إلغاء النشر' : 'Unpublish'}
          </Button>
          <Button
            size="sm"
            variant="ghost"
            onClick={() => {
              if (!notes.trim()) {
                toast.error(isRTL ? 'يلزم سبب الرفض' : 'Reason required');
                return;
              }
              onApprovalChange('rejected');
            }}
            disabled={approvalPending}
            className="gap-1 text-destructive"
          >
            {approvalPending ? (
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
            ) : (
              <XCircle className="h-3.5 w-3.5" />
            )}
            {isRTL ? 'رفض' : 'Reject'}
          </Button>
          <Button asChild size="sm" variant="ghost">
            <Link to={`/admin/businesses?focus=${selected.id}`} className="gap-1">
              <Building2 className="h-3.5 w-3.5" />
              {isRTL ? 'إدارة كاملة' : 'Full admin'}
            </Link>
          </Button>
        </div>

        {/* ─────── Publish Publicly — gated action ───────
            Visible only when:
              • approval_status === 'approved'
              • is_active === true
              • is_demo === false
            For other statuses we surface a small locked hint so admins
            know publishing requires approval first.
         */}
        {(() => {
          const status = selected.approval_status ?? 'draft';
          const isActive = selected.is_active !== false;
          const isDemo = selected.is_demo === true;
          if (status === 'published') {
            return (
              <div
                data-testid="publish-publicly-locked"
                className="rounded-xl border border-success/30 bg-success/5 p-3 text-xs text-success"
              >
                <div className="flex items-center gap-2">
                  <Globe className="h-3.5 w-3.5" />
                  {isRTL
                    ? 'هذه الشركة منشورة للعامة وتظهر في البحث.'
                    : 'This provider is public and visible in search.'}
                </div>
              </div>
            );
          }
          if (status !== 'approved' || !isActive || isDemo) {
            return null;
          }
          return (
            <div
              data-testid="publish-publicly-action"
              className="rounded-xl border border-success/40 bg-success/5 p-3"
            >
              <div className="mb-2 flex items-center gap-2 text-xs font-semibold text-success">
                <Rocket className="h-3.5 w-3.5" />
                {isRTL ? 'جاهز للنشر للعامة' : 'Ready to publish publicly'}
              </div>
              <p className="mb-3 text-[12px] leading-relaxed text-muted-foreground">
                {isRTL
                  ? 'تم اعتماد هذه الشركة. اضغط "نشر للعامة" لجعلها تظهر في البحث والصفحات العامة.'
                  : 'This provider is approved. Click "Publish Publicly" to make it appear in search and on public pages.'}
              </p>
              {!confirmPublish ? (
                <Button
                  size="sm"
                  variant="hero"
                  data-testid="publish-publicly-btn"
                  onClick={() => setConfirmPublish(true)}
                  disabled={approvalPending}
                  className="gap-1"
                >
                  <Send className="h-3.5 w-3.5" />
                  {isRTL ? 'نشر للعامة' : 'Publish Publicly'}
                </Button>
              ) : (
                <div className="flex flex-wrap items-center gap-2">
                  <span className="text-[12px] font-medium">
                    {isRTL
                      ? 'هل تريد نشر هذه الشركة للعامة؟ ستظهر في البحث والصفحات العامة.'
                      : 'Publish this provider publicly? It will appear in search and on public pages.'}
                  </span>
                  <Button
                    size="sm"
                    variant="hero"
                    data-testid="publish-publicly-confirm"
                    onClick={() => {
                      onApprovalChange('published');
                      setConfirmPublish(false);
                    }}
                    disabled={approvalPending}
                    className="gap-1"
                  >
                    {approvalPending ? (
                      <Loader2 className="h-3.5 w-3.5 animate-spin" />
                    ) : (
                      <CheckCircle2 className="h-3.5 w-3.5" />
                    )}
                    {isRTL ? 'تأكيد النشر' : 'Confirm publish'}
                  </Button>
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => setConfirmPublish(false)}
                    disabled={approvalPending}
                  >
                    {isRTL ? 'إلغاء' : 'Cancel'}
                  </Button>
                </div>
              )}
            </div>
          );
        })()}
      </CardContent>
    </>
  );
};

export default ProviderReviewDetailPanel;