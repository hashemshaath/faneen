import React from 'react';

/**
 * SeoHubPageShell — presentational shell for admin SEO pages. Owns no
 * data, performs no DB I/O. Composes slots in a stable order so each
 * SEO surface (sitemap, audit, sector SEO) has a consistent layout
 * without altering routes or Helmet behavior.
 */
export interface SeoHubPageShellProps {
  header: React.ReactNode;
  tabsSlot?: React.ReactNode;
  statsSlot?: React.ReactNode;
  filtersSlot?: React.ReactNode;
  contentSlot: React.ReactNode;
  className?: string;
}

export const SeoHubPageShell: React.FC<SeoHubPageShellProps> = ({
  header, tabsSlot, statsSlot, filtersSlot, contentSlot, className,
}) => (
  <div className={['space-y-6', className ?? ''].join(' ')}>
    {header}
    {tabsSlot}
    {statsSlot}
    {filtersSlot}
    {contentSlot}
  </div>
);

export default SeoHubPageShell;