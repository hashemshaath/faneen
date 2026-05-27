import React, { useMemo } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Building2, Check, ChevronDown, Crown, Users } from 'lucide-react';

import { useAuth } from '@/contexts/AuthContext';
import { useLanguage } from '@/i18n/LanguageContext';
import { useActiveBusiness } from '@/hooks/useActiveBusiness';
import { listOwnerBusinesses, listActiveStaffBusinessesForUser } from '@/modules/businesses';
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem,
  DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Badge } from '@/components/ui/badge';

interface BusinessOption {
  id: string;
  name_ar: string | null;
  name_en: string | null;
  source: 'owner' | 'staff';
}

export const ActiveBusinessSwitcher: React.FC = () => {
  const { user } = useAuth();
  const { isRTL } = useLanguage();
  const qc = useQueryClient();

  const { data: businesses = [], isLoading } = useQuery({
    queryKey: ['my-businesses-switcher', user?.id],
    enabled: !!user,
    staleTime: 60_000,
    queryFn: async (): Promise<BusinessOption[]> => {
      const owned = await listOwnerBusinesses<{ id: string; name_ar: string | null; name_en: string | null }>({
        userId: user!.id,
        select: 'id, name_ar, name_en',
        orderBy: { column: 'created_at', ascending: true },
      });
      const staff = await listActiveStaffBusinessesForUser({
        userId: user!.id,
        select: 'business_id, businesses:business_id(id, name_ar, name_en)',
      });
      const out = new Map<string, BusinessOption>();
      (owned.data ?? []).forEach((b) => out.set(b.id, { ...b, source: 'owner' }));
      (staff.data ?? []).forEach((r: { businesses: { id: string; name_ar: string; name_en: string | null } | null }) => {
        const b = r.businesses;
        if (b && !out.has(b.id)) out.set(b.id, { ...b, source: 'staff' });
      });
      return Array.from(out.values());
    },
  });

  const ids = useMemo(() => businesses.map((b) => b.id), [businesses]);
  const { activeBusinessId, setActiveBusinessId } = useActiveBusiness(ids);
  const active = businesses.find((b) => b.id === activeBusinessId) ?? businesses[0] ?? null;

  if (isLoading || businesses.length === 0) return null;

  const displayName = (b: BusinessOption | null): string => {
    if (!b) return isRTL ? 'بدون منشأة' : 'No business';
    return isRTL ? (b.name_ar ?? b.name_en ?? '—') : (b.name_en ?? b.name_ar ?? '—');
  };

  const handlePick = (id: string) => {
    if (id === activeBusinessId) return;
    setActiveBusinessId(id);
    // Refresh business-scoped queries so all pages react without a reload
    qc.invalidateQueries({ predicate: (q) => {
      const k = q.queryKey;
      return Array.isArray(k) && typeof k[0] === 'string' &&
        (k[0].startsWith('my-') || k[0].includes('business'));
    }});
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button
          className="hidden md:inline-flex items-center gap-2 h-9 px-2.5 rounded-full border border-border/40 bg-muted/20 hover:bg-muted/40 transition-colors focus:outline-none focus:ring-2 focus:ring-accent/30 max-w-[220px]"
          title={isRTL ? 'تبديل المنشأة النشطة' : 'Switch active business'}
        >
          <Building2 className="w-3.5 h-3.5 text-primary shrink-0" />
          <span className="text-xs font-semibold text-foreground truncate">
            {displayName(active)}
          </span>
          {businesses.length > 1 && (
            <Badge variant="outline" className="h-4 px-1 text-[10px] tech-content shrink-0">
              {businesses.length}
            </Badge>
          )}
          <ChevronDown className="w-3 h-3 text-muted-foreground shrink-0" />
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align={isRTL ? 'start' : 'end'} sideOffset={8} className="w-72 p-1">
        <DropdownMenuLabel className="text-[11px] text-muted-foreground font-medium">
          {isRTL ? 'المنشأة النشطة' : 'Active business'}
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        {businesses.map((b) => {
          const selected = b.id === activeBusinessId;
          return (
            <DropdownMenuItem
              key={b.id}
              onClick={() => handlePick(b.id)}
              className="gap-2 py-2.5 rounded-md cursor-pointer"
            >
              <div className="rounded-md bg-primary/10 p-1.5">
                {b.source === 'owner'
                  ? <Crown className="w-3.5 h-3.5 text-primary" />
                  : <Users className="w-3.5 h-3.5 text-primary" />}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-xs font-semibold text-foreground truncate">{displayName(b)}</p>
                <p className="text-[10px] text-muted-foreground">
                  {b.source === 'owner'
                    ? (isRTL ? 'مالك' : 'Owner')
                    : (isRTL ? 'موظف/مفوّض' : 'Staff')}
                </p>
              </div>
              {selected && <Check className="w-4 h-4 text-emerald-600 shrink-0" />}
            </DropdownMenuItem>
          );
        })}
      </DropdownMenuContent>
    </DropdownMenu>
  );
};