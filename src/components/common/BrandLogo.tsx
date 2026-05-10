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

  const commonImgProps = {
    alt,
    height,
    style: { height, width: 'auto' as const },
    loading: priority ? ('eager' as const) : ('lazy' as const),
    decoding: 'async' as const,
    draggable: false,
    className: cn('select-none object-contain', imgClassName),
  };

  if (tone === 'auto') {
    return (
      <span className={cn('inline-flex items-center', className)} aria-label={alt}>
        <img {...commonImgProps} src={lightSrc} className={cn(commonImgProps.className, 'block dark:hidden')} />
        <img {...commonImgProps} src={darkSrc}  className={cn(commonImgProps.className, 'hidden dark:block')} />
      </span>
    );
  }

  const src = tone === 'dark' ? darkSrc : lightSrc;
  return (
    <span className={cn('inline-flex items-center', className)}>
      <img {...commonImgProps} src={src} />
    </span>
  );
};

export default BrandLogo;