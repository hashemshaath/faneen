export interface ExtractPublicStoragePathParams {
  bucket: string;
  publicUrl: string;
}

/**
 * Canonical extractor for the storage-relative path of a public Supabase
 * storage URL. Migrated verbatim from the inline parsing previously in
 * `src/components/ui/image-upload.tsx`:
 *
 *   const url = new URL(value);
 *   const pathParts = url.pathname.split(`/storage/v1/object/public/${bucket}/`);
 *   if (pathParts[1]) -> decodeURIComponent(pathParts[1])
 *
 * Returns the decoded path, or `null` for any external/malformed URL
 * (matching the previous swallow-errors behavior).
 */
export function extractPublicStoragePath({
  bucket,
  publicUrl,
}: ExtractPublicStoragePathParams): string | null {
  try {
    const url = new URL(publicUrl);
    const pathParts = url.pathname.split(`/storage/v1/object/public/${bucket}/`);
    if (pathParts[1]) {
      return decodeURIComponent(pathParts[1]);
    }
    return null;
  } catch {
    return null;
  }
}