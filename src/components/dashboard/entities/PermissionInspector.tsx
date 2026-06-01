/**
 * "Who has access to X?" inspector.
 *
 * Pick any workspace permission and instantly see which active members
 * effectively hold it, along with the source of that grant:
 *   - primary  (primary manager / owner — implicit grant)
 *   - custom   (explicit in `permissions_override`)
 *   - role     (inherited from role defaults)
 *
 * Read-only governance view. RLS remains authoritative.
 */
import React, { useMemo, useState } from 'react';
import { Crown, User, Search, ShieldCheck, ShieldOff } from 'lucide-react';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import { pickBi } from '@/components/common/Bilingual';
import { useLanguage } from '@/i18n/LanguageContext';
import { getProfileDisplayName } from '@/modules/profiles/utils/displayName';
import {
  WORKSPACE_PERMISSIONS,
  getDefaultPermissionsForRole,
} from '@/modules/workspace/permissions';
import type { TeamMember, TeamProfile } from './TeamPermissionsOverview';

const DOMAIN_LABELS_AR: Record<string, string> = {
  entity: 'الكيان', staff: 'الموظفون', locations: 'المواقع', services: 'الخدمات',
  leads: 'الطلبات', quotes: 'العروض', contracts: 'العقود', bookings: 'الحجوزات',
  documents: 'المستندات', memberships: 'العضويات', payments: 'المدفوعات', settings: 'الإعدادات',
};
const ACTION_LABELS_AR: Record<string, string> = {
  view: 'عرض', manage: 'إدارة', verify: 'توثيق', create: 'إنشاء',
  respond: 'رد', sign: 'توقيع', upload: 'رفع',
};

function parseOverride(raw: unknown): string[] | null {
  if (Array.isArray(raw)) return raw.filter((v): v is string => typeof v === 'string');
  return null;
}

interface Resolved {
  has: boolean;
  source: 'primary' | 'custom' | 'role' | 'none';
}

function resolveFor(member: TeamMember, permission: string): Resolved {
  if (member.is_primary_manager || member.role === 'owner') {
    return { has: true, source: 'primary' };
  }
  const override = parseOverride(member.permissions_override);
  if (override) {
    return { has: override.includes(permission), source: override.includes(permission) ? 'custom' : 'none' };
  }
  const defaults = getDefaultPermissionsForRole(member.role) as string[];
  return { has: defaults.includes(permission), source: defaults.includes(permission) ? 'role' : 'none' };
}

export interface PermissionInspectorProps {
  members: TeamMember[];
  profiles: Map<string, TeamProfile>;
}

