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

  // Always render the canonical Qitaat brand lock-up (mark + wordmark) so the
  // sidebar matches the navbar/auth/footer surfaces across every dashboard
  // and every account type (admin, provider, client/user, staff). When the
  // active workspace has a business logo + name, surface them as a compact
  // secondary row underneath — never replacing the Qitaat brand.
  const hasBusiness = !!(businessLogoUrl || businessName?.trim());

  return (
    <div
      className="p-4 sm:p-5 flex flex-col gap-3 border-b border-sidebar-border"
      data-testid="sidebar-brand"
    >
      <div className="flex items-center gap-2">
        {collapsed ? (
          <BrandLogo variant="mark" tone="auto" size={36} />
        ) : (
          <BrandLogo variant="full" tone="auto" size={32} />
        )}
      </div>

      {hasBusiness && !collapsed && (
        <div className="flex items-center gap-2 pt-2 border-t border-sidebar-border/50 min-w-0">
          {businessLogoUrl ? (
            <div className="w-7 h-7 rounded-lg overflow-hidden bg-muted shrink-0 ring-1 ring-sidebar-border/60">
              <img
                src={businessLogoUrl}
                alt={isRTL ? titleAr : titleEn}
                className="w-full h-full object-cover"
                loading="lazy"
                decoding="async"
                onError={(e) => {
                  (e.currentTarget as HTMLImageElement).style.display = 'none';
                }}
              />
            </div>
          ) : (
            <div className="w-7 h-7 rounded-lg bg-primary/10 text-primary flex items-center justify-center font-bold text-xs shrink-0">
              {(isRTL ? titleAr : titleEn).charAt(0)}
            </div>
          )}
          <span className="text-xs font-medium text-sidebar-foreground/80 truncate min-w-0">
            {isRTL ? titleAr : titleEn}
          </span>
        </div>
      )}
    </div>
  );
};