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

// Phase 4 — assistant guardrails + safe messaging snippets.
export * from './assistant/assistantKnowledgeSynonyms';
export * from './assistant/assistantKnowledgeGuardrails';
export * from './assistant/assistantKnowledgeRanking';
export * from './assistant/assistantKnowledgeContext';
export { getSafeMessageKnowledgeSnippets } from './messaging/messageKnowledgeSnippets';

// Phase 5 — knowledge-powered support replies.
export * from './support/supportReply.types';
export { classifySupportIntent, intentToSnippetTags } from './support/supportReplyIntents';
export {
  containsForbiddenInternalContent,
  detectMissingInformation,
  shouldEscalate,
  maxReplyLength,
} from './support/supportReplyGuardrails';
export { fallbackReply, renderReply } from './support/supportReplyTemplates';
export { buildSupportReplyDraft } from './support/supportReplyBuilder';