/**
 * KNOWLEDGE UNIFICATION — canonical types for the master knowledge service.
 *
 * Single source-of-truth shape for FAQ, Help articles, guides, policies,
 * message templates, and internal notes. Consumers (Help Center, FAQ,
 * AI assistant, message helpers) all read items matching this type.
 *
 * Strict types only — never `any`.
 */

export type KnowledgeType =
  | 'faq'
  | 'help_article'
  | 'guide'
  | 'policy'
  | 'message_template'
  | 'internal_note';

export type KnowledgeAudience =
  | 'visitor'
  | 'customer'
  | 'provider'
  | 'business_owner'
  | 'admin'
  | 'operations';

export type KnowledgeStatus = 'draft' | 'published' | 'internal';

export interface KnowledgeBilingual {
  ar: string;
  en?: string;
}

export interface KnowledgeItem {
  id: string;
  type: KnowledgeType;
  /** Canonical category slug. See `knowledgeCategories.ts`. */
  categoryId?: string;
  title: KnowledgeBilingual;
  summary?: KnowledgeBilingual;
  body: KnowledgeBilingual;
  audience: KnowledgeAudience[];
  tags: string[];
  source: string;
  status: KnowledgeStatus;
  priority?: number;
  updatedAt?: string;
  relatedRoutes?: string[];
  usableByAssistant: boolean;
  usableInMessages: boolean;
}

export type KnowledgeLocale = 'ar' | 'en';

export interface KnowledgeQueryFilter {
  audience?: KnowledgeAudience;
  type?: KnowledgeType | KnowledgeType[];
  categoryId?: string;
  tags?: string[];
  status?: KnowledgeStatus | KnowledgeStatus[];
  usableByAssistant?: boolean;
  usableInMessages?: boolean;
}

export interface KnowledgeContextResult {
  item: KnowledgeItem;
  score: number;
  title: string;
  summary: string;
  body: string;
  source: string;
  tags: string[];
  relatedRoutes: string[];
}