import React from 'react';
import { cn } from '@/lib/utils';
import { useBranding, type BrandingConfig } from '@/hooks/useBranding';

type Variant = 'mark' | 'full';
type Tone = 'light' | 'dark' | 'auto';
type SizePreset = 'navbar' | 'footer' | 'auth' | 'loader' | 'mark';

interface BrandLogoProps {
  variant?: Variant;
  /** Background tone: 'light' = use color logo, 'dark' = use white logo,
   *  'auto' = render both and let CSS dark: utilities swap. Defaults to 'light'. */
  tone?: Tone;
  /** Size preset (uses configured admin sizes) OR explicit pixel height. */
  size?: SizePreset | number;
  className?: string;
  imgClassName?: string;
  alt?: string;
  priority?: boolean;
}

function resolveHeight(branding: BrandingConfig, size: BrandLogoProps['size'], variant: Variant): number {
  if (typeof size === 'number') return size;
  switch (size) {
    case 'navbar': return branding.sizeNavbar;
    case 'footer': return branding.sizeFooter;
    case 'auth':   return branding.sizeAuth;
    case 'loader': return branding.sizeLoader;
    case 'mark':   return branding.sizeMark;
    default:
      return variant === 'mark' ? branding.sizeMark : branding.sizeNavbar;
  }
}

export const BrandLogo: React.FC<BrandLogoProps> = ({
  variant = 'full',
  tone = 'light',
  size,
  className,
  imgClassName,
  alt = 'قِطاعات — Qitaat',
  priority = false,
}) => {
  const { branding } = useBranding();
  const height = resolveHeight(branding, size, variant);

  const lightSrc = variant === 'mark' ? branding.markUrl : branding.fullLightUrl;
  const darkSrc  = variant === 'mark' ? branding.markUrl : branding.fullDarkUrl;

  // Provide an explicit width to satisfy Lighthouse's "explicit width and
  // height" check and reserve layout space (prevents CLS). The logo aspect
  // ratios are stable: full ≈ 1.96:1 and mark ≈ 0.96:1 (~square). CSS still
  // overrides the rendered width via `width: auto` to keep proportions.
  const aspectRatio = variant === 'mark' ? 1 : 1.96;
  const width = Math.round(height * aspectRatio);

  const commonImgProps = {
    width,
    height,
    style: { height, width: 'auto' as const },
    loading: priority ? ('eager' as const) : ('lazy' as const),
    decoding: 'async' as const,
    draggable: false,
    className: cn('select-none object-contain', imgClassName),
  };

  // When showing the full wordmark, also render the brand mark beside it
  // so the lock-up (mark + wordmark) appears in every surface that uses
  // BrandLogo: public navbar, dashboard/admin topbars, auth, footer, etc.
  const showMarkAlongside = variant === 'full';
  const markHeight = Math.round(height * 0.95);
  const markWidth = markHeight; // mark aspect ratio ~ 1:1
  const markImgProps = {
    width: markWidth,
    height: markHeight,
    style: { height: markHeight, width: 'auto' as const },
    loading: commonImgProps.loading,
    decoding: commonImgProps.decoding,
    draggable: false,
    className: cn('select-none object-contain', imgClassName),
    src: branding.markUrl,
    alt: '',
    'aria-hidden': true as const,
  };
  const gapClass = 'gap-2';

  if (tone === 'auto') {
    return (
      <span className={cn('inline-flex items-center', gapClass, className)} aria-label={alt}>
        {showMarkAlongside && <img {...markImgProps} />}
        <img {...commonImgProps} src={lightSrc} alt={alt} aria-hidden="true" className={cn(commonImgProps.className, 'block dark:hidden')} />
        <img {...commonImgProps} src={darkSrc}  alt={alt} aria-hidden="true" className={cn(commonImgProps.className, 'hidden dark:block')} />
      </span>
    );
  }

  const src = tone === 'dark' ? darkSrc : lightSrc;
  return (
    <span className={cn('inline-flex items-center', gapClass, className)}>
      {showMarkAlongside && <img {...markImgProps} />}
      <img {...commonImgProps} alt={alt} src={src} />
    </span>
  );
};

export default BrandLogo;