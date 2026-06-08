import type { AssetStatus, AssetMaintenanceStatus, AssetInspectionResult, AssetInspectionFrequency } from './types';

export const ASSET_STATUS_LABELS: Record<AssetStatus, { ar: string; en: string }> = {
  available: { ar: 'متاح', en: 'Available' },
  rented: { ar: 'مؤجَّر', en: 'Rented' },
  reserved: { ar: 'محجوز', en: 'Reserved' },
  maintenance: { ar: 'صيانة', en: 'Maintenance' },
  inspection: { ar: 'فحص', en: 'Inspection' },
  retired: { ar: 'مُستبعد', en: 'Retired' },
};

export const ASSET_STATUS_TONE: Record<AssetStatus, 'success' | 'info' | 'warning' | 'danger' | 'neutral'> = {
  available: 'success',
  rented: 'info',
  reserved: 'info',
  maintenance: 'warning',
  inspection: 'warning',
  retired: 'neutral',
};

export const MAINTENANCE_STATUS_LABELS: Record<AssetMaintenanceStatus, { ar: string; en: string }> = {
  planned: { ar: 'مجدولة', en: 'Planned' },
  in_progress: { ar: 'جارية', en: 'In progress' },
  completed: { ar: 'مكتملة', en: 'Completed' },
  overdue: { ar: 'متجاوزة', en: 'Overdue' },
  cancelled: { ar: 'ملغاة', en: 'Cancelled' },
};

export const INSPECTION_RESULT_LABELS: Record<AssetInspectionResult, { ar: string; en: string }> = {
  pending: { ar: 'قيد الانتظار', en: 'Pending' },
  passed: { ar: 'مطابق', en: 'Passed' },
  failed: { ar: 'غير مطابق', en: 'Failed' },
  needs_attention: { ar: 'يحتاج انتباه', en: 'Needs attention' },
};

export const INSPECTION_FREQUENCY_LABELS: Record<AssetInspectionFrequency, { ar: string; en: string }> = {
  daily: { ar: 'يومي', en: 'Daily' },
  weekly: { ar: 'أسبوعي', en: 'Weekly' },
  monthly: { ar: 'شهري', en: 'Monthly' },
  quarterly: { ar: 'ربع سنوي', en: 'Quarterly' },
  annual: { ar: 'سنوي', en: 'Annual' },
};