import {
  CONTRACT_ATTACHMENTS_BUCKET,
  createSignedContractAttachmentUrl,
  removeContractAttachmentFiles,
} from '@/modules/contracts/services/attachments';
import { deleteContractAttachmentById } from '@/modules/contracts/services/childTables';

/**
 * Re-exported for backward compatibility. Prefer
 * `CONTRACT_ATTACHMENTS_BUCKET` from `@/modules/contracts` going forward.
 */
export const ATTACHMENT_BUCKET = CONTRACT_ATTACHMENTS_BUCKET;
export const MAX_ATTACHMENT_BYTES = 10 * 1024 * 1024; // 10 MB

export const ALLOWED_ATTACHMENT_MIME = [
  'image/jpeg', 'image/png', 'image/webp', 'image/gif',
  'application/pdf',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'application/vnd.ms-excel',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
] as const;

export type AttachmentVisibility = 'parties' | 'provider_only' | 'client_only' | 'admin_only';

export type AttachmentRow = {
  id: string;
  file_name: string;
  file_type: string;
  file_url: string;
  storage_path?: string | null;
  file_size?: number | null;
  description?: string | null;
  visibility?: AttachmentVisibility | string | null;
  milestone_id?: string | null;
  measurement_id?: string | null;
  payment_id?: string | null;
  amendment_id?: string | null;
  created_at?: string | null;
};

/** Resolve the canonical storage path: prefer the stored column, fall back to URL parsing. */
export function resolveAttachmentPath(att: Pick<AttachmentRow, 'storage_path' | 'file_url'>): string | null {
  if (att.storage_path && att.storage_path.length > 0) return att.storage_path;
  return extractStoragePath(att.file_url || '');
}

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
  const path = resolveAttachmentPath(att);
  if (!path) return att.file_url || null;
  const { data, error } = await createSignedContractAttachmentUrl(path, expiresInSec);
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
  const path = resolveAttachmentPath(att);
  let storageRemoved = false;
  if (path) {
    const { error: storageErr } = await removeContractAttachmentFiles([path]);
    storageRemoved = !storageErr;
  }
  const { error } = await deleteContractAttachmentById(att.id);
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

/** Format byte size for display (Arabic/English compatible). */
export function formatFileSize(bytes: number | null | undefined): string {
  if (bytes == null || !Number.isFinite(bytes) || bytes <= 0) return '—';
  const units = ['B', 'KB', 'MB', 'GB'];
  let i = 0;
  let n = bytes;
  while (n >= 1024 && i < units.length - 1) { n /= 1024; i++; }
  return `${n.toFixed(n >= 10 || i === 0 ? 0 : 1)} ${units[i]}`;
}

export function visibilityLabel(v: string | null | undefined, isRTL: boolean): string {
  switch (v) {
    case 'provider_only': return isRTL ? 'مزوّد فقط' : 'Provider only';
    case 'client_only':   return isRTL ? 'عميل فقط'   : 'Client only';
    case 'admin_only':    return isRTL ? 'إدارة فقط'  : 'Admin only';
    case 'parties':
    default:              return isRTL ? 'الطرفان'    : 'Both parties';
  }
}