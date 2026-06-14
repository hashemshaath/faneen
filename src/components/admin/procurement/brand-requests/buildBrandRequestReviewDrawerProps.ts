/**
 * Pure adapter — maps an admin brand-request row to props for
 * `BrandRequestReviewDrawer`. No Supabase, no async, no I/O, no side
 * effects. Labels are resolved upstream by the calling page (the brand
 * module owns the canonical label maps).
 */
import type { BrandRequest } from '@/modules/brands';
import type {
  BrandRequestDrawerField,
  BrandRequestReviewDrawerProps,
} from './BrandRequestReviewDrawer';

export interface BuildBrandRequestReviewDrawerInput {
  row: BrandRequest;
  isRTL?: boolean;
  requestTypeLabel?: string | null;
  relationshipLabel?: string | null;
  businessLabel?: string | null;
  businessRefId?: string | null;
  onClose: () => void;
  actionsSlot?: BrandRequestReviewDrawerProps['actionsSlot'];
}

function formatDate(value: string | null | undefined, isRTL: boolean): string {
  if (!value) return '—';
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return '—';
  return d.toLocaleDateString(isRTL ? 'ar-SA-u-nu-latn' : 'en-US');
}

export function buildBrandRequestReviewDrawerProps({
  row,
  isRTL = true,
  requestTypeLabel,
  relationshipLabel,
  businessLabel,
  businessRefId,
  onClose,
  actionsSlot,
}: BuildBrandRequestReviewDrawerInput): BrandRequestReviewDrawerProps {
  const brandName = isRTL ? row.name_ar : (row.name_en ?? row.name_ar);
  const fields: BrandRequestDrawerField[] = [
    {
      label: isRTL ? 'الاسم بالعربية' : 'Name (AR)',
      value: row.name_ar || '—',
    },
    {
      label: isRTL ? 'الاسم بالإنجليزية' : 'Name (EN)',
      value: row.name_en ?? '—',
    },
    {
      label: isRTL ? 'بلد المنشأ' : 'Origin',
      value: row.proposed_country_of_origin_code ?? '—',
      tech: !!row.proposed_country_of_origin_code,
    },
    {
      label: isRTL ? 'دول التصنيع' : 'Manufacturing',
      value:
        (row.proposed_manufacturing_countries ?? [])
          .map((c) => c.country_code)
          .join(', ') || '—',
      tech: (row.proposed_manufacturing_countries ?? []).length > 0,
    },
    {
      label: isRTL ? 'القطاعات المقترحة' : 'Proposed sectors',
      value: String((row.proposed_sector_ids ?? []).length || '—'),
    },
    {
      label: isRTL ? 'الخدمات المقترحة' : 'Proposed services',
      value: String((row.proposed_service_ids ?? []).length || '—'),
    },
    ...(relationshipLabel
      ? [{
          label: isRTL ? 'نوع العلاقة' : 'Relationship',
          value: relationshipLabel,
        }]
      : []),
    {
      label: isRTL ? 'تاريخ الإنشاء' : 'Created',
      value: formatDate(row.created_at, isRTL),
      tech: true,
    },
    {
      label: isRTL ? 'آخر تحديث' : 'Updated',
      value: formatDate(row.updated_at, isRTL),
      tech: true,
    },
  ];
  return {
    id: row.id,
    refId: row.ref_id,
    status: row.status,
    brandName,
    requestType: requestTypeLabel ?? undefined,
    businessLabel: businessLabel ?? undefined,
    businessRefId: businessRefId ?? null,
    fields,
    adminNote: row.admin_notes,
    rejectReason: row.reject_reason,
    requesterNotes: row.notes,
    isRTL,
    onClose,
    actionsSlot,
  };
}

export default buildBrandRequestReviewDrawerProps;