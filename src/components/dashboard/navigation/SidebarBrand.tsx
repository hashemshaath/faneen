import React from 'react';
import { BrandLogo } from '@/components/common/BrandLogo';

/**
 * NAVIGATION-ARCHITECTURE-REBUILD-1 — Part F
 *
 * Sidebar brand mark with graceful fallbacks:
 *  1. If `businessLogoUrl` is supplied → render the business logo.
 *  2. Otherwise → render the canonical "ق" letter mark (project default).
 *
 * Supports dark mode automatically via Tailwind tokens and a compact
 * icon-only mode when the sidebar is collapsed.
 */
export interface SidebarBrandProps {
  collapsed: boolean;
  isRTL: boolean;
  businessName?: string | null;
  businessLogoUrl?: string | null;
}

export const SidebarBrand: React.FC<SidebarBrandProps> = ({
  collapsed,
  isRTL,
  businessName,
  businessLogoUrl,
}) => {
  const titleAr = businessName?.trim() || 'قِطاعات';
  const titleEn = businessName?.trim() || 'Qitaat';

  // When no custom business logo is supplied, render the canonical Qitaat
  // brand lock-up (mark + wordmark) so the sidebar matches the navbar/auth
  // surfaces. Falls back to the letter mark when collapsed.
  if (!businessLogoUrl) {
    return (
      <div
        className="p-4 sm:p-5 flex items-center gap-3 border-b border-sidebar-border"
        data-testid="sidebar-brand"
      >
        {collapsed ? (
          <BrandLogo variant="mark" tone="auto" size={36} />
        ) : (
          <BrandLogo variant="full" tone="auto" size={32} />
        )}
      </div>
    );
  }

  return (
    <div
      className="p-4 sm:p-5 flex items-center gap-3 border-b border-sidebar-border"
      data-testid="sidebar-brand"
    >
      <div className="w-10 h-10 rounded-xl bg-primary flex items-center justify-center text-primary-foreground font-bold text-lg shrink-0 shadow-md shadow-primary/20 overflow-hidden">
        <img
            src={businessLogoUrl}
            alt={isRTL ? titleAr : titleEn}
            className="w-full h-full object-cover"
            loading="lazy"
            decoding="async"
            onError={(e) => {
              // Fallback to the letter mark if the logo fails to load.
              (e.currentTarget as HTMLImageElement).style.display = 'none';
            }}
          />
      </div>
      {!collapsed && (
        <div className="min-w-0">
          <h1 className="font-heading font-bold text-lg leading-none text-sidebar-foreground truncate">
            {isRTL ? titleAr : titleEn}
          </h1>
          <span className="text-[10px] text-accent/80 font-medium tracking-wider">
            {isRTL ? 'Qitaat' : 'قِطاعات'}
          </span>
        </div>
      )}
    </div>
  );
};