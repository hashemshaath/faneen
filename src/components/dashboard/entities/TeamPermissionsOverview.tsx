/**
 * Compact members × domains heatmap for an entity.
 *
 * Renders one row per active team member and one column per permission
 * domain (entity, staff, leads, …). Each cell shows how many of that
 * domain's permissions the member effectively holds (override OR role
 * default) versus the domain's total — color-coded full/partial/none.
 *
 * Read-only governance view. RLS + has_permission remain authoritative.
 */
import React, { useMemo } from 'react';
import { Crown, User, ShieldCheck } from 'lucide-react';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { pickBi } from '@/components/common/Bilingual';
import { useLanguage } from '@/i18n/LanguageContext';
import {
  WORKSPACE_PERMISSIONS,
  getDefaultPermissionsForRole,
} from '@/modules/workspace/permissions';

const DOMAIN_LABELS: Record<string, { ar: string; en: string }> = {
  entity: { ar: 'الكيان', en: 'Entity' },
  staff: { ar: 'الموظفون', en: 'Staff' },
  locations: { ar: 'المواقع', en: 'Locations' },
  services: { ar: 'الخدمات', en: 'Services' },
  leads: { ar: 'الطلبات', en: 'Leads' },
  quotes: { ar: 'العروض', en: 'Quotes' },
  contracts: { ar: 'العقود', en: 'Contracts' },
  bookings: { ar: 'الحجوزات', en: 'Bookings' },
  documents: { ar: 'المستندات', en: 'Docs' },
  memberships: { ar: 'العضويات', en: 'Memberships' },
  payments: { ar: 'المدفوعات', en: 'Payments' },
  settings: { ar: 'الإعدادات', en: 'Settings' },
};

export interface TeamMember {
  id: string;
  user_id: string;
  role: string;
  is_active: boolean;
  is_primary_manager: boolean | null;
  permissions_override: unknown;
}

export interface TeamProfile {
  user_id: string;
  full_name: string | null;
  avatar_url: string | null;
  ref_id: string | null;
}

export interface TeamPermissionsOverviewProps {
  members: TeamMember[];
  profiles: Map<string, TeamProfile>;
}

function parseOverride(raw: unknown): string[] | null {
  if (raw == null) return null;
  if (Array.isArray(raw)) return raw.filter((v): v is string => typeof v === 'string');
  return null;
}

function resolveEffective(member: TeamMember): Set<string> {
  if (member.is_primary_manager || member.role === 'owner') {
    return new Set(WORKSPACE_PERMISSIONS);
  }
  const override = parseOverride(member.permissions_override);
  return new Set(override ?? (getDefaultPermissionsForRole(member.role) as string[]));
}

function groupDomains(): { domain: string; total: number }[] {
  const map = new Map<string, number>();
  for (const p of WORKSPACE_PERMISSIONS) {
    const [d] = p.split('.');
    map.set(d, (map.get(d) ?? 0) + 1);
  }
  return Array.from(map.entries()).map(([domain, total]) => ({ domain, total }));
}

