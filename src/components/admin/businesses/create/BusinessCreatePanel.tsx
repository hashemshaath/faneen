import React, { useCallback } from 'react';
import { Plus, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { pickBi } from '@/components/common/Bilingual';
import type { AdminCreateBusinessFormState } from '@/pages/admin/adminBusinesses.types';
import { BusinessCreateOwnerSection } from './BusinessCreateOwnerSection';
import { BusinessCreateBasicSection } from './BusinessCreateBasicSection';
import { BusinessCreateContactSection } from './BusinessCreateContactSection';
import { BusinessCreateRegistrySection } from './BusinessCreateRegistrySection';
import { BusinessCreateLocationNotice } from './BusinessCreateLocationNotice';
import { BusinessCreateActionsFooter } from './BusinessCreateActionsFooter';

export interface BusinessCreatePanelProps {
  isRTL: boolean;
  language: string;
  form: AdminCreateBusinessFormState;
  setForm: React.Dispatch<React.SetStateAction<AdminCreateBusinessFormState>>;
  onClose: () => void;
  onSubmit: () => void;
  isSubmitting: boolean;
}

/**
 * Phase 5F — Inline "Create new business" panel composer.
 * Splits the legacy 478-line `CreateBusinessPanel` into focused section
 * components under `src/components/admin/businesses/create/`. The
 * parent (`AdminBusinesses.tsx`) still owns form state, the create
 * mutation, and all submit/validation logic — nothing here calls
 * Supabase or mutates server state directly.
 */
export const BusinessCreatePanel = React.memo(function BusinessCreatePanel({
  isRTL,
  form,
  setForm,
  onClose,
  onSubmit,
  isSubmitting,
}: BusinessCreatePanelProps) {
  const setField = useCallback(
    (k: string, v: unknown) =>
      setForm((prev) => ({ ...prev, [k]: v }) as AdminCreateBusinessFormState),
    [setForm],
  );

  const sectionProps = { isRTL, form, setForm, setField };

  return (
    <div className="rounded-2xl border border-primary/30 bg-gradient-to-r from-primary/5 to-transparent p-5 animate-in slide-in-from-top-2 duration-200 shadow-sm">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-primary/15 flex items-center justify-center">
            <Plus className="w-4 h-4 text-primary" />
          </div>
          <div>
            <h3 className="font-heading font-bold text-base">
              {pickBi(isRTL, 'إضافة منشأة / جهة جديدة', 'Add new entity (company / organization)')}
            </h3>
            <p className="text-[11px] text-muted-foreground mt-0.5">
              {pickBi(
                isRTL,
                'مخصّص للشركات والمؤسسات والجهات الحكومية والخاصة. اختر المسؤول/المالك من المستخدمين ثم أدخل البيانات الرسمية للمنشأة (السجل التجاري، الرقم الموحّد، الضريبة… تُكمل لاحقاً).',
                'For companies, foundations, and public/private entities. Pick a responsible owner, then enter the entity\'s official data (CR, unified number, VAT… can be completed later).',
              )}
            </p>
          </div>
        </div>
        <Button variant="ghost" size="icon" onClick={onClose} className="rounded-xl" aria-label="Action">
          <X className="w-4 h-4" />
        </Button>
      </div>

      <div className="space-y-4">
        <BusinessCreateOwnerSection {...sectionProps} />
        <BusinessCreateBasicSection {...sectionProps} />
        <BusinessCreateContactSection {...sectionProps} />
        <BusinessCreateRegistrySection {...sectionProps} />
        <BusinessCreateLocationNotice isRTL={isRTL} />
        <div className="rounded-xl border border-warning/30 bg-warning/10 px-3 py-2 text-[12px] leading-relaxed text-warning-foreground">
          {pickBi(
            isRTL,
            'سيتم إنشاء الجهة كمسودة غير منشورة. بعد الحفظ افتح كرت حالة الظهور العام واضغط نشر الجهة عند جاهزية الرابط والبيانات.',
            'The entity will be created as an unpublished draft. After saving, use the Public visibility status card to publish it when the handle and data are ready.',
          )}
        </div>
        <BusinessCreateActionsFooter
          isRTL={isRTL}
          form={form}
          isSubmitting={isSubmitting}
          onSubmit={onSubmit}
          onClose={onClose}
        />
      </div>
    </div>
  );
});

export default BusinessCreatePanel;