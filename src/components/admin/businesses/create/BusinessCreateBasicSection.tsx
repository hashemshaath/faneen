import React from 'react';
import { BilingualNameField } from '@/components/forms/BilingualNameField';
import type { BusinessCreateSectionProps } from './types';

/**
 * Phase 5F — Basic entity identity section (AR/EN names + username).
 * Delegates entirely to the shared `BilingualNameField`; presentational.
 */
export const BusinessCreateBasicSection = React.memo(function BusinessCreateBasicSection({
  form,
  setForm,
  setField,
}: BusinessCreateSectionProps) {
  return (
    <BilingualNameField
      value={{
        full_name_ar: form.name_ar,
        full_name_en: form.name_en,
        username: form.username,
      }}
      onChange={(next) => {
        setForm((f) => ({
          ...f,
          name_ar: next.full_name_ar,
          name_en: next.full_name_en,
          username: next.username || '',
        }));
      }}
      onUsernameValidChange={(st) => {
        setField('username_ok', st.isValid && st.isAvailable);
      }}
      required
      excludeUserId={null}
      subject="entity"
      enableTranslate
    />
  );
});