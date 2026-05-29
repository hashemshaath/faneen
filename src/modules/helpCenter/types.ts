export type HelpAudience = 'general' | 'provider' | 'customer' | 'admin';
export type HelpArticleStatus = 'draft' | 'published';
export type HelpIssueType = 'bug' | 'ui' | 'performance' | 'data' | 'security' | 'content' | 'other';
export type HelpIssuePriority = 'low' | 'medium' | 'high' | 'critical';
export type HelpIssueStatus = 'open' | 'reviewing' | 'planned' | 'resolved' | 'closed';
export type HelpFeatureStatus = 'new' | 'reviewing' | 'planned' | 'in_progress' | 'completed' | 'rejected';

export interface HelpCategory {
  id: string;
  ref_id: string | null;
  slug: string;
  audience: HelpAudience;
  title_ar: string;
  title_en: string;
  description_ar: string | null;
  description_en: string | null;
  sort_order: number;
  is_active: boolean;
}

export interface HelpArticle {
  id: string;
  ref_id: string | null;
  category_id: string | null;
  slug: string;
  audience: HelpAudience;
  status: HelpArticleStatus;
  title_ar: string;
  title_en: string;
  summary_ar: string | null;
  summary_en: string | null;
  content_ar: string | null;
  content_en: string | null;
  keywords: string[];
  views_count: number;
  helpful_count: number;
  not_helpful_count: number;
  updated_at: string;
}

export interface HelpIssueReport {
  id: string;
  ref_id: string | null;
  page_key: string | null;
  issue_type: HelpIssueType;
  priority: HelpIssuePriority;
  title: string;
  description: string | null;
  screenshot_url: string | null;
  status: HelpIssueStatus;
  created_at: string;
}

export interface HelpFeatureRequest {
  id: string;
  ref_id: string | null;
  category: string | null;
  title: string;
  description: string | null;
  votes_count: number;
  status: HelpFeatureStatus;
  created_at: string;
}