import { supabase } from '@/integrations/supabase/client';

export const ATTACHMENT_BUCKET = 'contract-attachments';
export const MAX_ATTACHMENT_BYTES = 10 * 1024 * 1024; // 10 MB

export const ALLOWED_ATTACHMENT_MIME = [
  'image/jpeg', 'image/png', 'image/webp', 'image/gif',
  'application/pdf',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'application/vnd.ms-excel',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
] as const;

export type AttachmentRow = {
  id: string;
  file_name: string;
  file_type: string;
  file_url: string;
};

/**
 * Try to derive the storage object path from a previously stored URL.
 * Supports both public-style and signed-style URLs that the Supabase
 * storage SDK produces. Returns null when the path cannot be resolved
 * unambiguously (we never delete in that case).
 */
export function extractStoragePath(url: string, bucket = ATTACHMENT_BUCKET): string | null {
  if (!url) return null;
  try {
    const u = new URL(url);
    const marker = `/${bucket}/`;
    const idx = u.pathname.indexOf(marker);
    if (idx === -1) return null;
    const raw = u.pathname.slice(idx + marker.length);
    return decodeURIComponent(raw.split('?')[0]);
  } catch {
    return null;
  }
}

/**
 * Get a short-lived signed URL for a private bucket attachment.
 * Falls back to the stored URL only if path cannot be derived.
 */
export async function getAttachmentSignedUrl(att: AttachmentRow, expiresInSec = 3600): Promise<string | null> {
  const path = extractStoragePath(att.file_url);
  if (!path) return att.file_url || null;
  const { data, error } = await supabase.storage.from(ATTACHMENT_BUCKET).createSignedUrl(path, expiresInSec);
  if (error || !data?.signedUrl) return null;
  return data.signedUrl;
}

export async function openAttachment(att: AttachmentRow): Promise<boolean> {
  const url = await getAttachmentSignedUrl(att);
  if (!url) return false;
  window.open(url, '_blank', 'noopener,noreferrer');
  return true;
}

export async function downloadAttachment(att: AttachmentRow): Promise<boolean> {
  const url = await getAttachmentSignedUrl(att);
  if (!url) return false;
  const a = document.createElement('a');
  a.href = url;
  a.download = att.file_name || 'attachment';
  a.rel = 'noopener noreferrer';
  document.body.appendChild(a);
  a.click();
  a.remove();
  return true;
}

/**
 * Delete an attachment row and its storage object when the path is resolvable.
 * Storage failures are non-fatal; the DB row is always removed.
 */
export async function deleteAttachmentWithStorage(att: AttachmentRow): Promise<{ ok: boolean; storageRemoved: boolean; error?: string }> {
  const path = extractStoragePath(att.file_url);
  let storageRemoved = false;
  if (path) {
    const { error: storageErr } = await supabase.storage.from(ATTACHMENT_BUCKET).remove([path]);
    storageRemoved = !storageErr;
  }
  const { error } = await supabase.from('contract_attachments').delete().eq('id', att.id);
  if (error) return { ok: false, storageRemoved, error: error.message };
  return { ok: true, storageRemoved };
}

export type AttachmentValidationError = 'too_large' | 'bad_type' | 'empty';

export function validateAttachmentFile(file: File): AttachmentValidationError | null {
  if (!file || file.size === 0) return 'empty';
  if (file.size > MAX_ATTACHMENT_BYTES) return 'too_large';
  if (!ALLOWED_ATTACHMENT_MIME.includes(file.type as typeof ALLOWED_ATTACHMENT_MIME[number])) return 'bad_type';
  return null;
}

export function attachmentErrorMessage(err: AttachmentValidationError, isRTL: boolean): string {
  if (isRTL) {
    switch (err) {
      case 'too_large': return 'حجم الملف يتجاوز 10 ميغابايت';
      case 'bad_type': return 'نوع الملف غير مدعوم. الأنواع المسموحة: صور، PDF، Word، Excel';
      case 'empty': return 'الملف فارغ أو غير صالح';
    }
  } else {
    switch (err) {
      case 'too_large': return 'File exceeds the 10 MB limit';
      case 'bad_type': return 'Unsupported file type. Allowed: images, PDF, Word, Excel';
      case 'empty': return 'File is empty or invalid';
    }
  }
}