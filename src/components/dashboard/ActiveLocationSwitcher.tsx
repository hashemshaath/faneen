/**
 * WORKSPACE-CONTEXT-3 — Active Location Switcher.
 *
 * Compact secondary selector next to `ActiveBusinessSwitcher`. Reads
 * `useActiveWorkspace.locations` (RLS-scoped wrapper). Renders nothing for
 * entities with 0 locations, a read-only label for 1 location, and a
 * dropdown for 2+. "All locations" (null) is always selectable.
 *
 * Security:
 * - No direct `supabase.from` access; the only options shown are returned
 *   by the workspace hook, which is RLS-scoped.
 * - `setActiveLocationId` re-validates against the accessible list, so
 *   stale or spoofed ids cannot be applied via this UI.
 */
import React from 'react';
import { Check, ChevronDown, MapPin } from 'lucide-react';

import { useLanguage } from '@/i18n/LanguageContext';
import { useActiveWorkspace } from '@/hooks/useActiveWorkspace';
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem,
  DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Badge } from '@/components/ui/badge';

export const ActiveLocationSwitcher: React.FC = () => {
  const { isRTL } = useLanguage();
  const {
    active_entity_id,
    active_location_id,
    locations,
    setActiveLocationId,
    clearActiveLocationId,
  } = useActiveWorkspace();

  // No active entity → nothing to switch.
  if (!active_entity_id) return null;
  if (locations.length === 0) return null;

  const labelLocation = isRTL ? 'الموقع' : 'Location';
  const labelAll = isRTL ? 'كل المواقع' : 'All locations';
  const labelPick = isRTL ? 'اختر الموقع' : 'Select location';

  const nameOf = (l: { name_ar: string | null; name_en: string | null }): string =>
    isRTL ? (l.name_ar ?? l.name_en ?? '—') : (l.name_en ?? l.name_ar ?? '—');

  // Read-only label for single-location entities.
  if (locations.length === 1) {
    return (
      <div
        className="hidden md:inline-flex items-center gap-1.5 h-9 px-2.5 rounded-full border border-border/40 bg-muted/10 max-w-[200px]"
        title={labelLocation}
        data-testid="active-location-readonly"
      >
        <MapPin className="w-3.5 h-3.5 text-primary shrink-0" />
        <span className="text-xs font-semibold text-foreground truncate">
          {nameOf(locations[0])}
        </span>
      </div>
    );
  }

  const active = locations.find((l) => l.id === active_location_id) ?? null;
  const triggerLabel = active ? nameOf(active) : labelAll;

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button
          type="button"
          className="hidden md:inline-flex items-center gap-2 h-9 px-2.5 rounded-full border border-border/40 bg-muted/20 hover:bg-muted/40 transition-colors focus:outline-none focus:ring-2 focus:ring-accent/30 max-w-[220px]"
          title={labelPick}
          data-testid="active-location-trigger"
        >
          <MapPin className="w-3.5 h-3.5 text-primary shrink-0" />
          <span className="text-xs font-semibold text-foreground truncate">
            {triggerLabel}
          </span>
          {locations.length > 1 && (
            <Badge variant="outline" className="h-4 px-1 text-[10px] tech-content shrink-0">
              {locations.length}
            </Badge>
          )}
          <ChevronDown className="w-3 h-3 text-muted-foreground shrink-0" />
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align={isRTL ? 'start' : 'end'} sideOffset={8} className="w-64 p-1">
        <DropdownMenuLabel className="text-[11px] text-muted-foreground font-medium">
          {labelLocation}
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        <DropdownMenuItem
          onClick={() => clearActiveLocationId()}
          className="gap-2 py-2.5 rounded-md cursor-pointer"
          data-testid="active-location-option-all"
        >
          <div className="rounded-md bg-primary/10 p-1.5">
            <MapPin className="w-3.5 h-3.5 text-primary" />
          </div>
          <span className="flex-1 text-xs font-semibold text-foreground">{labelAll}</span>
          {active_location_id === null && (
            <Check className="w-4 h-4 text-emerald-600 shrink-0" />
          )}
        </DropdownMenuItem>
        {locations.map((l) => {
          const selected = l.id === active_location_id;
          return (
            <DropdownMenuItem
              key={l.id}
              onClick={() => setActiveLocationId(l.id)}
              className="gap-2 py-2.5 rounded-md cursor-pointer"
              data-testid={`active-location-option-${l.id}`}
            >
              <div className="rounded-md bg-primary/10 p-1.5">
                <MapPin className="w-3.5 h-3.5 text-primary" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-xs font-semibold text-foreground truncate">{nameOf(l)}</p>
                {l.is_main && (
                  <p className="text-[10px] text-muted-foreground">
                    {isRTL ? 'الفرع الرئيسي' : 'Main branch'}
                  </p>
                )}
              </div>
              {selected && <Check className="w-4 h-4 text-emerald-600 shrink-0" />}
            </DropdownMenuItem>
          );
        })}
      </DropdownMenuContent>
    </DropdownMenu>
  );
};