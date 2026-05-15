import { supabase } from '@/integrations/supabase/client';

export const QUOTE_BUCKET = 'quote-request-files';
export const SIGNED_URL_TTL = 600; // 10 minutes

export const QUOTE_STATUSES = ['new','under_review','matched','contacted','completed','cancelled'] as const;
export type QuoteStatus = typeof QUOTE_STATUSES[number];

export const QUOTE_STATUS_LABEL_AR: Record<QuoteStatus, string> = {
  new: 'جديد',
  under_review: 'قيد المراجعة',
  matched: 'تم توجيهه لمزودين',
  contacted: 'تم التواصل',
  completed: 'مكتمل',
  cancelled: 'ملغي',
};
export const QUOTE_STATUS_LABEL_EN: Record<QuoteStatus, string> = {
  new: 'New',
  under_review: 'Under review',
  matched: 'Matched',
  contacted: 'Contacted',
  completed: 'Completed',
  cancelled: 'Cancelled',
};
export const QUOTE_STATUS_DESC_AR: Record<QuoteStatus, string> = {
  new: 'تم استلام الطلب وهو بانتظار المراجعة.',
  under_review: 'تتم مراجعة تفاصيل الطلب للتأكد من وضوحها.',
  matched: 'تم توجيه الطلب لمزودين مناسبين حسب القطاع والمدينة.',
  contacted: 'تم التواصل بخصوص الطلب أو بدأت مرحلة المتابعة.',
  completed: 'تم إغلاق الطلب كمكتمل.',
  cancelled: 'تم إلغاء الطلب.',
};
export const QUOTE_STATUS_TONE: Record<QuoteStatus, string> = {
  new: 'bg-primary/10 text-primary border-primary/30',
  under_review: 'bg-warning/10 text-warning border-warning/30',
  matched: 'bg-info/10 text-info border-info/30',
  contacted: 'bg-success/10 text-success border-success/30',
  completed: 'bg-emerald-500/10 text-emerald-600 border-emerald-500/30',
  cancelled: 'bg-muted text-muted-foreground border-border',
};

export const CUSTOMER_TYPE_LABEL_AR: Record<string, string> = {
  individual: 'فرد',
  contractor: 'مقاول',
  engineering_office: 'مكتب هندسي',
  company: 'شركة',
  government: 'جهة حكومية أو شبه حكومية',
  other: 'أخرى',
};

export const CONTACT_METHOD_LABEL_AR: Record<string, string> = {
  whatsapp: 'واتساب',
  call: 'اتصال',
  email: 'بريد إلكتروني',
};

export const SERVICE_LOCATION_LABEL_AR: Record<string, string> = {
  project_site: 'في موقع المشروع',
  provider_location: 'لدى الورشة أو المصنع',
  not_sure: 'غير متأكد',
};

export const TIMELINE_LABEL_AR: Record<string, string> = {
  week: 'خلال أسبوع',
  'two-weeks': 'خلال أسبوعين',
  month: 'خلال شهر',
  flexible: 'مرن',
  'ask-provider': 'حسب رأي المزود',
};

export const SECTOR_LABEL_AR: Record<string, string> = {
  aluminum: 'ألمنيوم', iron: 'حديد', wood: 'خشب', glass: 'زجاج',
  stainless: 'ستانلس ستيل', fabrication: 'تصنيع وتركيب',
  storefronts: 'واجهات ومحلات', 'project-fitout': 'تجهيزات مشاريع', other: 'أخرى',
};

export async function createSignedQuoteFileUrl(filePath: string): Promise<string | null> {
  const { data, error } = await supabase.storage
    .from(QUOTE_BUCKET)
    .createSignedUrl(filePath, SIGNED_URL_TTL);
  if (error) {
    console.warn('signed url failed', error);
    return null;
  }
  return data?.signedUrl ?? null;
}

export function normalizePhoneForWhatsApp(phone: string): string {
  const digits = phone.replace(/\D/g, '');
  if (digits.startsWith('966')) return digits;
  if (digits.startsWith('0')) return '966' + digits.slice(1);
  if (digits.startsWith('5')) return '966' + digits;
  return digits;
}

export function formatFileSize(bytes: number | null | undefined): string {
  if (!bytes) return '';
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / 1024 / 1024).toFixed(2)} MB`;
}

// =====================
// Quote request leads (provider matching)
// =====================
export const LEAD_STATUSES = ['new','viewed','interested','not_interested','contacted','expired','cancelled'] as const;
export type LeadStatus = typeof LEAD_STATUSES[number];

export const LEAD_STATUS_LABEL_AR: Record<LeadStatus, string> = {
  new: 'جديد',
  viewed: 'تمت المشاهدة',
  interested: 'مهتم',
  not_interested: 'غير مناسب',
  contacted: 'تم التواصل',
  expired: 'منتهي',
  cancelled: 'ملغي',
};

export const LEAD_STATUS_TONE: Record<LeadStatus, string> = {
  new: 'bg-primary/10 text-primary border-primary/30',
  viewed: 'bg-info/10 text-info border-info/30',
  interested: 'bg-success/10 text-success border-success/30',
  not_interested: 'bg-muted text-muted-foreground border-border',
  contacted: 'bg-emerald-500/10 text-emerald-600 border-emerald-500/30',
  expired: 'bg-warning/10 text-warning border-warning/30',
  cancelled: 'bg-muted text-muted-foreground border-border',
};