export const PermissionInspector: React.FC<PermissionInspectorProps> = ({ members, profiles }) => {
  const { language } = useLanguage();
  const isRTL = language === 'ar';
  const [permission, setPermission] = useState<string>(WORKSPACE_PERMISSIONS[0]);
  const [query, setQuery] = useState('');

  const filteredPerms = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return WORKSPACE_PERMISSIONS;
    return WORKSPACE_PERMISSIONS.filter((p) => {
      const [d, a] = p.split('.');
      return [
        p, d, a, DOMAIN_LABELS_AR[d] ?? '', ACTION_LABELS_AR[a] ?? '',
      ].join(' ').toLowerCase().includes(q);
    });
  }, [query]);

  const rows = useMemo(() => {
    return members
      .filter((m) => m.is_active)
      .map((m) => ({ member: m, resolved: resolveFor(m, permission) }))
      .sort((a, b) => {
        // grants first, then by source priority
        if (a.resolved.has !== b.resolved.has) return a.resolved.has ? -1 : 1;
        return 0;
      });
  }, [members, permission]);

  const granted = rows.filter((r) => r.resolved.has).length;
  const [d, a] = permission.split('.');
  const permLabel = pickBi(
    isRTL,
    `${DOMAIN_LABELS_AR[d] ?? d} • ${ACTION_LABELS_AR[a] ?? a}`,
    permission,
  );

  const sourceBadge = (src: Resolved['source']) => {
    if (src === 'primary') {
      return <Badge className="text-[9px] h-5 bg-amber-500/20 text-amber-700 border-amber-500/30 hover:bg-amber-500/20"><Crown className="w-2.5 h-2.5 me-0.5" />{pickBi(isRTL, 'رئيسي', 'Primary')}</Badge>;
    }
    if (src === 'custom') {
      return <Badge className="text-[9px] h-5 bg-primary/15 text-primary border-primary/30 hover:bg-primary/15">{pickBi(isRTL, 'مخصص', 'Custom')}</Badge>;
    }
    if (src === 'role') {
      return <Badge variant="outline" className="text-[9px] h-5">{pickBi(isRTL, 'افتراضي الدور', 'Role default')}</Badge>;
    }
    return <Badge variant="outline" className="text-[9px] h-5 text-muted-foreground">{pickBi(isRTL, 'لا يملك', 'No access')}</Badge>;
  };

  return (
    <Card className="p-5">
      <div className="flex items-center justify-between mb-3 flex-wrap gap-2">
        <h3 className="font-semibold text-sm flex items-center gap-2">
          <Search className="w-4 h-4 text-primary" />
          {pickBi(isRTL, 'من يملك هذه الصلاحية؟', 'Who has this permission?')}
        </h3>
        <Badge variant="outline" className="text-[10px]">
          {granted} / {rows.length} {pickBi(isRTL, 'يملك', 'granted')}
        </Badge>
      </div>

      <div className="grid gap-2 md:grid-cols-[1fr_240px] mb-4">
        <div className="relative">
          <Search className="absolute top-1/2 -translate-y-1/2 start-2.5 w-3.5 h-3.5 text-muted-foreground pointer-events-none" />
          <Input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder={pickBi(isRTL, 'ابحث عن صلاحية…', 'Search permission…')}
            className="h-9 ps-8 text-xs"
          />
        </div>
        <Select value={permission} onValueChange={setPermission}>
          <SelectTrigger className="h-9 text-xs">
            <SelectValue />
          </SelectTrigger>
          <SelectContent className="max-h-[300px]">
            {filteredPerms.map((p) => {
              const [pd, pa] = p.split('.');
              return (
                <SelectItem key={p} value={p} className="text-xs">
                  <span className="tech-content text-muted-foreground me-2">{p}</span>
                  <span className="text-foreground/70">
                    {pickBi(isRTL, `${DOMAIN_LABELS_AR[pd] ?? pd} • ${ACTION_LABELS_AR[pa] ?? pa}`, '')}
                  </span>
                </SelectItem>
              );
            })}
            {filteredPerms.length === 0 && (
              <div className="text-xs text-muted-foreground p-2 text-center">
                {pickBi(isRTL, 'لا توجد نتائج', 'No results')}
              </div>
            )}
          </SelectContent>
        </Select>
      </div>

      <div className="rounded-lg border border-border/40 p-3 mb-3 bg-muted/20">
        <p className="text-[11px] text-muted-foreground mb-1">{pickBi(isRTL, 'الصلاحية المختارة', 'Selected permission')}</p>
        <div className="flex items-center gap-2 flex-wrap">
          <code className="tech-content text-xs px-2 py-0.5 rounded bg-background border border-border/40">{permission}</code>
          <span className="text-sm font-medium">{permLabel}</span>
        </div>
      </div>

      {rows.length === 0 ? (
        <p className="text-xs text-muted-foreground text-center py-6">{pickBi(isRTL, 'لا يوجد أعضاء نشطون', 'No active members')}</p>
      ) : (
        <div className="space-y-1.5 max-h-[400px] overflow-y-auto no-scrollbar -mx-1 px-1">
          {rows.map(({ member, resolved }) => {
            const prof = profiles.get(member.user_id);
            return (
              <div
                key={member.id}
                className={`flex items-center gap-3 p-2 rounded-lg border transition-all ${
                  resolved.has
                    ? 'border-emerald-500/30 bg-emerald-500/5'
                    : 'border-border/30 bg-muted/10 opacity-70'
                }`}
              >
                {prof?.avatar_url ? (
                  <img src={prof.avatar_url} alt="" className="w-8 h-8 rounded-full object-cover shrink-0" />
                ) : (
                  <div className="w-8 h-8 rounded-full bg-muted flex items-center justify-center shrink-0">
                    <User className="w-3.5 h-3.5 text-muted-foreground" />
                  </div>
                )}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-1.5 flex-wrap">
                    <span className="font-medium text-xs truncate">{getProfileDisplayName(prof, { locale: isRTL ? 'ar' : 'en', allowRefIdFallback: true, emptyFallback: '—' })}</span>
                    <span className="text-[10px] text-muted-foreground tech-content">{prof?.ref_id ?? ''}</span>
                  </div>
                  <span className="text-[10px] text-muted-foreground">{member.role}</span>
                </div>
                {resolved.has ? (
                  <ShieldCheck className="w-4 h-4 text-emerald-500 shrink-0" />
                ) : (
                  <ShieldOff className="w-4 h-4 text-muted-foreground/50 shrink-0" />
                )}
                {sourceBadge(resolved.source)}
              </div>
            );
          })}
        </div>
      )}
    </Card>
  );
};

export default PermissionInspector;