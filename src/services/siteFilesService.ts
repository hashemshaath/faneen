/**
 * SITE FILES SERVICE — single entry point for the `client_site_files`
 * table and the private `site-files` storage bucket.
 *
 * Hard rules (mirrored in tests):
 *   - All Supabase / Storage calls live here. UI components never call
 *     `supabase.storage` or the table directly.
 *   - Bucket is private. Downloads always go through short-lived signed
 *     URLs (never a permanent public URL).
 *   - Storage path is `users/{ownerUserId}/sites/{siteId}/{fileId}/{safeName}`
 *     so storage RLS can match it to `auth.uid()`.
 *   - No elevated/admin keys on the frontend.
 *   - Files are archived (`is_archived = true`), never hard-deleted.
 */
import { supabase } from '@/integrations/supabase/client';

export const SITE_FILES_BUCKET = 'site-files';
export const SITE_FILES_MAX_BYTES = 10 * 1024 * 1024; // 10MB
export const SITE_FILES_SIGNED_URL_TTL = 60 * 5; // 5 minutes

export type SiteFileCategory =
  | 'general'
  | 'license'
  | 'permit'
  | 'contract'
  | 'invoice'
  | 'photo'
  | 'other';

export const SITE_FILE_CATEGORIES: ReadonlyArray<SiteFileCategory> = [
  'general',
  'license',
  'permit',
  'contract',
  'invoice',
  'photo',
  'other',
];

export const SITE_FILES_ALLOWED_EXTENSIONS: ReadonlyArray<string> = [
  'pdf',
  'jpg',
  'jpeg',
  'png',
  'webp',
  'doc',
  'docx',
  'xls',
  'xlsx',
];

const FORBIDDEN_EXTENSIONS = new Set([
  'exe', 'bat', 'cmd', 'com', 'scr', 'msi', 'sh', 'ps1', 'vbs', 'js',
  'jar', 'app', 'dll', 'apk',
]);

export interface SiteFileRow {
  id: string;
  site_id: string;
  owner_user_id: string;
  business_id: string | null;
  file_name: string;
  file_type: string | null;
  file_size_bytes: number | null;
  storage_bucket: string;
  storage_path: string;
  file_category: SiteFileCategory;
  description: string | null;
  is_archived: boolean;
  created_at: string;
  updated_at: string;
}

export interface UploadSiteFileInput {
  siteId: string;
  file: File;
  category: SiteFileCategory;
  description?: string | null;
  businessId?: string | null;
}

export interface UpdateSiteFileMetadataInput {
  description?: string | null;
  file_category?: SiteFileCategory;
  is_archived?: boolean;
}

const safeName = (raw: string): string => {
  const trimmed = raw.trim().replace(/\s+/g, '_');
  // strip path separators + characters that confuse storage paths
  return trimmed.replace(/[\\/:*?"<>|#%]+/g, '_').slice(0, 200) || 'file';
};

const getExtension = (name: string): string =>
  (name.split('.').pop() || '').toLowerCase();

export const isAllowedSiteFile = (file: { name: string; size: number }): {
  ok: boolean;
  reason?: 'size' | 'extension';
} => {
  if (file.size > SITE_FILES_MAX_BYTES) return { ok: false, reason: 'size' };
  const ext = getExtension(file.name);
  if (FORBIDDEN_EXTENSIONS.has(ext)) return { ok: false, reason: 'extension' };
  if (!SITE_FILES_ALLOWED_EXTENSIONS.includes(ext)) return { ok: false, reason: 'extension' };
  return { ok: true };
};

/** Build the canonical storage path for a site file. */
export const buildSiteFileStoragePath = (params: {
  ownerUserId: string;
  siteId: string;
  fileId: string;
  fileName: string;
}): string =>
  `users/${params.ownerUserId}/sites/${params.siteId}/${params.fileId}/${safeName(params.fileName)}`;

export async function listSiteFiles(siteId: string, includeArchived = false): Promise<SiteFileRow[]> {
  let q = supabase
    .from('client_site_files')
    .select('*')
    .eq('site_id', siteId)
    .order('created_at', { ascending: false });
  if (!includeArchived) q = q.eq('is_archived', false);
  const { data, error } = await q;
  if (error) throw error;
  return (data ?? []) as SiteFileRow[];
}

export async function uploadSiteFile(input: UploadSiteFileInput): Promise<SiteFileRow> {
  const guard = isAllowedSiteFile(input.file);
  if (!guard.ok) {
    throw new Error(guard.reason === 'size' ? 'FILE_TOO_LARGE' : 'FILE_TYPE_FORBIDDEN');
  }
  const { data: auth, error: authErr } = await supabase.auth.getUser();
  if (authErr) throw authErr;
  const userId = auth.user?.id;
  if (!userId) throw new Error('AUTH_REQUIRED');

  // Generate id client-side so the storage path encodes it.
  const fileId = crypto.randomUUID();
  const storagePath = buildSiteFileStoragePath({
    ownerUserId: userId,
    siteId: input.siteId,
    fileId,
    fileName: input.file.name,
  });

  const { error: upErr } = await supabase.storage
    .from(SITE_FILES_BUCKET)
    .upload(storagePath, input.file, {
      cacheControl: '3600',
      upsert: false,
      contentType: input.file.type || 'application/octet-stream',
    });
  if (upErr) throw upErr;

  const { data, error: insErr } = await supabase
    .from('client_site_files')
    .insert({
      id: fileId,
      site_id: input.siteId,
      owner_user_id: userId,
      business_id: input.businessId ?? null,
      file_name: input.file.name.slice(0, 255),
      file_type: input.file.type || null,
      file_size_bytes: input.file.size,
      storage_bucket: SITE_FILES_BUCKET,
      storage_path: storagePath,
      file_category: input.category,
      description: input.description ?? null,
    })
    .select('*')
    .single();
  if (insErr) {
    // best-effort rollback: remove the orphan object
    await supabase.storage.from(SITE_FILES_BUCKET).remove([storagePath]).catch(() => undefined);
    throw insErr;
  }
  return data as SiteFileRow;
}

export async function getSiteFileSignedUrl(file: Pick<SiteFileRow, 'storage_bucket' | 'storage_path'>): Promise<string> {
  const { data, error } = await supabase.storage
    .from(file.storage_bucket)
    .createSignedUrl(file.storage_path, SITE_FILES_SIGNED_URL_TTL);
  if (error) throw error;
  if (!data?.signedUrl) throw new Error('SIGNED_URL_FAILED');
  return data.signedUrl;
}

export async function updateSiteFileMetadata(
  fileId: string,
  payload: UpdateSiteFileMetadataInput,
): Promise<void> {
  const { error } = await supabase
    .from('client_site_files')
    .update(payload)
    .eq('id', fileId);
  if (error) throw error;
}

export async function archiveSiteFile(fileId: string): Promise<void> {
  await updateSiteFileMetadata(fileId, { is_archived: true });
}
