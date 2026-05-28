/**
 * APP-SHELL-REARCHITECTURE-2 — Smart entity switcher.
 *
 * Wraps `useActiveWorkspace` to render the current entity, expose a list of
 * accessible entities (permission-scoped via RLS by source), and remember
 * the user's last selection through the workspace-state store.
 *
 * - Compact mode for mobile (icon + abbreviated name).
 * - No backend fetches beyond useActiveWorkspace's RLS-scoped lists.
 * - Future-ready: when branch/location entities ship, they can be appended
 *   to the same dropdown without changing the public API.
 */
import React, { useMemo, useState } from 'react';
import { Check, ChevronDown, Building2 } from 'lucide-react';
import { useLanguage } from '@/i18n/LanguageContext';
import { useActiveWorkspace } from '@/hooks/useActiveWorkspace';
import { useWorkspaceState } from '@/hooks/useWorkspaceState';
import { useIsMobile } from '@/hooks/use-mobile';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

export interface SmartEntitySwitcherProps {
  className?: string;
  compact?: boolean;
}

export const SmartEntitySwitcher: React.FC<SmartEntitySwitcherProps> = ({ className, compact }) => {
  const { isRTL } = useLanguage();
  const ws = useActiveWorkspace();
  const state = useWorkspaceState();
  const isMobile = useIsMobile();
  const [open, setOpen] = useState(false);

  const isCompact = compact ?? isMobile;

  const active = useMemo(
    () => ws.entities.find((e) => e.entity_id === ws.active_entity_id) ?? null,
    [ws.entities, ws.active_entity_id],
  );

  // Recently used entities (other than active), derived from workspace state.
  const recents = useMemo(() => {
    // We treat the workspace-state's last_context entity ids as recency hints
    // (entity_id is the only one we persist today). For now, just surface
    // entities ordered by source then alphabetically — recency support
    // expands once we record per-entity-switch events.
    const others = ws.entities.filter((e) => e.entity_id !== ws.active_entity_id);
    return others;
  }, [ws.entities, ws.active_entity_id]);

  if (ws.entities.length === 0) return null;

  const labelFor = (e: typeof ws.entities[number] | null) =>
    !e ? (isRTL ? 'اختر منشأة' : 'Select entity')
      : (isRTL ? (e.name_ar || e.name_en || '') : (e.name_en || e.name_ar || ''));

  const handlePick = (id: string) => {
    ws.setActiveEntityId(id);
    state.setActiveEntity(id);
    setOpen(false);
  };

  return (
    <DropdownMenu open={open} onOpenChange={setOpen}>
      <DropdownMenuTrigger asChild>
        <button
          data-testid="smart-entity-switcher"
          className={`inline-flex items-center gap-1.5 rounded-lg border border-border/30 bg-card px-2 py-1.5 text-xs font-medium hover:bg-muted/40 transition-colors min-h-[36px] ${className ?? ''}`}
          aria-label={isRTL ? 'تبديل المنشأة' : 'Switch entity'}
        >
          <Building2 className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
          {!isCompact && (
            <span className="truncate max-w-[140px]">{labelFor(active)}</span>
          )}
          <ChevronDown className="w-3 h-3 text-muted-foreground shrink-0" />
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align={isRTL ? 'start' : 'end'} className="w-64">
        <DropdownMenuLabel className="text-[10px] text-muted-foreground uppercase tracking-wide">
          {isRTL ? 'المنشأة النشطة' : 'Active entity'}
        </DropdownMenuLabel>
        {active && (
          <DropdownMenuItem
            key={active.entity_id}
            onClick={() => handlePick(active.entity_id)}
            className="gap-2 py-2 cursor-pointer"
          >
            <Check className="w-3.5 h-3.5 text-accent shrink-0" />
            <span className="truncate flex-1">{labelFor(active)}</span>
            <span className="text-[10px] text-muted-foreground shrink-0">{active.source}</span>
          </DropdownMenuItem>
        )}
        {recents.length > 0 && (
          <>
            <DropdownMenuSeparator />
            <DropdownMenuLabel className="text-[10px] text-muted-foreground uppercase tracking-wide">
              {isRTL ? 'منشآت أخرى' : 'Other entities'}
            </DropdownMenuLabel>
            {recents.map((e) => (
              <DropdownMenuItem
                key={e.entity_id}
                onClick={() => handlePick(e.entity_id)}
                className="gap-2 py-2 cursor-pointer"
              >
                <Building2 className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
                <span className="truncate flex-1">{labelFor(e)}</span>
                <span className="text-[10px] text-muted-foreground shrink-0">{e.source}</span>
              </DropdownMenuItem>
            ))}
          </>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  );
};

export default SmartEntitySwitcher;