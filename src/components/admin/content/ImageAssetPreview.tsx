import React from 'react';
import { ImageIcon } from 'lucide-react';
import { ResponsiveImage } from '@/modules/files/components/ResponsiveImage';
import type { VariantUrls } from '@/modules/files/services/image-pipeline';

/**
 * ImageAssetPreview — presentational image preview for content/directory
 * admin pages. Consumes pre-resolved URL/variants; never uploads,
 * never writes `image_assets`, never mutates the image pipeline.
 *
 * Falls back to a muted placeholder when nothing is available.
 */
export interface ImageAssetPreviewProps {
  url?: string | null;
  variants?: VariantUrls | unknown;
  alt: string;
  label?: string;
  width?: number;
  height?: number;
  rounded?: 'md' | 'lg' | 'xl' | '2xl';
  aspect?: 'square' | 'video' | 'auto';
  className?: string;
}

const ROUNDED: Record<NonNullable<ImageAssetPreviewProps['rounded']>, string> = {
  md: 'rounded-md',
  lg: 'rounded-lg',
  xl: 'rounded-xl',
  '2xl': 'rounded-2xl',
};

const ASPECT: Record<NonNullable<ImageAssetPreviewProps['aspect']>, string> = {
  square: 'aspect-square',
  video: 'aspect-video',
  auto: '',
};

export const ImageAssetPreview: React.FC<ImageAssetPreviewProps> = ({
  url,
  variants,
  alt,
  label,
  width,
  height,
  rounded = 'xl',
  aspect = 'square',
  className,
}) => {
  const hasImage = !!url || (variants && typeof variants === 'object');
  const dim = width && height ? `${width}×${height}` : null;
  return (
    <figure
      className={[
        'relative overflow-hidden border border-border/60 bg-muted/40',
        ROUNDED[rounded],
        ASPECT[aspect],
        className ?? '',
      ].join(' ')}
    >
      {hasImage ? (
        <ResponsiveImage
          originalUrl={url ?? undefined}
          variants={variants}
          alt={alt}
          className="h-full w-full object-cover"
        />
      ) : (
        <div className="flex h-full w-full items-center justify-center text-muted-foreground">
          <ImageIcon className="h-6 w-6" aria-hidden="true" />
        </div>
      )}
      {(label || dim) && (
        <figcaption
          className="absolute inset-x-0 bottom-0 flex items-center justify-between gap-2 bg-background/85 px-2 py-1 text-[10px] text-muted-foreground backdrop-blur-sm"
        >
          {label && <span className="truncate">{label}</span>}
          {dim && <span className="tabular-nums tech-content">{dim}</span>}
        </figcaption>
      )}
    </figure>
  );
};

export default ImageAssetPreview;