/**
 * Pure adapter — maps an admin RFQ row to props for
 * `QuoteRequestDetailsDrawer`. No Supabase, no side effects, no
 * mutations. Label sources come from the canonical
 * `@/lib/quoteRequests` re-exports.
 */
import type { AdminQuoteRow } from '@/modules/leads/services/list';
import { CUSTOMER_TYPE_LABEL_AR, SECTOR_LABEL_AR } from '@/lib/quoteRequests';
import type {
  QuoteRequestDetailsDrawerProps,
  QuoteRequestDrawerField,
} from './QuoteRequestDetailsDrawer';

export interface BuildQuoteRequestDrawerInput {
  row: AdminQuoteRow;
  fileCount?: number;
  isRTL?: boolean;
  onClose: () => void;
}

function formatDate(value: string | null | undefined, isRTL: boolean): string {
  if (!value) return '—';
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return '—';
  return d.toLocaleDateString(isRTL ? 'ar-SA-u-nu-latn' : 'en-US');
}

export function buildQuoteRequestDrawerProps({
  row,
  fileCount,
  isRTL = true,
  onClose,
}: BuildQuoteRequestDrawerInput): QuoteRequestDetailsDrawerProps {
  const fields: QuoteRequestDrawerField[] = [
    {
      label: isRTL ? 'القطاع' : 'Sector',
      value: SECTOR_LABEL_AR[row.sector] ?? row.sector,
    },
    { label: isRTL ? 'المدينة' : 'City', value: row.city || '—' },
    {
      label: isRTL ? 'رقم الجوال' : 'Phone',
      value: row.customer_phone || '—',
      tech: true,
    },
    {
      label: isRTL ? 'تاريخ الإنشاء' : 'Created',
      value: formatDate(row.created_at, isRTL),
      tech: true,
    },
  ];
  return {
    id: row.id,
    refId: row.ref_id,
    status: row.status,
    customerName: row.customer_name,
    customerType: CUSTOMER_TYPE_LABEL_AR[row.customer_type] ?? row.customer_type,
    fields,
    fileCount,
    isRTL,
    onClose,
  };
}

export default buildQuoteRequestDrawerProps;