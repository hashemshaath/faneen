/** RENTAL-MICROSERVICE-1 — shared TypeScript types. */

export type RentalUnit = 'day' | 'hour' | 'piece' | 'm' | 'm2' | 'unit';
export type RentalItemStatus = 'draft' | 'pending_review' | 'approved' | 'rejected' | 'archived';
export type RentalOrderStatus =
  | 'draft' | 'active' | 'expiring_soon' | 'expired'
  | 'extended' | 'renewed' | 'closed' | 'cancelled';
export type RentalExtensionType = 'full' | 'partial' | 'duration_only' | 'quantity_only';
export type RentalExtensionStatus = 'pending' | 'approved' | 'rejected' | 'cancelled';

export interface RentalCategory {
  id: string;
  ref_id: string;
  slug: string;
  name_ar: string;
  name_en: string;
  description_ar: string | null;
  description_en: string | null;
  icon: string | null;
  seo_keywords: string[] | null;
  default_image_url: string | null;
  sort_order: number;
  is_active: boolean;
}

export interface RentalItem {
  id: string;
  ref_id: string;
  category_id: string;
  provider_business_id: string;
  name_ar: string;
  name_en: string | null;
  description_ar: string | null;
  description_en: string | null;
  unit: RentalUnit;
  base_price: number;
  currency: string;
  min_duration: number;
  deposit_amount: number;
  usage_terms: string | null;
  late_terms: string | null;
  penalty_terms: string | null;
  status: RentalItemStatus;
  city_id: string | null;
  service_areas: unknown;
  images: string[];
  availability_status: string;
  is_published: boolean;
  seo_slug: string | null;
  view_count: number;
  created_at: string;
  updated_at: string;
}

export interface RentalOrder {
  id: string;
  ref_id: string;
  provider_business_id: string;
  customer_user_id: string | null;
  customer_business_id: string | null;
  project_id: string | null;
  work_order_id: string | null;
  client_site_id: string | null;
  rental_item_id: string;
  quantity: number;
  start_date: string;
  end_date: string;
  total_days: number;
  unit_price: number;
  total_amount: number;
  deposit_amount: number;
  currency: string;
  status: RentalOrderStatus;
  notes: string | null;
  terms_snapshot: unknown;
  created_at: string;
  updated_at: string;
}

export interface RentalExtension {
  id: string;
  ref_id: string;
  rental_order_id: string;
  extension_type: RentalExtensionType;
  additional_days: number;
  additional_quantity: number;
  reason: string | null;
  cost: number;
  approved_by_provider: boolean;
  approved_by_customer: boolean;
  status: RentalExtensionStatus;
  effective_from: string | null;
  created_at: string;
}

export type ServiceResult<T> = { data: T | null; error: Error | null };