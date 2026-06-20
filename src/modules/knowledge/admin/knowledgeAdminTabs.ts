import type { KnowledgeItem, KnowledgeQueryFilter } from '../knowledge.types';
import { filterKnowledge } from '../knowledgeSearch';

export type KnowledgeAdminTabId =
  | 'all'
  | 'faq'
  | 'help'
  | 'assistant'
  | 'messages'
  | 'internal';

export interface KnowledgeAdminTab {
  id: KnowledgeAdminTabId;
  labelAr: string;
  labelEn: string;
  /** Returns the items belonging to this tab (before user filters). */
  select(items: readonly KnowledgeItem[]): KnowledgeItem[];
}

/** Canonical admin tab list. Each tab is a pure projection. */
export const KNOWLEDGE_ADMIN_TABS: readonly KnowledgeAdminTab[] = Object.freeze([
  {
    id: 'all',
    labelAr: 'كل المحتوى',
    labelEn: 'All content',
    select: (items) => items.filter((i) => i.status !== 'internal'),
  },
  {
    id: 'faq',
    labelAr: 'الأسئلة الشائعة',
    labelEn: 'FAQ',
    select: (items) => filterKnowledge({ type: 'faq' }, items),
  },
  {
    id: 'help',
    labelAr: 'مركز المساعدة',
    labelEn: 'Help center',
    select: (items) => filterKnowledge({ type: ['help_article', 'guide', 'policy'] }, items),
  },
  {
    id: 'assistant',
    labelAr: 'المساعد الذكي',
    labelEn: 'AI assistant',
    select: (items) => filterKnowledge({ usableByAssistant: true }, items),
  },
  {
    id: 'messages',
    labelAr: 'المراسلات',
    labelEn: 'Messages',
    select: (items) => filterKnowledge({ usableInMessages: true }, items),
  },
  {
    id: 'internal',
    labelAr: 'داخلي',
    labelEn: 'Internal',
    select: (items) => items.filter(
      (i) => i.status === 'internal' || i.type === 'internal_note' || i.categoryId === 'internal-ops',
    ),
  },
]);

export function getKnowledgeAdminTab(id: KnowledgeAdminTabId): KnowledgeAdminTab {
  const tab = KNOWLEDGE_ADMIN_TABS.find((t) => t.id === id);
  if (!tab) throw new Error(`Unknown knowledge admin tab: ${id}`);
  return tab;
}

export type KnowledgeAdminFilterState = KnowledgeQueryFilter & { search?: string };