/**
 * Presentational businesses-by-tier tab for AdminMemberships.
 * Pure UI — no Supabase, no queries, no mutations.
 */
import React from 'react';
import { pickBi } from '@/components/common/Bilingual';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Search, Building2, Loader2, Shield, Zap } from 'lucide-react';
import { TIERS, tierIcons, tierColors } from '@/lib/membership-tiers';
import { cn } from '@/lib/utils';

export interface MembershipBusinessLite {
  id: string;
  name_ar: string | null;
  name_en: string | null;
  membership_tier: string | null;
  logo_url: string | null;
  is_verified: boolean | null;
  is_active: boolean | null;
  username: string | null;
  rating_avg: number | null;
  rating_count: number | null;
}

export interface MembershipBusinessLinksSectionProps {
  allBusinesses: MembershipBusinessLite[];
  filteredBiz: MembershipBusinessLite[];
  loadingBiz: boolean;
  isRTL: boolean;
  searchQuery: string;
  onSearchChange: (value: string) => void;
}

export const MembershipBusinessLinksSection: React.FC<MembershipBusinessLinksSectionProps> = ({
  allBusinesses, filteredBiz, loadingBiz, isRTL, searchQuery, onSearchChange,
}) => {
  return (
    <div className="space-y-4">
      <div className="flex gap-2 flex-wrap">
        <div className="relative flex-1 min-w-[180px]">
          <Search className="absolute start-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
          <Input
            placeholder={pickBi(isRTL, 'بحث عن جهة...', 'Search businesses...')}
            value={searchQuery}
            onChange={(e) => onSearchChange(e.target.value)}
            className="h-9 text-xs ps-8"
          />
        </div>
        <Badge variant="outline" className="h-9 px-3 text-xs flex items-center gap-1.5 shrink-0">
          <Building2 className="w-3 h-3" />{filteredBiz.length}
        </Badge>
      </div>

      <div className="grid grid-cols-4 gap-2">
        {TIERS.map((tier) => {
          const Icon = tierIcons[tier];
          const colors = tierColors[tier];
          const count = allBusinesses.filter((b) => b.membership_tier === tier).length;
          return (
            <Card key={tier} className={cn('border', colors.border, colors.bg)}>
              <CardContent className="p-3 text-center">
                <div className={cn('w-8 h-8 rounded-lg mx-auto mb-1 flex items-center justify-center', colors.badge)}>
                  <Icon className="w-3.5 h-3.5" />
                </div>
                <p className={cn('text-lg font-bold', colors.text)}>{count}</p>
                <p className="text-[9px] text-muted-foreground capitalize">{tier}</p>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {loadingBiz ? (
        <div className="flex justify-center py-16"><Loader2 className="w-6 h-6 animate-spin text-muted-foreground" /></div>
      ) : (
        <div className="space-y-1.5">
          {filteredBiz.map((biz) => {
            const colors = tierColors[biz.membership_tier] || tierColors.free;
            const Icon = tierIcons[biz.membership_tier] || Zap;
            return (
              <Card key={biz.id} className={cn('border-border/30 transition-all hover:shadow-sm')}>
                <CardContent className="p-3 flex items-center gap-3">
                  <Avatar className="w-9 h-9 shrink-0 rounded-xl">
                    <AvatarImage src={biz.logo_url ?? undefined} />
                    <AvatarFallback className="bg-muted text-muted-foreground rounded-xl text-xs">{biz.name_ar?.charAt(0)}</AvatarFallback>
                  </Avatar>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-1.5">
                      <span className="text-xs font-bold truncate">{isRTL ? biz.name_ar : (biz.name_en || biz.name_ar)}</span>
                      {biz.is_verified && <Shield className="w-3 h-3 text-success shrink-0" />}
                      {!biz.is_active && <Badge variant="outline" className="text-[7px] h-3 px-1 text-destructive">{pickBi(isRTL, 'معطل', 'Inactive')}</Badge>}
                    </div>
                    <div className="flex items-center gap-2 text-[9px] text-muted-foreground mt-0.5">
                      <span className="tech-content">@{biz.username}</span>
                      <span>⭐ {biz.rating_avg?.toFixed(1)} ({biz.rating_count})</span>
                    </div>
                  </div>
                  <Badge className={cn('text-[8px] px-2 py-0.5 h-auto uppercase font-bold gap-1', colors.badge)}>
                    <Icon className="w-2.5 h-2.5" />
                    {biz.membership_tier}
                  </Badge>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default MembershipBusinessLinksSection;