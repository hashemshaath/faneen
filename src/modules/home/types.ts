/**
 * Home Management module — shared types.
 * Phase P1 scope: FAQ only.
 */
export type HomeFaqItem = {
  id: string;
  sort_order: number;
  question_ar: string;
  answer_ar: string;
  question_en: string | null;
  answer_en: string | null;
  is_enabled: boolean;
  created_at?: string;
  updated_at?: string;
};

export type HomeFaqInput = {
  sort_order?: number;
  question_ar: string;
  answer_ar: string;
  question_en?: string | null;
  answer_en?: string | null;
  is_enabled?: boolean;
};