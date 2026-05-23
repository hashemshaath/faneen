# Module: files

**Status:** F-2 in place (public image upload primitives + avatar helper).

## Purpose
Canonical wrappers around Supabase Storage for app-level file/media
access. Public-image primitives live here; private-document, blog,
showcase, branding, and `business-documents` flows will follow in
F-3..F-5. A CI guardrail (`storage-isolation-audit`) is staged for F-6.

## What lives here
- `constants/buckets.ts` — `BUSINESS_ASSETS_BUCKET`,
  `PORTFOLIO_IMAGES_BUCKET`, `PROJECT_IMAGES_BUCKET`,
  `BLOG_IMAGES_BUCKET`, `PUBLIC_IMAGE_BUCKETS`.
- `constants/constraints.ts` — `IMAGE_BUCKET_CONSTRAINTS` (per-bucket
  MIME + size limits, migrated verbatim from `ImageUpload`).
- `services/public/` — `uploadPublicImage`, `getPublicImageUrl`,
  `removePublicImage`, `extractPublicStoragePath`.
- `domain/avatar.ts` — `uploadAvatar({ userId, file })` helper.

## What does not live here yet
- `showcase`, `brand-assets`, `blog-images` uploads,
  `business-documents` (private + signed URLs) — F-3..F-5.
- Already-isolated domains stay where they are:
  `chat-attachments` (messaging), `contract-attachments` (contracts),
  `quote-request-files` (leads).

## Public API
Import from `@/modules/files`. Do not deep-import internal files.