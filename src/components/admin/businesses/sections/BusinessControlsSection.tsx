import { Switch } from '@/components/ui/switch';
import { pickBi } from '@/components/common/Bilingual';
import type { AdminEditBusinessFormState } from '@/pages/admin/adminBusinesses.types';
import type { TierMeta } from '@/pages/admin/businesses/_shared';
import { BusinessAdminActionCard } from './BusinessAdminActionCard';

type SetFieldFn = <K extends keyof AdminEditBusinessFormState>(
  field: K,
  value: AdminEditBusinessFormState[K],
) => void;

interface Props {
  editForm: AdminEditBusinessFormState;
  setField: SetFieldFn;
  isRTL: boolean;
  language: 'ar' | 'en';
  tiers: ReadonlyArray<TierMeta>;
}

/**
 * Phase 5E — presentational Controls tab for the admin edit-business
 * drawer. Active/Verification switches mirror the parent edit-form state
 * via `setField`. The save mutation lives in `AdminBusinesses.tsx`; this
 * component does NOT call Supabase, does NOT mutate, and does NOT change
 * publish/approval/verification logic.
 */
export function BusinessControlsSection({ editForm, setField, isRTL, language, tiers }: Props) {
  const cur = tiers.find((t) => t.value === editForm.membership_tier) || tiers[0];
  return (
    <div className="space-y-3">
      <BusinessAdminActionCard
        title={pickBi(isRTL, 'حالة التفعيل', 'Active Status')}
        description={pickBi(isRTL, 'تفعيل أو تعطيل ظهور العمل', 'Enable or disable business visibility')}
        action={
          <Switch
            checked={!!editForm.is_active}
            onCheckedChange={(v) => setField('is_active', v)}
          />
        }
      />
      <BusinessAdminActionCard
        title={pickBi(isRTL, 'التوثيق', 'Verification')}
        description={pickBi(isRTL, 'علامة التوثيق الرسمية', 'Official verification badge')}
        action={
          <Switch
            checked={!!editForm.is_verified}
            onCheckedChange={(v) => setField('is_verified', v)}
          />
        }
      />
      <BusinessAdminActionCard
        title={pickBi(isRTL, 'مستوى العضوية', 'Membership Tier')}
        description={pickBi(
          isRTL,
          'تغيير العضوية يتم من خيار العضوية في صف المنشأة.',
          'Use the row tier picker to change membership.',
        )}
      >
        <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-background/60 border border-border/40">
          <span>{cur.icon}</span>
          <span className="text-sm font-medium">
            {language === 'ar' ? cur.label_ar : cur.label_en}
          </span>
        </div>
      </BusinessAdminActionCard>
    </div>
  );
}

export default BusinessControlsSection;