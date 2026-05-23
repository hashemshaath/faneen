# Module: files

**Status:** F-2..F-6 complete. CI-guarded via
`scripts/storage-isolation-audit.mjs` (workflow step _Storage Isolation
Audit_) and `src/__tests__/storageIsolationAudit.test.ts`.

## Purpose
Canonical wrappers around Supabase Storage for app-level file/media
access. App code MUST route every storage operation through this module
(or one of the explicitly allowed domain owners below).

## What lives here
- `constants/buckets.ts` — `BUSINESS_ASSETS_BUCKET`,
  `PORTFOLIO_IMAGES_BUCKET`, `PROJECT_IMAGES_BUCKET`,
  `BLOG_IMAGES_BUCKET`, `SHOWCASE_BUCKET`,
  `BUSINESS_DOCUMENTS_BUCKET`, `BRAND_ASSETS_BUCKET`.
- `constants/constraints.ts` — `IMAGE_BUCKET_CONSTRAINTS` (per-bucket
  MIME + size limits).
- `services/public/` — `uploadPublicImage`, `getPublicImageUrl`,
  `removePublicImage`, `extractPublicStoragePath`, `listPublicImages`.
- `services/private/` — `uploadPrivateDocument`,
  `createPrivateSignedUrl`, `removePrivateDocument`.
- `domain/` — `avatar.ts`, `showcase.ts`, `blogMedia.ts`,
  `crDocuments.ts`, `branding.ts` (one helper per real-world flow,
  preserving exact bucket / path / options / TTL behavior).

## Storage boundary rules (enforced by CI)
1. **No direct `supabase.storage.from(...)` or `storage.from(...)`** in
   app code. Only the paths listed below may call into the storage SDK.
2. **No direct storage ops** (`upload`, `download`, `remove`,
   `getPublicUrl`, `createSignedUrl`, `createSignedUrls`, `list`) in
   files that import the Supabase client outside allowed paths.
3. **No `/storage/v1/object/public/` URL parsing** outside
   `services/public/extractPublicStoragePath.ts`.

### Allowed boundary owners
- `src/modules/files/**` — this module.
- `src/modules/messaging/services/storage/**` — `chat-attachments`.
- `src/modules/contracts/services/attachments/**` — `contract-attachments`.
- `src/lib/quoteRequests.ts` — canonical `quote-request-files` signed URL.
- `src/lib/contract-attachments.ts` — compatibility shim (no direct
  `storage.from`, delegates to the contracts attachments service).
- `src/integrations/supabase/**` — generated client.

## Allowed buckets
| Bucket | Visibility | Wrapper |
|---|---|---|
| `business-assets` | public | `uploadAvatar`, `ImageUpload` |
| `portfolio-images` | public | `ImageUpload` |
| `project-images` | public | `ImageUpload` / `MultiImageUpload` |
| `blog-images` | public | `uploadBlogContentImage`, `listBlogImages` |
| `showcase` | public | `uploadShowcaseImage` |
| `brand-assets` | public (admin) | `uploadBrandAsset` |
| `business-documents` | private (signed URLs) | `uploadCrDocument`, `createCrDocumentSignedUrl` |
| `chat-attachments` | private | `modules/messaging/services/storage` |
| `contract-attachments` | private | `modules/contracts/services/attachments` |
| `quote-request-files` | private | `lib/quoteRequests.ts` |

## Adding a new bucket safely
1. Add the bucket id to `constants/buckets.ts` as a typed `const`.
2. Add MIME + size limits to `constants/constraints.ts` if it is an
   image bucket.
3. For public images: reuse `uploadPublicImage` / `getPublicImageUrl` /
   `removePublicImage` / `listPublicImages`.
4. For private docs: reuse `uploadPrivateDocument` /
   `createPrivateSignedUrl` / `removePrivateDocument`.
5. Wrap real-world flows in a `domain/<thing>.ts` helper that pins the
   path format, TTL, MIME allowlist, and options. Never inline these in
   components.
6. Export from `src/modules/files/index.ts`.
7. Never parse public URLs in app code — extend
   `extractPublicStoragePath` instead.
8. Run `npm run storage-isolation-audit` locally; it must exit 0.

## Public API
Import from `@/modules/files`. Do not deep-import internal files.