export const TeamPermissionsOverview: React.FC<TeamPermissionsOverviewProps> = ({
  members, profiles,
}) => {
  const { language } = useLanguage();
  const isRTL = language === 'ar';
  const domains = useMemo(() => groupDomains(), []);

  const rows = useMemo(() => {
    return members
      .filter((m) => m.is_active)
      .map((m) => {
        const effective = resolveEffective(m);
        const counts = domains.map(({ domain, total }) => {
          let granted = 0;
          for (const p of effective) if (p.startsWith(`${domain}.`)) granted++;
          return { domain, granted, total };
        });
        const override = parseOverride(m.permissions_override);
        return { member: m, counts, isCustom: !!override };
      });
  }, [members, domains]);

  if (rows.length === 0) return null;

  return (
    <Card className="p-4">
      <div className="flex items-center justify-between mb-3 flex-wrap gap-2">
        <h3 className="font-semibold text-sm flex items-center gap-2">
          <ShieldCheck className="w-4 h-4 text-primary" />
          {pickBi(isRTL, 'خريطة صلاحيات الفريق', 'Team permissions map')}
          <Badge variant="outline" className="text-[10px]">{rows.length}</Badge>
        </h3>
        <div className="flex items-center gap-2 text-[10px] text-muted-foreground">
          <span className="inline-flex items-center gap-1">
            <span className="w-3 h-3 rounded-sm bg-emerald-500/80" />{pickBi(isRTL, 'كاملة', 'Full')}
          </span>
          <span className="inline-flex items-center gap-1">
            <span className="w-3 h-3 rounded-sm bg-amber-500/60" />{pickBi(isRTL, 'جزئية', 'Partial')}
          </span>
          <span className="inline-flex items-center gap-1">
            <span className="w-3 h-3 rounded-sm bg-muted border border-border" />{pickBi(isRTL, 'لا شيء', 'None')}
          </span>
        </div>
      </div>
      <div className="overflow-x-auto no-scrollbar -mx-2 px-2">
        <table className="w-full text-[11px] border-separate border-spacing-y-1 min-w-[640px]">
          <thead>
            <tr className="text-muted-foreground">
              <th className="text-start font-medium pe-2 sticky start-0 bg-card z-10">
                {pickBi(isRTL, 'العضو', 'Member')}
              </th>
              {domains.map(({ domain }) => (
                <th key={domain} className="px-1 font-medium text-center whitespace-nowrap">
                  {pickBi(isRTL, DOMAIN_LABELS[domain]?.ar ?? domain, DOMAIN_LABELS[domain]?.en ?? domain)}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map(({ member, counts, isCustom }) => {
              const prof = profiles.get(member.user_id);
              return (
                <tr key={member.id} className="hover:bg-muted/30 transition-colors">
                  <td className="pe-2 py-1 sticky start-0 bg-card z-10">
                    <div className="flex items-center gap-2 min-w-0 max-w-[180px]">
                      {prof?.avatar_url ? (
                        <img src={prof.avatar_url} alt="" className="w-6 h-6 rounded-full object-cover shrink-0" />
                      ) : (
                        <div className="w-6 h-6 rounded-full bg-muted flex items-center justify-center shrink-0">
                          <User className="w-3 h-3 text-muted-foreground" />
                        </div>
                      )}
                      <div className="min-w-0">
                        <div className="flex items-center gap-1 truncate">
                          <span className="font-medium truncate">{prof?.full_name ?? '—'}</span>
                          {member.is_primary_manager && <Crown className="w-2.5 h-2.5 text-amber-500 shrink-0" />}
                          {isCustom && (
                            <span
                              className="w-1.5 h-1.5 rounded-full bg-amber-500 shrink-0"
                              title={pickBi(isRTL, 'صلاحيات مخصصة', 'Custom permissions')}
                            />
                          )}
                        </div>
                        <span className="text-[9px] text-muted-foreground truncate block">{member.role}</span>
                      </div>
                    </div>
                  </td>
                  {counts.map(({ domain, granted, total }) => {
                    const ratio = total === 0 ? 0 : granted / total;
                    let cls = 'bg-muted text-muted-foreground border-border';
                    if (ratio === 1) cls = 'bg-emerald-500/80 text-white border-emerald-600';
                    else if (ratio > 0) cls = 'bg-amber-500/60 text-amber-950 border-amber-500/40';
                    return (
                      <td key={domain} className="px-1 py-1 text-center">
                        <span
                          className={`inline-flex items-center justify-center min-w-7 h-6 px-1.5 rounded-md border tech-content text-[10px] font-semibold ${cls}`}
                          title={`${granted} / ${total}`}
                        >
                          {granted}/{total}
                        </span>
                      </td>
                    );
                  })}
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </Card>
  );
};

export default TeamPermissionsOverview;