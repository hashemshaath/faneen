import type React from 'react';
import type { AdminCreateBusinessFormState } from '@/pages/admin/adminBusinesses.types';

/**
 * Phase 5F — shared prop contract for the Create Business panel sections.
 * Sections are presentational only: they receive the parent-owned form
 * state plus a setter and never call Supabase or own mutations.
 */
export interface BusinessCreateSectionProps {
  isRTL: boolean;
  form: AdminCreateBusinessFormState;
  setForm: React.Dispatch<React.SetStateAction<AdminCreateBusinessFormState>>;
  setField: (key: string, value: unknown) => void;
}