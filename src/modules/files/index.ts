export * from './constants/buckets';
export { IMAGE_BUCKET_CONSTRAINTS } from './constants/constraints';
export * from './services/public';
export { uploadAvatar } from './domain/avatar';
export type { UploadAvatarParams, UploadAvatarResult } from './domain/avatar';
export { uploadShowcaseImage } from './domain/showcase';
export type { UploadShowcaseImageParams, UploadShowcaseImageResult } from './domain/showcase';
export { uploadProjectImage } from './domain/projects';
export type {
  UploadProjectImageParams,
  UploadProjectImageResult,
  ProjectImageKind,
} from './domain/projects';
export { uploadBusinessImage } from './domain/businesses';
export type {
  UploadBusinessImageParams,
  UploadBusinessImageResult,
  BusinessImageKind,
} from './domain/businesses';
export { uploadServiceImage, uploadProductImage } from './domain/catalog';
export type {
  UploadCatalogImageParams,
  UploadCatalogImageResult,
  CatalogImageKind,
} from './domain/catalog';
export { uploadBlogContentImage, getBlogContentImageUrl, listBlogImages } from './domain/blogMedia';
export type { UploadBlogContentImageParams } from './domain/blogMedia';
export * from './services/private';
export {
  uploadCrDocument,
  createCrDocumentSignedUrl,
  CR_DOCUMENT_SIGNED_URL_TTL_SECONDS,
} from './domain/crDocuments';
export type { UploadCrDocumentParams, UploadCrDocumentResult } from './domain/crDocuments';
export { uploadBrandAsset } from './domain/branding';
export type { UploadBrandAssetParams, UploadBrandAssetResult } from './domain/branding';

// Phase 2 image pipeline — currently used by Showcase only.
// TODO: generalize to projects, business logos, services, products, articles
// + backfill existing rows into `image_assets`.
export {
  processImage,
  isVariantUrls,
} from './services/image-pipeline';
export type {
  PipelineResult,
  PipelineFailure,
  VariantFile,
  VariantKey,
  VariantUrls,
} from './services/image-pipeline';
export { ResponsiveImage } from './components/ResponsiveImage';
export type { ResponsiveImageProps } from './components/ResponsiveImage';