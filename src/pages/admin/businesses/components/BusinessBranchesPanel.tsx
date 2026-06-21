/**
 * Phase 5I — Branch management UI panel for AdminBusinesses.
 *
 * Thin adapter that bundles the page-level state, the branch
 * mutations, and the main-business contact derivation into the
 * existing `<BusinessBranchesSection>` composer.  Owns no Supabase
 * calls and no mutations — every action still flows through the
 * mutations passed in from `AdminBusinesses.tsx`.
 */
import React from 'react';
import type { UseMutationResult } from '@tanstack/react-query';
import { BusinessBranchesSection } from '@/components/admin/businesses/branches/BusinessBranchesSection';
import type {
  BranchCountryOption,
  BranchRow,
} from '@/components/admin/businesses/branches/types';
import type { WorkingHours } from '@/modules/businesses/services/workingHours';
import type {
  AdminBranchFormState,
} from '@/pages/admin/businesses/hooks/useBusinessBranchFormState';
import { mapBranchRowToForm } from '@/pages/admin/businesses/mapBranchRowToForm';

/** Subset of the parent edit-form/editing-business fields needed to
 *  populate the "use main contact" shortcuts inside a branch form. */
export interface BranchPanelMainContactSource {
  editForm: {
    unified_number?: string | null;
    customer_service_phone?: string | null;
    email?: string | null;
    website?: string | null;
  };
  editingBiz: {
    unified_number?: string | null;
    customer_service_phone?: string | null;
    email?: string | null;
    website?: string | null;
  };
}

export interface BusinessBranchesPanelProps {
  isRTL: boolean;
  language: 'ar' | 'en';
  branches: BranchRow[];
  branchForm: AdminBranchFormState | null;
  setBranchForm: React.Dispatch<
    React.SetStateAction<AdminBranchFormState | null>
  >;
  editingBranchId: string | null;
  setEditingBranchId: React.Dispatch<React.SetStateAction<string | null>>;
  branchTranslating: 'ar' | 'en' | null;
  onTranslate: (from: 'ar' | 'en') => void;
  countries: BranchCountryOption[];
  emptyBranch: () => AdminBranchFormState;
  contactSource: BranchPanelMainContactSource;
  toggleBranchMutation: UseMutationResult<
    unknown,
    Error,
    { id: string; is_active: boolean },
    unknown
  >;
  deleteBranchMutation: UseMutationResult<unknown, Error, string, unknown>;
  saveBranchMutation: UseMutationResult<unknown, Error, void, unknown>;
  applyHoursToAllBranchesMutation: UseMutationResult<
    unknown,
    Error,
    unknown,
    unknown
  >;
}

export const BusinessBranchesPanel: React.FC<BusinessBranchesPanelProps> = ({
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
  emptyBranch,
  contactSource,
  toggleBranchMutation,
  deleteBranchMutation,
  saveBranchMutation,
  applyHoursToAllBranchesMutation,
}) => {
  const { editForm, editingBiz } = contactSource;
  return (
    <BusinessBranchesSection
      isRTL={isRTL}
      language={language}
      branches={branches}
      branchForm={branchForm}
      setBranchForm={setBranchForm}
      editingBranchId={editingBranchId}
      setEditingBranchId={setEditingBranchId}
      branchTranslating={branchTranslating}
      onTranslate={onTranslate}
      countries={countries}
      onToggleActive={(id, next) =>
        toggleBranchMutation.mutate({ id, is_active: next })
      }
      onEdit={(br) => {
        setEditingBranchId(br.id);
        setBranchForm(mapBranchRowToForm(br));
      }}
      onDelete={(id) => deleteBranchMutation.mutate(id)}
      onSave={() => saveBranchMutation.mutate()}
      saving={saveBranchMutation.isPending}
      emptyBranch={emptyBranch}
      mainContact={{
        unified_number: editForm.unified_number ?? editingBiz.unified_number ?? null,
        customer_service_phone:
          editForm.customer_service_phone ?? editingBiz.customer_service_phone ?? null,
        email: editForm.email ?? editingBiz.email ?? null,
        website: editForm.website ?? editingBiz.website ?? null,
      }}
      onApplyHoursToAllBranches={(hours: WorkingHours) =>
        applyHoursToAllBranchesMutation.mutate(hours as unknown)
      }
      applyingHoursToAllBranches={applyHoursToAllBranchesMutation.isPending}
    />
  );
};

export default BusinessBranchesPanel;