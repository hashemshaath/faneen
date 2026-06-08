/** ASSET-MANAGEMENT-MICROSERVICE-1 — shared TypeScript types. */

export type AssetStatus = 'available' | 'rented' | 'reserved' | 'maintenance' | 'inspection' | 'retired';
export type AssetMaintenanceStatus = 'planned' | 'in_progress' | 'completed' | 'overdue' | 'cancelled';
export type AssetMaintenanceKind = 'preventive' | 'corrective' | 'emergency' | 'calibration';
export type AssetInspectionFrequency = 'daily' | 'weekly' | 'monthly' | 'quarterly' | 'annual';
export type AssetInspectionResult = 'pending' | 'passed' | 'failed' | 'needs_attention';

export interface AssetCategory {
  id: string;
  ref_id: string;
  slug: string;
  name_ar: string;
  name_en: string;
  description_ar: string | null;
  description_en: string | null;
  icon: string | null;
  sort_order: number;
  is_active: boolean;
}

export interface Asset {
  id: string;
  ref_id: string;
  owner_business_id: string;
  category_id: string | null;
  name_ar: string;
  name_en: string | null;
  description_ar: string | null;
  description_en: string | null;
  serial_number: string | null;
  manufacturer: string | null;
  model: string | null;
  year_manufactured: number | null;
  purchase_date: string | null;
  purchase_cost: number | null;
  currency: string;
  current_location: string | null;
  city_id: string | null;
  status: AssetStatus;
  condition_rating: number | null;
  next_maintenance_at: string | null;
  next_inspection_at: string | null;
  images: string[] | unknown;
  notes: string | null;
  is_active: boolean;
  retired_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface AssetMaintenance {
  id: string;
  ref_id: string;
  asset_id: string;
  kind: AssetMaintenanceKind;
  status: AssetMaintenanceStatus;
  title: string;
  description: string | null;
  scheduled_for: string | null;
  started_at: string | null;
  completed_at: string | null;
  cost: number;
  currency: string;
  performed_by: string | null;
  next_due_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface AssetInspection {
  id: string;
  ref_id: string;
  asset_id: string;
  frequency: AssetInspectionFrequency;
  result: AssetInspectionResult;
  checklist: unknown;
  scheduled_for: string | null;
  inspected_at: string | null;
  inspector_name: string | null;
  notes: string | null;
  next_due_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface AssetUtilization {
  id: string;
  asset_id: string;
  period_start: string;
  period_end: string;
  days_rented: number;
  days_idle: number;
  days_maintenance: number;
  revenue: number;
  currency: string;
  utilization_rate: number;
}

export interface AssetAlert {
  id: string;
  ref_id: string;
  asset_id: string;
  alert_type: string;
  severity: 'info' | 'warning' | 'critical';
  message_ar: string | null;
  message_en: string | null;
  is_resolved: boolean;
  resolved_at: string | null;
  created_at: string;
}

export interface AssetOpsCounts {
  total: number;
  available: number;
  rented: number;
  maintenance: number;
  inspection: number;
  retired: number;
  maintenance_overdue: number;
  maintenance_due_soon: number;
  inspections_overdue: number;
  open_alerts: number;
  low_utilization: number;
}

export type ServiceResult<T> = { data: T | null; error: Error | null };