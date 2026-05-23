/**
 * Canonical public image bucket identifiers.
 * Do not inline these string literals in app code.
 */
export const BUSINESS_ASSETS_BUCKET = 'business-assets' as const;
export const PORTFOLIO_IMAGES_BUCKET = 'portfolio-images' as const;
export const PROJECT_IMAGES_BUCKET = 'project-images' as const;
export const BLOG_IMAGES_BUCKET = 'blog-images' as const;
export const SHOWCASE_BUCKET = 'showcase' as const;

/** Private (signed-URL only) document bucket for CR uploads. */
export const BUSINESS_DOCUMENTS_BUCKET = 'business-documents' as const;

/** Admin-only public brand asset bucket. */
export const BRAND_ASSETS_BUCKET = 'brand-assets' as const;

export const PRIVATE_DOCUMENT_BUCKETS = [BUSINESS_DOCUMENTS_BUCKET] as const;
export type PrivateDocumentBucket = typeof PRIVATE_DOCUMENT_BUCKETS[number];

export const PUBLIC_IMAGE_BUCKETS = [
  BUSINESS_ASSETS_BUCKET,
  PORTFOLIO_IMAGES_BUCKET,
  PROJECT_IMAGES_BUCKET,
  BLOG_IMAGES_BUCKET,
  SHOWCASE_BUCKET,
] as const;

export type PublicImageBucket = typeof PUBLIC_IMAGE_BUCKETS[number];