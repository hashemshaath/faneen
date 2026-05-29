/**
 * IdentityActivityFeed — Live admin activity stream from `admin_activity_log`.
 *
 * Pulls the last N entries and renders a compact bilingual timeline with
 * semantic colors per action category. Real-time subscription updates feed
 * automatically when new admin actions are recorded.
 */
import React, { useEffect, useMemo, useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { listProfilesByUserIds } from '@/modules/users/services/listProfilesByUserIds';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Activity, Shield, UserPlus, Ban, CheckCircle2, Building2,
  KeyRound, Crown, Edit3, RefreshCw, AlertCircle, Users as UsersIcon,
} from 'lucide-react';

interface AdminActivityRow {
  id: string;
  user_id: string;
  action: string;
  entity_type: string | null;
  entity_id: string | null;
  details: Record<string, unknown> | null;
  created_at: string;
}

interface ActorLite { user_id: string; full_name: string | null; avatar_url: string | null }

interface Props {
  isRTL: boolean;
  limit?: number;
  className?: string;
}

function classify(action: string): { icon: React.ElementType; tone: string } {
  const a = action.toLowerCase();
  if (a.includes('disable') || a.includes('ban') || a.includes('delete')) return { icon: Ban, tone: 'text-destructive bg-destructive/10' };
  if (a.includes('enable') || a.includes('activate') || a.includes('approve') || a.includes('verify')) return { icon: CheckCircle2, tone: 'text-success bg-success/10' };
  if (a.includes('create') || a.includes('insert') || a.includes('new')) return { icon: UserPlus, tone: 'text-info bg-info/10' };
  if (a.includes('role') || a.includes('permission') || a.includes('access')) return { icon: Shield, tone: 'text-warning bg-warning/10' };
  if (a.includes('reset') || a.includes('password') || a.includes('email')) return { icon: KeyRound, tone: 'text-accent bg-accent/10' };
  if (a.includes('business') || a.includes('reassign')) return { icon: Building2, tone: 'text-success bg-success/10' };
  if (a.includes('membership') || a.includes('tier') || a.includes('upgrade')) return { icon: Crown, tone: 'text-warning bg-warning/10' };
  if (a.includes('update') || a.includes('edit')) return { icon: Edit3, tone: 'text-primary bg-primary/10' };
  return { icon: Activity, tone: 'text-muted-foreground bg-muted/40' };
}

function labelFor(action: string, isRTL: boolean): string {
  const map: Record<string, { ar: string; en: string }> = {
    bulk_user_disable:        { ar: 'تعطيل جماعي لمستخدمين',     en: 'Bulk disable users' },
    bulk_user_enable:         { ar: 'تفعيل جماعي لمستخدمين',     en: 'Bulk enable users' },
    bulk_business_activate:   { ar: 'تفعيل جماعي لمنشآت',         en: 'Bulk activate businesses' },
    bulk_business_deactivate: { ar: 'تعطيل جماعي لمنشآت',         en: 'Bulk deactivate businesses' },
    user_ban:                 { ar: 'تعطيل مستخدم',                en: 'Disable user' },
    user_unban:               { ar: 'تفعيل مستخدم',                en: 'Enable user' },
    user_create:              { ar: 'إنشاء مستخدم',                en: 'Create user' },
    user_update:              { ar: 'تعديل بيانات مستخدم',          en: 'Update user' },
    password_reset:           { ar: 'إعادة تعيين كلمة المرور',      en: 'Password reset' },
    email_update:             { ar: 'تعديل بريد الدخول',            en: 'Update login email' },
    business_verify:          { ar: 'توثيق منشأة',                  en: 'Verify business' },
    business_create:          { ar: 'إنشاء منشأة',                  en: 'Create business' },
    business_reassign_owner:  { ar: 'إعادة إسناد ملكية منشأة',       en: 'Reassign business owner' },
    role_grant:               { ar: 'منح دور',                       en: 'Grant role' },
    role_revoke:              { ar: 'سحب دور',                       en: 'Revoke role' },
  };
  const e = map[action];
  if (e) return isRTL ? e.ar : e.en;
  // Generic prettifier
  return action.replace(/_/g, ' ');
}

function relTime(iso: string, isRTL: boolean): string {
  const t = new Date(iso).getTime();
  const diff = Math.max(0, Date.now() - t);
  const sec = Math.floor(diff / 1000);
  if (sec < 60) return isRTL ? 'منذ لحظات' : 'just now';
  const min = Math.floor(sec / 60);
  if (min < 60) return isRTL ? `منذ ${min} د` : `${min}m ago`;
  const hr = Math.floor(min / 60);
  if (hr < 24) return isRTL ? `منذ ${hr} س` : `${hr}h ago`;
  const day = Math.floor(hr / 24);
  if (day < 30) return isRTL ? `منذ ${day} ي` : `${day}d ago`;
  return new Date(iso).toLocaleDateString(isRTL ? 'ar-u-nu-latn' : 'en');
}

