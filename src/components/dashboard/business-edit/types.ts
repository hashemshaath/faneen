/**
 * Shared types for the dashboard business-edit experience.
 * Mirrors columns of `public.businesses` that are user-editable.
 */
export interface BusinessRow {
  id: string;
  user_id: string;
  username: string;
  ref_id: string | null;
  approval_status: string | null;
  membership_tier: string | null;
  is_active: boolean;
  is_verified: boolean;
  onboarding_completion: number | null;

  // Identity
  name_ar: string | null;
  name_en: string | null;
  logo_url: string | null;
  cover_url: string | null;
  description_ar: string | null;
  description_en: string | null;
  short_description_ar: string | null;
  short_description_en: string | null;

  // Contact
  phone: string | null;
  mobile: string | null;
  customer_service_phone: string | null;
  email: string | null;
  website: string | null;
  contact_person: string | null;

  // Location (bilingual)
  country_id: string | null;
  city_id: string | null;
  region: string | null;
  region_en: string | null;
  district: string | null;
  district_en: string | null;
  address: string | null;
  address_en: string | null;
  street_name: string | null;
  street_name_en: string | null;
  building_number: string | null;
  additional_number: string | null;
  latitude: number | null;
  longitude: number | null;

  // Legal
  national_id: string | null;        // CR
  unified_number: string | null;
  vat_number: string | null;

  // Account manager (primary point of contact)
  account_manager_name: string | null;
  account_manager_phone: string | null;
  account_manager_email: string | null;
  account_manager_position: string | null;

  // Categorization
  sectors: string[] | null;
  sub_services: string[] | null;
  category_id: string | null;
}

export type StaffRole = 'owner' | 'manager' | 'editor' | 'viewer';

export interface StaffMember {
  id: string;
  business_id: string;
  user_id: string;
  role: StaffRole;
  is_active: boolean;
  created_at: string;
  profile?: {
    full_name: string | null;
    email: string | null;
    phone: string | null;
    avatar_url: string | null;
    ref_id: string | null;
  } | null;
}

/** Localised role metadata used for badges and selects. */
export const STAFF_ROLE_META: Record<StaffRole, { ar: string; en: string; tone: string; desc_ar: string; desc_en: string }> = {
  owner:   { ar: 'مالك',     en: 'Owner',   tone: 'border-primary/30 bg-primary/10 text-primary',
             desc_ar: 'صلاحيات كاملة، لا يمكن تعديل دوره من هذه الشاشة.', desc_en: 'Full access, cannot be demoted from this screen.' },
  manager: { ar: 'مدير',     en: 'Manager', tone: 'border-info/30 bg-info/10 text-info',
             desc_ar: 'يدير الفريق والإعدادات وإصدار العقود.',           desc_en: 'Manages staff, settings, and contracts.' },
  editor:  { ar: 'محرّر',    en: 'Editor',  tone: 'border-emerald-500/30 bg-emerald-500/10 text-emerald-600',
             desc_ar: 'يحرّر بيانات المنشأة، الخدمات، والمعرض.',         desc_en: 'Edits business data, services, and portfolio.' },
  viewer:  { ar: 'مشاهد',    en: 'Viewer',  tone: 'border-muted-foreground/30 bg-muted text-muted-foreground',
             desc_ar: 'وصول للقراءة فقط للوحات والتقارير.',               desc_en: 'Read-only access to dashboards and reports.' },
};