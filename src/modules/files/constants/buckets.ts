/**
 * Canonical public image bucket identifiers.
 * Do not inline these string literals in app code.
 */
export const BUSINESS_ASSETS_BUCKET = 'business-assets' as const;
export const PORTFOLIO_IMAGES_BUCKET = 'portfolio-images' as const;
export const PROJECT_IMAGES_BUCKET = 'project-images' as const;
export const BLOG_IMAGES_BUCKET = 'blog-images' as const;

export const PUBLIC_IMAGE_BUCKETS = [
  BUSINESS_ASSETS_BUCKET,
  PORTFOLIO_IMAGES_BUCKET,
  PROJECT_IMAGES_BUCKET,
  BLOG_IMAGES_BUCKET,
] as const;

export type PublicImageBucket = typeof PUBLIC_IMAGE_BUCKETS[number];