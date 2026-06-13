import React from 'react';
import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import {
  Users, Mail, Phone, Calendar, Building2, Check, Link2, FileText,
  MessageSquare, Star, Inbox, Activity, Lock, X,
} from 'lucide-react';
import { pickBi } from '@/components/common/Bilingual';
import { isSyntheticPhoneEmail } from '@/lib/auth-email';
import { formatRelative } from './_shared';
import { staffRoleConfig, type Profile } from './userConfigs';
import type { BusinessLink, StaffRole } from './_shared';
import { listContractsForUserParticipant } from '@/modules/contracts';
import { listUserEntityLinks, type UserEntityLink } from '@/modules/admin';
import { countMessagesBySender } from '@/modules/messaging';

/**
 * Phase 6C — extracted from AdminUsers.tsx without behavior change.
 * Renders the per-user expanded detail card (account info, KPI tiles,
 * linked entities, contracts, lead requests, recent admin activity).
 * Mutations stay in the parent (`onChangeStaffRole`, `onRemoveStaff`).
 */
interface UserDetailPanelProps {
  userId: string;
  profile: Profile;
  isRTL: boolean;
  businessLinks: BusinessLink[];
  isSuperAdmin: boolean;
  onChangeStaffRole: (link: BusinessLink, role: StaffRole) => void;
  onRemoveStaff: (link: BusinessLink) => void;
}

