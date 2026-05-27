export type BusinessInternalNoteVisibility = "internal" | "admin";

export interface BusinessInternalNote {
  id: string;
  ref_id: string | null;
  business_id: string;
  author_user_id: string;
  body: string;
  visibility: BusinessInternalNoteVisibility;
  pinned: boolean;
  created_at: string;
  updated_at: string;
  deleted_at: string | null;
}

export interface BusinessInternalNoteInsert {
  business_id: string;
  author_user_id: string;
  body: string;
  visibility?: BusinessInternalNoteVisibility;
  pinned?: boolean;
}

export interface BusinessInternalNoteUpdate {
  body?: string;
  pinned?: boolean;
  deleted_at?: string | null;
}