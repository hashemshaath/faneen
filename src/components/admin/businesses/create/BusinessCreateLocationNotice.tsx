import React from 'react';
import { MapPin } from 'lucide-react';
import { pickBi } from '@/components/common/Bilingual';

/**
 * Phase 5F — Location/address notice.
 * The full national address form was retired from the create flow:
 * addresses are owned per-branch from the Branches tab after creation.
 * This block just communicates that to the admin.
 */
export const BusinessCreateLocationNotice = React.memo(function BusinessCreateLocationNotice({
  isRTL,
}: { isRTL: boolean }) {
  return (
    <div className="rounded-xl border border-dashed border-border bg-muted/20 p-3 text-[11px] text-muted-foreground flex items-start gap-2">
      <MapPin className="w-3.5 h-3.5 text-primary mt-0.5 shrink-0" />
      <p>
        {pickBi(
          isRTL,
          'العنوان يُدار من تبويب "الفروع" بعد الإنشاء. أضف الفرع الرئيسي (المركز الرئيسي) ثم باقي الفروع/المستودعات/المكاتب الإدارية.',
          'Address is managed from the "Branches" tab after creation. Add the main branch (headquarters) first, then any branches / warehouses / admin offices.',
        )}
      </p>
    </div>
  );
});