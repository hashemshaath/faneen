export * from './knowledge.types';
export * from './knowledge.schema';
export * from './knowledgeAudience';
export * from './knowledgeTags';
export {
  knowledgeRegistry,
  listKnowledgeItems,
  getKnowledgeItem,
  listByCategory,
} from './knowledgeRegistry';
export {
  KNOWLEDGE_CATEGORIES,
  getCategory,
  publicCategories,
  isInternalCategory,
  type KnowledgeCategory,
} from './knowledgeCategories';
export {
  filterKnowledge,
  scoreKnowledge,
  searchKnowledge,
} from './knowledgeSearch';
export {
  getAssistantKnowledgeContext,
  getMessageKnowledgeSnippets,
} from './knowledgeHelpers';

// Admin-only helpers (Phase 3 — read-only management surface).
export * from './admin/knowledgeAdminMetrics';
export * from './admin/knowledgeAdminFilters';
export * from './admin/knowledgeAdminTabs';
export * from './admin/knowledgeAdminViewModels';