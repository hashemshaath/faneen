import React from 'react';
import { Plus, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { pickBi } from '@/components/common/Bilingual';
import type { AdminCreateBusinessFormState } from '@/pages/admin/adminBusinesses.types';

export interface BusinessCreateActionsFooterProps {
  isRTL: boolean;
  form: AdminCreateBusinessFormState;
  isSubmitting: boolean;
  onSubmit: () => void;
  onClose: () => void;
}

/**
 * Phase 5F — Save/Cancel footer for the create-business panel.
 * Pure presentational: the parent owns submit and validity logic.
 */
export const BusinessCreateActionsFooter = React.memo(function BusinessCreateActionsFooter({
  isRTL,
  form,
  isSubmitting,
  onSubmit,
  onClose,
}: BusinessCreateActionsFooterProps) {
  const disabled = isSubmitting
    || !form.name_ar?.trim()
    || !form.username
    || !form.username_ok;
  return (
    <>
      <Separator className="my-2" />
      <div className="flex gap-2">
        <Button
          onClick={onSubmit}
          disabled={disabled}
          className="flex-1 gap-1.5 rounded-xl"
        >
          {isSubmitting ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Plus className="w-3.5 h-3.5" />}
          {pickBi(isRTL, 'إنشاء المنشأة وفتح بيانات السجل للتعديل', 'Create entity & open registry data')}
        </Button>
        <Button variant="outline" onClick={onClose} className="rounded-xl">
          {pickBi(isRTL, 'إلغاء', 'Cancel')}
        </Button>
      </div>
    </>
  );
});