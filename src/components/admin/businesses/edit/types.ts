import type { AdminEditBusinessFormState } from '@/pages/admin/adminBusinesses.types';

export type EditFormFieldKey = keyof AdminEditBusinessFormState;

export type SetEditFieldFn = (key: EditFormFieldKey, value: unknown) => void;

export type EditPanelEditingBiz = {
  id: string;
  user_id: string;
  ref_id: string | null;
  legacy_ref_id?: string | null;
  username: string | null;
  name_ar: string;
  name_en?: string | null;
  created_at: string;
  rating_avg: number | null;
  rating_count: number | null;
};

export type EditPanelOwnerRef = { ref_id: string | null } | null | undefined;

export type EditPanelPortfolioImage = { id: string; media_url: string };

export type EditPanelService = {
  id: string;
  business_id: string;
  name_ar: string;
  name_en: string | null;
};

export type EditPanelCityName = {
  name_ar: string | null;
  name_en: string | null;
} | null | undefined;