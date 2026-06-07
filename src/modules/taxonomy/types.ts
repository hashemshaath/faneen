/**
 * Taxonomy & Reference Data Center — shared types.
 * Phase 2 admin module. Reads from the generated Database types so
 * everything stays in sync with the four Phase-1 tables.
 */
import type { Database } from '@/integrations/supabase/types';

export type TaxonomyTypeRow = Database['public']['Tables']['taxonomy_types']['Row'];
export type TaxonomyCategoryRow = Database['public']['Tables']['taxonomy_categories']['Row'];
export type TaxonomyAliasRow = Database['public']['Tables']['taxonomy_aliases']['Row'];
export type TaxonomyRelationRow = Database['public']['Tables']['taxonomy_category_relations']['Row'];

export type TaxonomyType = TaxonomyTypeRow;
export type TaxonomyCategory = TaxonomyCategoryRow;
export type TaxonomyAlias = TaxonomyAliasRow;
export type TaxonomyRelation = TaxonomyRelationRow;

export interface TaxonomyCategoryWithChildren extends TaxonomyCategory {
  children: TaxonomyCategoryWithChildren[];
  depth: number;
}

export interface TaxonomyVisibilityFlags {
  show_in_registration: boolean;
  show_in_search: boolean;
  show_in_seo: boolean;
  show_in_showcase: boolean;
  show_in_products: boolean;
  show_in_contracts: boolean;
  show_in_quotes: boolean;
  show_in_admin_only: boolean;
}

export type TaxonomyRelationType =
  | 'related'
  | 'equivalent'
  | 'parent_alternative'
  | 'seo_related'
  | 'search_related'
  | 'product_service_link'
  | 'material_product_link'
  | 'service_activity_link';

export type TaxonomyQualityIssueCode =
  | 'missing_description'
  | 'missing_short_description'
  | 'missing_seo_title'
  | 'missing_seo_description'
  | 'duplicate_name'
  | 'duplicate_slug'
  | 'weak_slug'
  | 'orphan_category'
  | 'too_long_name'
  | 'hidden_but_used'
  | 'archived_but_visible'
  | 'outside_core_scope';

export interface TaxonomyQualityIssue {
  code: TaxonomyQualityIssueCode;
  category: TaxonomyCategory;
  message_ar: string;
  message_en: string;
}

export interface TaxonomyCategoryInput {
  taxonomy_type_id: string;
  parent_id: string | null;
  slug: string;
  name_ar: string;
  name_en: string | null;
  description_ar: string | null;
  description_en: string | null;
  short_description_ar: string | null;
  short_description_en: string | null;
  seo_title_ar: string | null;
  seo_title_en: string | null;
  seo_description_ar: string | null;
  seo_description_en: string | null;
  keywords_ar: string[];
  keywords_en: string[];
  icon: string | null;
  color: string | null;
  sort_order: number;
  is_active: boolean;
  is_public: boolean;
  is_searchable: boolean;
  is_featured: boolean;
  is_archived: boolean;
  show_in_registration: boolean;
  show_in_search: boolean;
  show_in_seo: boolean;
  show_in_showcase: boolean;
  show_in_products: boolean;
  show_in_contracts: boolean;
  show_in_quotes: boolean;
  show_in_admin_only: boolean;
  metadata: Record<string, unknown>;
}

export type TaxonomyViewMode = 'tree' | 'table' | 'cards';