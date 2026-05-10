-- Phase 5.1: Storage server-side enforcement.
-- Tightens allowed_mime_types on image-bearing buckets so REST/API uploads
-- cannot bypass the client-side restrictions added in Phase 5.
-- Safe migration: no RLS changes, no bucket rename, no file deletion.

UPDATE storage.buckets
SET allowed_mime_types = ARRAY['image/jpeg','image/png','image/webp']
WHERE id = 'business-assets';

UPDATE storage.buckets
SET allowed_mime_types = ARRAY['image/jpeg','image/png','image/webp']
WHERE id = 'portfolio-images';

UPDATE storage.buckets
SET allowed_mime_types = ARRAY['image/jpeg','image/png','image/webp']
WHERE id = 'project-images';

UPDATE storage.buckets
SET allowed_mime_types = ARRAY['image/jpeg','image/png','image/webp']
WHERE id = 'blog-images';

-- chat-attachments: keep document support (PDF/Word/Excel/text), drop GIF and any
-- script/HTML risk. Only narrow image types to the same allow-list.
UPDATE storage.buckets
SET allowed_mime_types = ARRAY[
  'image/jpeg','image/png','image/webp',
  'application/pdf',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'application/vnd.ms-excel',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  'text/plain'
]
WHERE id = 'chat-attachments';

-- brand-assets: SAFE option chosen — block SVG until sanitization (DOMPurify)
-- ships in a future phase. Even though this bucket is admin-only, an
-- unsanitized SVG could enable XSS if a logo is rendered inline anywhere.
-- Also adds a 2MB size limit (was unlimited).
UPDATE storage.buckets
SET allowed_mime_types = ARRAY['image/jpeg','image/png','image/webp'],
    file_size_limit = 2097152
WHERE id = 'brand-assets';
