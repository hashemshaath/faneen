import React from 'react';
import { AdminStatusBadge, type AdminStatusTone } from '@/components/admin/AdminStatusBadge';

/**
 * DirectoryStatusBadge — presentational chip for generic directory
 * entity states (brands, showcase, partner-showcase, private-sectors).
 * Does NOT decide visibility/publish/verification — caller maps the
 * domain status to a tone+label.
 */
export type DirectoryBadgeTone = AdminStatusTone;

export interface DirectoryStatusBadgeProps {
  label: string;
  tone?: DirectoryBadgeTone;
  dot?: boolean;
  size?: 'sm' | 'md';
  className?: string;
}

export const DirectoryStatusBadge: React.FC<DirectoryStatusBadgeProps> = ({
  label, tone = 'muted', dot, size, className,
}) => (
  <AdminStatusBadge
    label={label}
    tone={tone}
    dot={dot}
    size={size}
    className={className}
  />
);

export default DirectoryStatusBadge;