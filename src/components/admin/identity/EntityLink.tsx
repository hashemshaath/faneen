import React from 'react';
import { Link } from 'react-router-dom';
import { Building2, User, ExternalLink } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';

/**
 * Cross-link badge used inside the unified identity admin to jump between
 * a user and one of their businesses (and vice-versa) without leaving the page.
 *
 * Always renders the ref_id (USR-/BIZ-) as the source of truth. Never UUID.
 */
export interface EntityLinkProps {
  type: 'user' | 'business';
  refId: string;
  /** Internal id used to build the route. For user → user_id. For business → businesses.id. */
  targetId: string;
  /** Display name shown next to the ref chip. */
  name?: string | null;
  /** Optional secondary line (role / tier / status). */
  hint?: string | null;
  className?: string;
  size?: 'sm' | 'md';
}

export const EntityLink: React.FC<EntityLinkProps> = ({
  type, refId, targetId, name, hint, className, size = 'sm',
}) => {
  const Icon = type === 'user' ? User : Building2;
  const tone = type === 'user' ? 'text-info' : 'text-success';
  const ringTone = type === 'user' ? 'hover:border-info/50' : 'hover:border-success/50';
  const to = type === 'user'
    ? `/admin/identity/u/${targetId}`
    : `/admin/identity/b/${targetId}`;

  return (
    <Link
      to={to}
      className={cn(
        'group inline-flex items-center gap-1.5 rounded-lg border border-border/40 bg-card/60 px-2 py-1 transition-all hover-lift',
        ringTone,
        size === 'sm' ? 'text-[11px]' : 'text-xs',
        className,
      )}
      title={`${refId}${name ? ' • ' + name : ''}`}
    >
      <Icon className={cn('shrink-0', tone, size === 'sm' ? 'w-3 h-3' : 'w-3.5 h-3.5')} />
      {name && <span className="truncate max-w-[140px] font-medium">{name}</span>}
      <Badge variant="outline" className={cn('font-mono tech-content border-0 px-1 py-0', tone)}>
        {refId}
      </Badge>
      {hint && <span className="text-muted-foreground text-[10px]">• {hint}</span>}
      <ExternalLink className="w-2.5 h-2.5 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
    </Link>
  );
};

export default EntityLink;