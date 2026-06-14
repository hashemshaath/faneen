import React from 'react';

/**
 * ContentAdminPageShell — presentational layout shell for
 * Content/Directory admin pages. Stitches header + actions + stats +
 * filters + content. Owns NO data; every slot is provided by the page.
 */
export interface ContentAdminPageShellProps {
  header: React.ReactNode;
  description?: React.ReactNode;
  actionsSlot?: React.ReactNode;
  statsSlot?: React.ReactNode;
  filtersSlot?: React.ReactNode;
  contentSlot: React.ReactNode;
  className?: string;
}

export const ContentAdminPageShell: React.FC<ContentAdminPageShellProps> = ({
  header,
  description,
  actionsSlot,
  statsSlot,
  filtersSlot,
  contentSlot,
  className,
}) => (
  <div className={['space-y-5', className ?? ''].join(' ')}>
    <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
      <div className="min-w-0">
        {header}
        {description && (
          <div className="mt-1 text-sm text-muted-foreground">{description}</div>
        )}
      </div>
      {actionsSlot && <div className="flex items-center gap-2">{actionsSlot}</div>}
    </div>
    {statsSlot && <div>{statsSlot}</div>}
    {filtersSlot && <div>{filtersSlot}</div>}
    <div>{contentSlot}</div>
  </div>
);

export default ContentAdminPageShell;