export const UserDetailPanel = React.memo(({
  userId, profile, isRTL, businessLinks, isSuperAdmin, onChangeStaffRole, onRemoveStaff,
}: UserDetailPanelProps) => {
  const { data, isLoading } = useQuery({
    queryKey: ['admin-user-detail', userId],
    queryFn: async () => {
      const [contractsCount, contractsList, messages, reviews, lastActivity, entityLinksRes, leadsRes] = await Promise.all([
        listContractsForUserParticipant({ userId, select: 'id', count: { mode: 'exact', head: true } }),
        listContractsForUserParticipant<{ id: string; contract_ref: string | null; status: string | null; total_amount: number | null; currency: string | null; created_at: string }>({
          userId,
          select: 'id, contract_ref, status, total_amount, currency, created_at',
        }),
        countMessagesBySender({ userId }),
        supabase.from('reviews').select('id', { count: 'exact', head: true }).eq('user_id', userId),
        supabase.from('admin_activity_log').select('action, created_at, details').or(`user_id.eq.${userId},entity_id.eq.${userId}`).order('created_at', { ascending: false }).limit(5),
        listUserEntityLinks(userId),
        supabase.from('lead_requests').select('id, status, subject, created_at, name').eq('user_id', userId).order('created_at', { ascending: false }).limit(20),
      ]);
      return {
        contracts: contractsCount.count ?? 0,
        contractsList: (contractsList.data ?? []),
        messages: messages.count ?? 0,
        reviews: reviews.count ?? 0,
        recentActivity: lastActivity.data ?? [],
        entityLinks: (entityLinksRes.data ?? []) as UserEntityLink[],
        leadRequests: (leadsRes.data ?? []) as Array<{ id: string; status: string | null; subject: string | null; created_at: string; name: string | null }>,
      };
    },
    staleTime: 60_000,
  });
  if (isLoading) return <div className="px-4 pb-4"><Skeleton className="h-20 rounded-xl" /></div>;
  if (!data) return null;
  const stats = [
    { label: pickBi(isRTL, 'العقود', 'Contracts'), val: data.contracts, icon: FileText, color: 'text-info bg-info/10' },
    { label: pickBi(isRTL, 'الرسائل', 'Messages'), val: data.messages, icon: MessageSquare, color: 'text-success bg-success/10' },
    { label: pickBi(isRTL, 'التقييمات', 'Reviews'), val: data.reviews, icon: Star, color: 'text-warning bg-warning/10' },
    { label: pickBi(isRTL, 'الطلبات', 'Requests'), val: data.leadRequests.length, icon: Inbox, color: 'text-accent bg-accent/10' },
  ];
  const officialEmail = profile.email && !isSyntheticPhoneEmail(profile.email) ? profile.email : null;
  return (
    <div className="border-t border-border/30 bg-muted/20 px-4 py-3 rounded-b-2xl space-y-3 animate-in slide-in-from-top-1 duration-200">
      <div>
        <p className="text-[11px] font-bold text-muted-foreground mb-1.5 flex items-center gap-1">
          <Users className="w-3 h-3" />
          {pickBi(isRTL, 'بيانات الحساب', 'Account info')}
        </p>
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-2 text-[11px]">
          <div className="rounded-lg bg-card border border-border/30 p-2">
            <p className="text-muted-foreground mb-0.5 flex items-center gap-1"><Mail className="w-3 h-3" />{pickBi(isRTL, 'البريد الرسمي', 'Official email')}</p>
            <p className="font-medium break-all tech-content">{officialEmail || '—'}</p>
          </div>
          <div className="rounded-lg bg-card border border-border/30 p-2">
            <p className="text-muted-foreground mb-0.5 flex items-center gap-1"><Phone className="w-3 h-3" />{pickBi(isRTL, 'الهاتف', 'Phone')}</p>
            <p className="font-medium tech-content">{profile.phone || '—'}</p>
          </div>
          <div className="rounded-lg bg-card border border-border/30 p-2">
            <p className="text-muted-foreground mb-0.5 flex items-center gap-1"><Calendar className="w-3 h-3" />{pickBi(isRTL, 'تاريخ التسجيل', 'Joined')}</p>
            <p className="font-medium tech-content">{new Date(profile.created_at).toLocaleDateString(pickBi(isRTL, 'ar-SA-u-nu-latn', 'en'))}</p>
          </div>
        </div>
      </div>
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
        {stats.map(s => (
          <div key={s.label} className="rounded-xl bg-card border border-border/30 p-2.5 flex items-center gap-2">
            <div className={`w-8 h-8 rounded-lg ${s.color} flex items-center justify-center`}><s.icon className="w-4 h-4" /></div>
            <div><p className="text-base font-bold leading-none tech-content">{s.val}</p><p className="text-[10px] text-muted-foreground">{s.label}</p></div>
          </div>
        ))}
      </div>
      {data.entityLinks.length > 0 && (
        <div>
          <p className="text-[11px] font-bold text-muted-foreground mb-1.5 flex items-center gap-1">
            <Building2 className="w-3 h-3" />
            {isRTL ? `المنشآت المرتبطة (${data.entityLinks.length})` : `Linked entities (${data.entityLinks.length})`}
          </p>
          <div className="space-y-1 max-h-48 overflow-auto">
            {data.entityLinks.map((b) => (
              <div key={b.business_id} className="flex items-center gap-2 rounded-lg bg-background/60 border border-border/30 px-2 py-1.5 text-[11px]">
                <Building2 className="w-3 h-3 text-success shrink-0" />
                <span className="truncate flex-1 font-medium">
                  {isRTL ? (b.business_name_ar || b.business_name_en || '—') : (b.business_name_en || b.business_name_ar || '—')}
                </span>
                <span className="font-mono tech-content text-success shrink-0">{b.business_ref_id ?? '—'}</span>
                <Badge variant="outline" className="text-[9px] px-1 py-0">{b.role}</Badge>
                {b.is_primary_manager && <Badge variant="outline" className="text-[9px] border-accent/40 text-accent px-1 py-0">{pickBi(isRTL, 'رئيسي', 'Primary')}</Badge>}
                {b.is_verified && <Check className="w-3 h-3 text-success" />}
                {b.business_username && (
                  <Button asChild size="icon" variant="ghost" className="h-6 w-6 rounded-md" aria-label="Link">
                    <Link to={`/${b.business_username}`} target="_blank" rel="noreferrer"><Link2 className="w-3 h-3" /></Link>
                  </Button>
                )}
              </div>
            ))}
          </div>
        </div>
      )}
      {businessLinks.length > 0 && (
        <div>
          <p className="text-[11px] font-bold text-muted-foreground mb-1.5 flex items-center gap-1">
            <Building2 className="w-3 h-3" />
            {isRTL ? `الصلاحيات على المنشآت (${businessLinks.length})` : `Business permissions (${businessLinks.length})`}
          </p>
          <div className="space-y-1.5">
            {businessLinks.map(link => {
              const cfg = staffRoleConfig[link.role];
              const lockedOwner = link.isOwnerByEntity;
              return (
                <div key={link.business.id + (link.staffId ?? 'owner')}
                  className="flex items-center gap-2 rounded-lg bg-background/60 border border-border/30 px-2 py-1.5 text-[11px]">
                  <Building2 className="w-3 h-3 text-success shrink-0" />
                  <span className="truncate flex-1 font-medium">
                    {isRTL ? link.business.name_ar : (link.business.name_en || link.business.name_ar)}
                  </span>
                  <span className="font-mono tech-content text-success shrink-0">{link.business.ref_id}</span>
                  {!link.isActive && (
                    <Badge variant="outline" className="text-[9px] text-muted-foreground border-dashed px-1 py-0">
                      {pickBi(isRTL, 'غير نشط', 'inactive')}
                    </Badge>
                  )}
                  {isSuperAdmin && !lockedOwner && link.staffId ? (
                    <Select value={link.role} onValueChange={(v) => onChangeStaffRole(link, v as StaffRole)}>
                      <SelectTrigger className="h-7 w-24 text-[10px] rounded-lg"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="manager">{pickBi(isRTL, 'مدير', 'Manager')}</SelectItem>
                        <SelectItem value="editor">{pickBi(isRTL, 'محرر', 'Editor')}</SelectItem>
                        <SelectItem value="viewer">{pickBi(isRTL, 'مشاهد', 'Viewer')}</SelectItem>
                      </SelectContent>
                    </Select>
                  ) : (
                    <Badge className={`${cfg.color} text-[10px] border px-1.5 py-0`}>
                      {isRTL ? cfg.ar : cfg.en}{lockedOwner && <Lock className="w-2.5 h-2.5 ms-0.5 inline" />}
                    </Badge>
                  )}
                  {isSuperAdmin && !lockedOwner && link.staffId && (
                    <button
                      onClick={() => onRemoveStaff(link)}
                      title={pickBi(isRTL, 'إزالة الصلاحية', 'Remove access')}
                      className="p-1 rounded-md text-destructive/60 hover:text-destructive hover:bg-destructive/10 transition-colors"
                    >
                      <X className="w-3 h-3" />
                    </button>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}
      {data.contractsList.length > 0 && (
        <div>
          <p className="text-[11px] font-bold text-muted-foreground mb-1.5 flex items-center gap-1">
            <FileText className="w-3 h-3" />
            {isRTL ? `العقود (${data.contractsList.length})` : `Contracts (${data.contractsList.length})`}
          </p>
          <div className="space-y-1 max-h-40 overflow-auto">
            {data.contractsList.slice(0, 20).map((c) => (
              <div key={c.id} className="flex items-center gap-2 rounded-lg bg-background/60 border border-border/30 px-2 py-1.5 text-[11px]">
                <FileText className="w-3 h-3 text-info shrink-0" />
                <span className="font-mono tech-content flex-1 truncate">{c.contract_ref || c.id.slice(0, 8)}</span>
                <Badge variant="outline" className="text-[9px] px-1 py-0">{c.status ?? '—'}</Badge>
                {c.total_amount != null && (
                  <span className="tech-content text-muted-foreground shrink-0">{c.total_amount} {c.currency ?? 'SAR'}</span>
                )}
                <span className="text-muted-foreground shrink-0 tech-content">{new Date(c.created_at).toLocaleDateString(pickBi(isRTL, 'ar-SA-u-nu-latn', 'en'))}</span>
              </div>
            ))}
          </div>
        </div>
      )}
      {data.leadRequests.length > 0 && (
        <div>
          <p className="text-[11px] font-bold text-muted-foreground mb-1.5 flex items-center gap-1">
            <Inbox className="w-3 h-3" />
            {isRTL ? `طلبات الخدمة (${data.leadRequests.length})` : `Service requests (${data.leadRequests.length})`}
          </p>
          <div className="space-y-1 max-h-40 overflow-auto">
            {data.leadRequests.map((l) => (
              <div key={l.id} className="flex items-center gap-2 rounded-lg bg-background/60 border border-border/30 px-2 py-1.5 text-[11px]">
                <Inbox className="w-3 h-3 text-warning shrink-0" />
                <span className="truncate flex-1 font-medium">{l.name || l.subject || (pickBi(isRTL, 'طلب', 'Request'))}</span>
                <Badge variant="outline" className="text-[9px] px-1 py-0">{l.status ?? '—'}</Badge>
                <span className="text-muted-foreground shrink-0 tech-content">{new Date(l.created_at).toLocaleDateString(pickBi(isRTL, 'ar-SA-u-nu-latn', 'en'))}</span>
              </div>
            ))}
          </div>
        </div>
      )}
      {data.recentActivity.length > 0 && (
        <div>
          <p className="text-[11px] font-bold text-muted-foreground mb-1.5 flex items-center gap-1"><Activity className="w-3 h-3" />{pickBi(isRTL, 'آخر نشاط إداري', 'Recent Admin Activity')}</p>
          <div className="space-y-1">
            {data.recentActivity.map((a, i) => (
              <div key={i} className="flex items-center gap-2 text-[11px] rounded-lg bg-background/50 px-2 py-1.5">
                <span className="font-mono text-muted-foreground truncate flex-1">{a.action}</span>
                <span className="text-muted-foreground shrink-0">{formatRelative(a.created_at, isRTL)}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
});
UserDetailPanel.displayName = 'UserDetailPanel';

export default UserDetailPanel;