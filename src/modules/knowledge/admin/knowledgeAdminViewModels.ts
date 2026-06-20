import type { KnowledgeItem } from '../knowledge.types';
import { getCategory } from '../knowledgeCategories';

export interface KnowledgeAdminRowVM {
  id: string;
  title: string;
  categoryLabel: string;
  typeLabel: string;
  statusLabel: string;
  audienceLabels: string[];
  source: string;
  relatedRoutes: string[];
  usableByAssistant: boolean;
  usableInMessages: boolean;
  updatedAt?: string;
  isInternal: boolean;
}

const TYPE_AR: Record<KnowledgeItem['type'], string> = {
  faq: 'سؤال شائع',
  help_article: 'مقال مساعدة',
  guide: 'دليل',
  policy: 'سياسة',
  message_template: 'قالب رسالة',
  internal_note: 'ملاحظة داخلية',
};

const STATUS_AR: Record<KnowledgeItem['status'], string> = {
  published: 'منشور',
  draft: 'مسودة',
  internal: 'داخلي',
};

const AUDIENCE_AR: Record<KnowledgeItem['audience'][number], string> = {
  visitor: 'زائر',
  customer: 'عميل',
  provider: 'مزود',
  business_owner: 'صاحب منشأة',
  admin: 'مشرف',
  operations: 'عمليات',
};

export function toKnowledgeAdminRowVM(item: KnowledgeItem): KnowledgeAdminRowVM {
  const cat = item.categoryId ? getCategory(item.categoryId) : undefined;
  return {
    id: item.id,
    title: item.title.ar,
    categoryLabel: cat?.title.ar ?? '—',
    typeLabel: TYPE_AR[item.type],
    statusLabel: STATUS_AR[item.status],
    audienceLabels: item.audience.map((a) => AUDIENCE_AR[a]),
    source: item.source,
    relatedRoutes: item.relatedRoutes ?? [],
    usableByAssistant: item.usableByAssistant,
    usableInMessages: item.usableInMessages,
    updatedAt: item.updatedAt,
    isInternal: item.status === 'internal' || item.type === 'internal_note',
  };
}