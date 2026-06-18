import React from 'react';
import { Plus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { pickBi } from '@/components/common/Bilingual';
import { BusinessBranchCard } from './BusinessBranchCard';
import { BusinessBranchForm } from './BusinessBranchForm';
import { BusinessBranchesEmptyState } from './BusinessBranchesEmptyState';
import type {
  BranchCountryOption,
  BranchFormSetter,
  BranchFormState,
  BranchMainContact,
  BranchRow,
  BranchTypeId,
} from './types';
import type { WorkingHours } from '@/modules/businesses/services/workingHours';

/** Phase 5D — composer for the branches tab. Owns no state or mutations:
 *  state, queries, and mutations remain in `AdminBusinesses.tsx`. */
export interface BusinessBranchesSectionProps {
  isRTL: boolean;
  language: 'ar' | 'en';
  branches: BranchRow[];
  branchForm: BranchFormState | null;
  setBranchForm: BranchFormSetter;
  editingBranchId: string | null;
  setEditingBranchId: (id: string | null) => void;
  branchTranslating: 'ar' | 'en' | null;
  onTranslate: (from: 'ar' | 'en') => void;
  countries: BranchCountryOption[];
  onToggleActive: (id: string, next: boolean) => void;
  onEdit: (branch: BranchRow) => void;
  onDelete: (id: string) => void;
  onSave: () => void;
  saving: boolean;
  emptyBranch: () => BranchFormState;
  /** Contact values of the parent business; used to power per-field
   *  "Use main" shortcuts in the inline branch form. */
  mainContact?: BranchMainContact;
  /** Bulk-apply working hours from the currently-edited branch to all
   *  other branches of the same business. Optional. */
  onApplyHoursToAllBranches?: (hours: WorkingHours) => void;
  applyingHoursToAllBranches?: boolean;
}

export const BusinessBranchesSection: React.FC<BusinessBranchesSectionProps> = ({
  isRTL,
  language,
  branches,
  branchForm,
  setBranchForm,
  editingBranchId,
  setEditingBranchId,
  branchTranslating,
  onTranslate,
  countries,
  onToggleActive,
  onEdit,
  onDelete,
  onSave,
  saving,
  emptyBranch,
  mainContact,
  onApplyHoursToAllBranches,
  applyingHoursToAllBranches,
}) => {
  return (
    <div className="space-y-4 mt-3">
      <div className="space-y-2">
        {branches.map((br) => (
          <BusinessBranchCard
            key={br.id}
            branch={br}
            isRTL={isRTL}
            language={language}
            onToggleActive={onToggleActive}
            onEdit={onEdit}
            onDelete={onDelete}
          />
        ))}
        {branches.length === 0 && !branchForm && <BusinessBranchesEmptyState isRTL={isRTL} />}
      </div>

      {branchForm ? (
        <BusinessBranchForm
          isRTL={isRTL}
          language={language}
          branchForm={branchForm}
          setBranchForm={setBranchForm}
          editingBranchId={editingBranchId}
          setEditingBranchId={setEditingBranchId}
          branchTranslating={branchTranslating}
          onTranslate={onTranslate}
          branches={branches}
          countries={countries}
          onSave={onSave}
          saving={saving}
          mainContact={mainContact}
          onApplyHoursToAllBranches={onApplyHoursToAllBranches}
          applyingHoursToAllBranches={applyingHoursToAllBranches}
        />
      ) : (
        <Button
          variant="outline"
          className="w-full gap-1.5"
          onClick={() => {
            // First location defaults to "main" (headquarters); subsequent
            // ones default to "branch" and admins can switch types.
            const isFirst = branches.length === 0;
            const next = emptyBranch();
            const branchType: BranchTypeId = isFirst ? 'main' : 'branch';
            setBranchForm({ ...next, is_main: isFirst, branch_type: branchType });
            setEditingBranchId(null);
          }}
        >
          <Plus className="w-3.5 h-3.5" />{' '}
          {pickBi(
            isRTL,
            'إضافة موقع جديد (فرع / مستودع / مكتب)',
            'Add new location (branch / warehouse / office)',
          )}
        </Button>
      )}
    </div>
  );
};

export default BusinessBranchesSection;