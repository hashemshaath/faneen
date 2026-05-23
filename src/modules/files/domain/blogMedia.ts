import { uploadPublicImage } from '../services/public/uploadPublicImage';
import { getPublicImageUrl } from '../services/public/getPublicImageUrl';
import { listPublicImages } from '../services/public/listPublicImages';
import { BLOG_IMAGES_BUCKET } from '../constants/buckets';

export interface UploadBlogContentImageParams {
  path: string;
  file: File;
  contentType?: string;
}

/**
 * Blog content image upload helper. Preserves the path + options used
 * previously in `RichMarkdownEditor.tsx`:
 *
 *   path:    `content/${Date.now()}-${Math.random()...}.${ext}` (caller-built)
 *   bucket:  blog-images
 *   options: { contentType: processed.type }
 */
export async function uploadBlogContentImage({ path, file, contentType }: UploadBlogContentImageParams) {
  return uploadPublicImage({
    bucket: BLOG_IMAGES_BUCKET,
    path,
    file,
    options: { contentType },
  });
}

/**
 * Public URL for a blog content image (raw Supabase result).
 */
export function getBlogContentImageUrl(path: string) {
  return getPublicImageUrl({ bucket: BLOG_IMAGES_BUCKET, path });
}

/**
 * User-scoped media library listing. Preserves the path + options used
 * previously in `RichMarkdownEditor.tsx`:
 *
 *   list(uid, { limit: 100, sortBy: { column: 'created_at', order: 'desc' } })
 */
export function listBlogImages(uid: string) {
  return listPublicImages({
    bucket: BLOG_IMAGES_BUCKET,
    path: uid,
    options: { limit: 100, sortBy: { column: 'created_at', order: 'desc' } },
  });
}