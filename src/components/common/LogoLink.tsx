import React from 'react';
import { Link, useLocation, type LinkProps } from 'react-router-dom';
import { cn } from '@/lib/utils';
import { trackEvent } from '@/lib/analytics';

export type LogoSurface = 'public' | 'dashboard' | 'admin';

const SURFACE_DESTINATION: Record<LogoSurface, string> = {
  public: '/',
  dashboard: '/dashboard',
  admin: '/admin',
};

function detectViewport(): 'mobile' | 'tablet' | 'desktop' {
  if (typeof window === 'undefined') return 'desktop';
  const w = window.innerWidth;
  if (w < 640) return 'mobile';
  if (w < 1024) return 'tablet';
  return 'desktop';
}

function detectDirection(): 'rtl' | 'ltr' {
  if (typeof document === 'undefined') return 'ltr';
  return document.documentElement.dir === 'rtl' ? 'rtl' : 'ltr';
}

export interface LogoLinkProps extends Omit<LinkProps, 'to'> {
  surface?: LogoSurface;
  to?: LinkProps['to'];
  children: React.ReactNode;
  className?: string;
  ariaLabel?: string;
}

/**
 * Central, analytics-aware wrapper around the brand logo link.
 * - Routes to the correct destination per surface (public/dashboard/admin).
 * - Emits a `logo_click` analytics event with source/destination/surface/viewport.
 * - Guarantees a real navigation target (never href="#") and a min 44px hit-area.
 */
export const LogoLink: React.FC<LogoLinkProps> = ({
  surface = 'public',
  to,
  children,
  className,
  ariaLabel,
  onClick,
  ...rest
}) => {
  const location = useLocation();
  const destination = (to as string | undefined) ?? SURFACE_DESTINATION[surface];

  const handleClick = (e: React.MouseEvent<HTMLAnchorElement>) => {
    try {
      trackEvent('logo_click', {
        source_page: typeof document !== 'undefined' ? document.title : undefined,
        source_path: location.pathname + location.search,
        destination_path: typeof destination === 'string' ? destination : '/',
        surface,
        viewport: detectViewport(),
        direction: detectDirection(),
      });
    } catch {
      /* never block navigation on analytics */
    }
    onClick?.(e);
  };

  return (
    <Link
      {...rest}
      to={destination}
      onClick={handleClick}
      aria-label={ariaLabel ?? rest['aria-label']}
      data-testid="logo-link"
      data-logo-surface={surface}
      className={cn(
        'inline-flex items-center min-h-11 min-w-11 hover:opacity-90 transition-opacity rounded-xl focus-visible:ring-2 focus-visible:ring-primary focus-visible:outline-none',
        className,
      )}
    >
      {children}
    </Link>
  );
};

export default LogoLink;