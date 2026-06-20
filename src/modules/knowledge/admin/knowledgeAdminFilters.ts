import type {
  KnowledgeAudience,
  KnowledgeItem,
  KnowledgeStatus,
  KnowledgeType,
} from '../knowledge.types';

export interface KnowledgeAdminFilterValues {
  search: string;
  categoryId: string | 'all';
  audience: KnowledgeAudience | 'all';
  type: KnowledgeType | 'all';
  status: KnowledgeStatus | 'all';
  usableByAssistant: 'any' | 'yes' | 'no';
  usableInMessages: 'any' | 'yes' | 'no';
  visibility: 'any' | 'public' | 'internal';
}

export const DEFAULT_KNOWLEDGE_ADMIN_FILTERS: KnowledgeAdminFilterValues = {
  search: '',
  categoryId: 'all',
  audience: 'all',
  type: 'all',
  status: 'all',
  usableByAssistant: 'any',
  usableInMessages: 'any',
  visibility: 'any',
};

function matchesSearch(item: KnowledgeItem, q: string): boolean {
  const needle = q.trim().toLowerCase();
  if (!needle) return true;
  const hay = [
    item.id, item.title.ar, item.title.en ?? '',
    item.summary?.ar ?? '', item.summary?.en ?? '',
    item.body.ar, item.body.en ?? '',
    item.tags.join(' '),
    item.source,
    item.categoryId ?? '',
  ].join(' ').toLowerCase();
  return hay.includes(needle);
}

function flag(v: 'any' | 'yes' | 'no', value: boolean): boolean {
  if (v === 'any') return true;
  return v === 'yes' ? value : !value;
}

/** Apply admin filter values on top of an already tab-scoped list. */
export function applyKnowledgeAdminFilters(
  items: readonly KnowledgeItem[],
  filters: KnowledgeAdminFilterValues,
): KnowledgeItem[] {
  return items.filter((item) => {
    if (!matchesSearch(item, filters.search)) return false;
    if (filters.categoryId !== 'all' && item.categoryId !== filters.categoryId) return false;
    if (filters.audience !== 'all' && !item.audience.includes(filters.audience)) return false;
    if (filters.type !== 'all' && item.type !== filters.type) return false;
    if (filters.status !== 'all' && item.status !== filters.status) return false;
    if (!flag(filters.usableByAssistant, item.usableByAssistant)) return false;
    if (!flag(filters.usableInMessages, item.usableInMessages)) return false;
    if (filters.visibility !== 'any') {
      const isInternal = item.status === 'internal' || item.type === 'internal_note';
      if (filters.visibility === 'internal' && !isInternal) return false;
      if (filters.visibility === 'public' && isInternal) return false;
    }
    return true;
  });
}

export const KNOWLEDGE_TYPE_OPTIONS: ReadonlyArray<{ value: KnowledgeType; ar: string; en: string }> = [
  { value: 'faq',              ar: 'سؤال شائع',     en: 'FAQ' },
  { value: 'help_article',     ar: 'مقال مساعدة',   en: 'Help article' },
  { value: 'guide',            ar: 'دليل',          en: 'Guide' },
  { value: 'policy',           ar: 'سياسة',         en: 'Policy' },
  { value: 'message_template', ar: 'قالب رسالة',    en: 'Message template' },
  { value: 'internal_note',    ar: 'ملاحظة داخلية', en: 'Internal note' },
];

export const KNOWLEDGE_STATUS_OPTIONS: ReadonlyArray<{ value: KnowledgeStatus; ar: string; en: string }> = [
  { value: 'published', ar: 'منشور',  en: 'Published' },
  { value: 'draft',     ar: 'مسودة',  en: 'Draft' },
  { value: 'internal',  ar: 'داخلي',  en: 'Internal' },
];

export const KNOWLEDGE_AUDIENCE_OPTIONS: ReadonlyArray<{ value: KnowledgeAudience; ar: string; en: string }> = [
  { value: 'visitor',        ar: 'زائر',           en: 'Visitor' },
  { value: 'customer',       ar: 'عميل',           en: 'Customer' },
  { value: 'provider',       ar: 'مزود خدمة',      en: 'Provider' },
  { value: 'business_owner', ar: 'صاحب منشأة',     en: 'Business owner' },
  { value: 'admin',          ar: 'مشرف',           en: 'Admin' },
  { value: 'operations',     ar: 'العمليات',       en: 'Operations' },
];