export const IdentityActivityFeed: React.FC<Props> = ({ isRTL, limit = 20, className }) => {
  const qc = useQueryClient();

  const { data, isLoading } = useQuery({
    queryKey: ['identity-activity-feed', limit],
    queryFn: async (): Promise<{ rows: AdminActivityRow[]; actors: Map<string, ActorLite> }> => {
      const { data: rows, error } = await supabase
        .from('admin_activity_log')
        .select('id, user_id, action, entity_type, entity_id, details, created_at')
        .order('created_at', { ascending: false })
        .limit(limit);
      if (error) throw error;
      const list = (rows ?? []) as AdminActivityRow[];
      const actorIds = Array.from(new Set(list.map(r => r.user_id))).filter(Boolean);
      const actors = new Map<string, ActorLite>();
      if (actorIds.length > 0) {
        const { data: profs } = await listProfilesByUserIds<ActorLite>({
          userIds: actorIds,
          select: 'user_id, full_name, avatar_url',
        });
        (profs ?? []).forEach(p => actors.set(p.user_id, p as ActorLite));
      }
      return { rows: list, actors };
    },
    staleTime: 30_000,
  });

  // Realtime refresh
  useEffect(() => {
    const channel = supabase
      .channel('admin-activity-feed')
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'admin_activity_log' }, () => {
        qc.invalidateQueries({ queryKey: ['identity-activity-feed'] });
      })
      .subscribe();
    return () => { void supabase.removeChannel(channel); };
  }, [qc]);

  const rows = data?.rows ?? [];
  const actors = data?.actors ?? new Map<string, ActorLite>();

  return (
    <div className={`rounded-2xl border border-border/30 bg-card p-5 ${className ?? ''}`}>
      <div className="flex items-center justify-between mb-3">
        <h3 className="font-heading font-bold text-sm flex items-center gap-2">
          <span className="relative inline-flex w-2 h-2">
            <span className="absolute inset-0 rounded-full bg-success animate-ping opacity-75" />
            <span className="relative inline-block w-2 h-2 rounded-full bg-success" />
          </span>
          <Activity className="w-4 h-4 text-primary" />
          {isRTL ? 'النشاط المباشر للإدارة' : 'Live admin activity'}
        </h3>
        <button
          onClick={() => qc.invalidateQueries({ queryKey: ['identity-activity-feed'] })}
          className="text-[11px] text-muted-foreground hover:text-foreground inline-flex items-center gap-1"
          aria-label={isRTL ? 'تحديث' : 'Refresh'}
        >
          <RefreshCw className="w-3 h-3" />
          {isRTL ? 'تحديث' : 'Refresh'}
        </button>
      </div>

      {isLoading ? (
        <div className="space-y-2">{Array.from({ length: 5 }).map((_, i) => <Skeleton key={i} className="h-12 rounded-xl" />)}</div>
      ) : rows.length === 0 ? (
        <div className="py-10 text-center text-xs text-muted-foreground">
          <AlertCircle className="w-8 h-8 mx-auto mb-2 opacity-30" />
          {isRTL ? 'لا يوجد نشاط مسجّل بعد' : 'No recorded activity yet'}
        </div>
      ) : (
        <ol className="relative space-y-2 max-h-[420px] overflow-y-auto pe-1">
          {rows.map(r => {
            const { icon: Icon, tone } = classify(r.action);
            const actor = actors.get(r.user_id);
            const label = labelFor(r.action, isRTL);
            return (
              <li key={r.id} className="flex items-start gap-3 rounded-xl bg-muted/15 hover:bg-muted/30 border border-transparent hover:border-border/30 p-2.5 transition-colors">
                <div className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 ${tone}`}>
                  <Icon className="w-4 h-4" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <p className="text-xs font-semibold truncate">{label}</p>
                    {r.entity_type && (
                      <span className="text-[9px] uppercase tracking-wider text-muted-foreground/80">
                        {r.entity_type}
                      </span>
                    )}
                  </div>
                  <div className="flex items-center gap-2 mt-0.5 text-[10px] text-muted-foreground">
                    <UsersIcon className="w-2.5 h-2.5 shrink-0" />
                    <span className="truncate">{actor?.full_name || (isRTL ? 'مسؤول' : 'admin')}</span>
                    <span>•</span>
                    <span className="tech-content">{relTime(r.created_at, isRTL)}</span>
                  </div>
                </div>
              </li>
            );
          })}
        </ol>
      )}
    </div>
  );
};

export default IdentityActivityFeed;