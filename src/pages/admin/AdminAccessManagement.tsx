import React, { useState, useMemo, useEffect } from 'react';
import { DashboardLayout } from '@/components/dashboard/DashboardLayout';
import { useLanguage } from '@/i18n/LanguageContext';
import { useAuth } from '@/contexts/AuthContext';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Skeleton } from '@/components/ui/skeleton';
import { Separator } from '@/components/ui/separator';
import { toast } from 'sonner';
import {
  ShieldCheck, Search, Send, KeyRound, Users, Mail, Phone, Calendar,
  Loader2, Clock, CheckCircle2, XCircle, AlertTriangle, RefreshCw,
  Hash, Ban, UserCheck, History, Shield, ShieldPlus, ShieldMinus, Crown,
} from 'lucide-react';
import { PasswordResetLogPanel } from '@/components/admin/PasswordResetLogPanel';
import { useNoIndex } from "@/hooks/useNoIndex";
import { listAllUserRoles } from '@/services/userRoles';

const formatDate = (dateStr: string | null | undefined, lang: string): string => {
  if (!dateStr) return lang === 'ar' ? 'غير محدد' : 'N/A';
  const d = new Date(dateStr);
  if (isNaN(d.getTime())) return lang === 'ar' ? 'غير محدد' : 'N/A';
  return d.toLocaleDateString(lang === 'ar' ? 'ar-SA-u-nu-latn' : 'en', { year: 'numeric', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });
};

const statusConfig: Record<string, { icon: React.ElementType; color: string; labelAr: string; labelEn: string }> = {
  requested: { icon: Clock, color: 'bg-info text-info dark:bg-info/30 dark:text-info border-info dark:border-info', labelAr: 'مطلوب', labelEn: 'Requested' },
  resend: { icon: RefreshCw, color: 'bg-warning text-warning dark:bg-warning/30 dark:text-warning border-warning dark:border-warning', labelAr: 'إعادة إرسال', labelEn: 'Resent' },
  completed: { icon: CheckCircle2, color: 'bg-success text-success dark:bg-success/30 dark:text-success border-success dark:border-success', labelAr: 'مكتمل', labelEn: 'Completed' },
  failed: { icon: XCircle, color: 'bg-destructive text-destructive dark:bg-destructive/30 dark:text-destructive border-destructive dark:border-destructive', labelAr: 'فشل', labelEn: 'Failed' },
};

const AdminAccessManagement = () => {
  useNoIndex();
  const { isRTL, language } = useLanguage();
  const { user, isSuperAdmin } = useAuth();
  const queryClient = useQueryClient();
  const [searchTerm, setSearchTerm] = useState('');
  const [activeTab, setActiveTab] = useState<'accounts' | 'roles' | 'reset-log'>('accounts');
  const [pendingRoleAction, setPendingRoleAction] = useState<{ userId: string; action: 'grant' | 'revoke' } | null>(null);

  // Auto-clear pending confirmation after 4s
  useEffect(() => {
    if (!pendingRoleAction) return;
    const t = setTimeout(() => setPendingRoleAction(null), 4000);
    return () => clearTimeout(t);
  }, [pendingRoleAction]);

  // Fetch profiles
  const { data: profiles = [], isLoading: loadingProfiles } = useQuery({
    queryKey: ['access-mgmt-profiles'],
    queryFn: async () => {
      const { data, error } = await supabase.from('profiles')
        .select('id, user_id, full_name, email, phone, avatar_url, ref_id, account_type, is_onboarded, phone_verified, membership_tier, created_at, is_banned')
        .order('created_at', { ascending: false });
      if (error) throw error;
      return data as any[];
    },
    enabled: !!user,
  });

  // Fetch password reset logs
  const { data: resetLogs = [], isLoading: loadingLogs } = useQuery({
    queryKey: ['password-reset-logs'],
    queryFn: async () => {
      const { data, error } = await supabase.from('password_reset_log')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(200);
      if (error) throw error;
      return data;
    },
    enabled: !!user,
  });

  // Fetch all role assignments
  const { data: rolesData = [], isLoading: loadingRoles } = useQuery({
    queryKey: ['access-mgmt-roles'],
    queryFn: () => listAllUserRoles(),
    enabled: !!user,
  });

  const rolesByUser = useMemo(() => {
    const map = new Map<string, string[]>();
    for (const r of rolesData) {
      const arr = map.get(r.user_id) ?? [];
      arr.push(r.role);
      map.set(r.user_id, arr);
    }
    return map;
  }, [rolesData]);

  const grantAdminMutation = useMutation({
    mutationFn: async (targetUserId: string) => {
      const { error } = await supabase.from('user_roles').insert({ user_id: targetUserId, role: 'admin' });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['access-mgmt-roles'] });
      toast.success(isRTL ? 'تم منح صلاحية الأدمن' : 'Admin role granted');
      setPendingRoleAction(null);
    },
    onError: (e: Error) => toast.error(e.message || (isRTL ? 'فشل منح الصلاحية' : 'Failed to grant role')),
  });

  const revokeAdminMutation = useMutation({
    mutationFn: async (targetUserId: string) => {
      const { error } = await supabase
        .from('user_roles')
        .delete()
        .eq('user_id', targetUserId)
        .eq('role', 'admin');
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['access-mgmt-roles'] });
      toast.success(isRTL ? 'تم إزالة صلاحية الأدمن' : 'Admin role revoked');
      setPendingRoleAction(null);
    },
    onError: (e: Error) => toast.error(e.message || (isRTL ? 'فشل إزالة الصلاحية' : 'Failed to revoke role')),
  });

  // Send reset link mutation
  const sendResetMutation = useMutation({
    mutationFn: async (targetUserId: string) => {
      const res = await supabase.functions.invoke('admin-reset-password', {
        body: { target_user_id: targetUserId, action: 'send_reset_link' },
      });
      if (res.error) throw res.error;
      if (res.data?.error) throw new Error(res.data.error);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['password-reset-logs'] });
      toast.success(isRTL ? 'تم إرسال رابط إعادة التعيين بنجاح' : 'Reset link sent successfully');
    },
    onError: (err: Error) => toast.error(err.message || (isRTL ? 'فشل إرسال الرابط' : 'Failed to send link')),
  });

  // Filtered profiles
  const filtered = useMemo(() => {
    if (!searchTerm) return profiles;
    const lower = searchTerm.toLowerCase();
    return profiles.filter(p =>
      p.full_name?.toLowerCase().includes(lower) ||
      p.email?.toLowerCase().includes(lower) ||
      p.phone?.includes(searchTerm) ||
      p.ref_id?.toLowerCase().includes(lower)
    );
  }, [profiles, searchTerm]);

  // Stats
  const stats = useMemo(() => {
    const total = profiles.length;
    const verified = profiles.filter((p: any) => p.phone_verified).length;
    const onboarded = profiles.filter((p: any) => p.is_onboarded).length;
    const banned = profiles.filter((p: any) => p.is_banned).length;
    const recentResets = resetLogs.filter(l => {
      const d = new Date(l.created_at);
      return d.getTime() > Date.now() - 7 * 24 * 60 * 60 * 1000;
    }).length;
    return { total, verified, onboarded, banned, recentResets };
  }, [profiles, resetLogs]);

  // Reset log grouped by email
  const resetLogsByEmail = useMemo(() => {
    const map = new Map<string, typeof resetLogs>();
    resetLogs.forEach(log => {
      const arr = map.get(log.email) || [];
      arr.push(log);
      map.set(log.email, arr);
    });
    return map;
  }, [resetLogs]);

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Header */}
        <div>
          <h1 className="font-heading font-bold text-2xl text-foreground flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-accent/20 to-primary/10 flex items-center justify-center shadow-sm">
              <ShieldCheck className="w-5 h-5 text-accent" />
            </div>
            {isRTL ? 'إدارة الوصول والحسابات' : 'Access & Account Management'}
          </h1>
          <p className="text-muted-foreground font-body mt-1 text-sm">
            {isRTL ? 'عرض حالة الحسابات وإدارة إعادة تعيين كلمات المرور بأمان' : 'View account statuses and manage password resets securely'}
          </p>
        </div>

        {/* Tabs */}
        <div className="flex rounded-2xl bg-muted/40 p-1 gap-1 flex-wrap">
          <button
            onClick={() => setActiveTab('accounts')}
            className={`flex-1 flex items-center justify-center gap-2 py-3 rounded-xl text-sm font-medium transition-all duration-300 ${
              activeTab === 'accounts' ? 'bg-card text-foreground shadow-sm ring-1 ring-border/30' : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            <Users className="w-4 h-4" />
            {isRTL ? 'الحسابات' : 'Accounts'}
          </button>
          <button
            onClick={() => setActiveTab('roles')}
            className={`flex-1 flex items-center justify-center gap-2 py-3 rounded-xl text-sm font-medium transition-all duration-300 ${
              activeTab === 'roles' ? 'bg-card text-foreground shadow-sm ring-1 ring-border/30' : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            <ShieldCheck className="w-4 h-4" />
            {isRTL ? 'إدارة الأدوار' : 'Roles'}
          </button>
          <button
            onClick={() => setActiveTab('reset-log')}
            className={`flex-1 flex items-center justify-center gap-2 py-3 rounded-xl text-sm font-medium transition-all duration-300 ${
              activeTab === 'reset-log' ? 'bg-card text-foreground shadow-sm ring-1 ring-border/30' : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            <History className="w-4 h-4" />
            {isRTL ? 'سجل إعادة التعيين' : 'Reset Log'}
          </button>
        </div>

        {activeTab === 'reset-log' ? (
          <PasswordResetLogPanel />
        ) : activeTab === 'roles' ? (
          <div className="space-y-4">
            {/* Search reused */}
            <div className="rounded-2xl border border-border/30 bg-card p-4">
              <div className="relative">
                <Search className="absolute top-1/2 -translate-y-1/2 text-muted-foreground w-4 h-4" style={{ [isRTL ? 'right' : 'left']: '12px' }} />
                <Input
                  value={searchTerm}
                  onChange={e => setSearchTerm(e.target.value)}
                  placeholder={isRTL ? 'بحث بالاسم أو البريد أو المعرف...' : 'Search by name, email, or ref ID...'}
                  className="ps-10 h-10 rounded-xl bg-muted/30 border-border/20 focus:bg-background transition-colors"
                />
              </div>
            </div>

            {!isSuperAdmin && (
              <div className="rounded-xl border border-warning/50 bg-warning/10 p-3 text-sm flex items-start gap-2">
                <AlertTriangle className="w-4 h-4 text-warning shrink-0 mt-0.5" />
                <span>{isRTL
                  ? 'يمكنك عرض الأدوار فقط — منح أو إزالة الأدمن مقتصر على Super Admin (مفروض على مستوى قاعدة البيانات).'
                  : 'View-only — granting or revoking admin is restricted to Super Admin (enforced by database RLS).'}
                </span>
              </div>
            )}

            {loadingProfiles || loadingRoles ? (
              <div className="space-y-3">{Array.from({ length: 5 }).map((_, i) => <Skeleton key={i} className="h-16 rounded-2xl" />)}</div>
            ) : (
              <div className="space-y-3">
                {filtered.map(profile => {
                  const userRoles = rolesByUser.get(profile.user_id) ?? [];
                  const isAdminRole = userRoles.includes('admin');
                  const isSuperRole = userRoles.includes('super_admin');
                  const isSelf = profile.user_id === user?.id;
                  const pending = pendingRoleAction?.userId === profile.user_id ? pendingRoleAction.action : null;
                  const isPendingMutation = (grantAdminMutation.isPending && grantAdminMutation.variables === profile.user_id)
                    || (revokeAdminMutation.isPending && revokeAdminMutation.variables === profile.user_id);

                  return (
                    <div key={profile.id} className="rounded-2xl border border-border/30 bg-card p-4 flex flex-col sm:flex-row sm:items-center gap-3">
                      <div className="flex items-center gap-3 flex-1 min-w-0">
                        <Avatar className="w-9 h-9 ring-2 ring-border/10">
                          <AvatarImage src={profile.avatar_url || undefined} />
                          <AvatarFallback className="bg-gradient-to-br from-accent/20 to-primary/10 text-accent font-bold text-sm">
                            {(profile.full_name || '?').charAt(0)}
                          </AvatarFallback>
                        </Avatar>
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="font-heading font-bold text-sm truncate">{profile.full_name || (isRTL ? 'بدون اسم' : 'No name')}</span>
                            {profile.ref_id && <Badge variant="outline" className="text-[10px] px-1.5 py-0 font-mono"><Hash className="w-2.5 h-2.5 me-0.5" />{profile.ref_id}</Badge>}
                            {isSelf && <Badge variant="secondary" className="text-[10px] px-1.5 py-0">{isRTL ? 'أنت' : 'You'}</Badge>}
                          </div>
                          <div className="flex flex-wrap items-center gap-x-3 mt-0.5">
                            {profile.email && <span className="flex items-center gap-1 text-[11px] text-muted-foreground truncate max-w-[240px]"><Mail className="w-3 h-3 shrink-0" />{profile.email}</span>}
                          </div>
                          <div className="flex items-center gap-1.5 mt-2 flex-wrap">
                            {isSuperRole && <Badge className="text-[10px] gap-1 bg-gradient-to-r from-warning to-urgent text-white border-none"><Crown className="w-2.5 h-2.5" />Super Admin</Badge>}
                            {isAdminRole && <Badge className="text-[10px] gap-1 bg-primary/15 text-primary border border-primary/30"><ShieldCheck className="w-2.5 h-2.5" />Admin</Badge>}
                            {!isAdminRole && !isSuperRole && <Badge variant="outline" className="text-[10px]">{isRTL ? 'مستخدم' : 'User'}</Badge>}
                          </div>
                        </div>
                      </div>

                      {isSuperAdmin && !isSuperRole && (
                        <div className="flex items-center gap-2 shrink-0">
                          {!isAdminRole ? (
                            pending === 'grant' ? (
                              <Button size="sm" className="h-8 gap-1.5 text-xs rounded-xl" disabled={isPendingMutation}
                                onClick={() => grantAdminMutation.mutate(profile.user_id)}>
                                {isPendingMutation ? <Loader2 className="w-3 h-3 animate-spin" /> : <CheckCircle2 className="w-3 h-3" />}
                                {isRTL ? 'تأكيد منح الأدمن' : 'Confirm grant'}
                              </Button>
                            ) : (
                              <Button variant="outline" size="sm" className="h-8 gap-1.5 text-xs rounded-xl"
                                onClick={() => setPendingRoleAction({ userId: profile.user_id, action: 'grant' })}>
                                <ShieldPlus className="w-3 h-3" />
                                {isRTL ? 'تعيين كأدمن' : 'Make Admin'}
                              </Button>
                            )
                          ) : (
                            pending === 'revoke' ? (
                              <Button variant="destructive" size="sm" className="h-8 gap-1.5 text-xs rounded-xl" disabled={isPendingMutation}
                                onClick={() => revokeAdminMutation.mutate(profile.user_id)}>
                                {isPendingMutation ? <Loader2 className="w-3 h-3 animate-spin" /> : <XCircle className="w-3 h-3" />}
                                {isRTL ? 'تأكيد الإزالة' : 'Confirm revoke'}
                              </Button>
                            ) : (
                              <Button variant="outline" size="sm" className="h-8 gap-1.5 text-xs rounded-xl text-destructive border-destructive/40 hover:bg-destructive/10"
                                onClick={() => setPendingRoleAction({ userId: profile.user_id, action: 'revoke' })}>
                                <ShieldMinus className="w-3 h-3" />
                                {isRTL ? 'إزالة الأدمن' : 'Revoke Admin'}
                              </Button>
                            )
                          )}
                        </div>
                      )}
                      {isSuperRole && (
                        <span className="text-[11px] text-muted-foreground shrink-0">{isRTL ? 'محمي — لا يمكن تعديله من الواجهة' : 'Protected — UI cannot modify'}</span>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        ) : (
        <>
        {/* Stats */}
        <div className="grid grid-cols-2 lg:grid-cols-5 gap-3">
          {[
            { icon: Users, label: isRTL ? 'إجمالي الحسابات' : 'Total Accounts', value: stats.total, gradient: 'from-primary/10 to-primary/5', iconBg: 'bg-primary/15 text-primary' },
            { icon: UserCheck, label: isRTL ? 'هاتف موثق' : 'Phone Verified', value: stats.verified, gradient: 'from-success/10 to-success/5', iconBg: 'bg-success/15 text-success' },
            { icon: CheckCircle2, label: isRTL ? 'مكتمل التسجيل' : 'Onboarded', value: stats.onboarded, gradient: 'from-info/10 to-info/5', iconBg: 'bg-info/15 text-info' },
            { icon: Ban, label: isRTL ? 'حسابات معطّلة' : 'Disabled', value: stats.banned, gradient: 'from-destructive/10 to-destructive/5', iconBg: 'bg-destructive/15 text-destructive' },
            { icon: History, label: isRTL ? 'إعادة تعيين (أسبوع)' : 'Resets (7d)', value: stats.recentResets, gradient: 'from-warning/10 to-warning/5', iconBg: 'bg-warning/15 text-warning' },
          ].map((s, i) => (
            <div key={i} className={`relative overflow-hidden rounded-2xl border border-border/30 bg-gradient-to-br ${s.gradient} p-4 transition-all hover:shadow-md group`}>
              <div className="flex items-center gap-3">
                <div className={`w-10 h-10 rounded-xl ${s.iconBg} flex items-center justify-center transition-transform group-hover:scale-110`}>
                  <s.icon className="w-5 h-5" />
                </div>
                <div>
                  <p className="text-2xl font-bold font-heading leading-none">{s.value}</p>
                  <p className="text-[11px] text-muted-foreground mt-0.5">{s.label}</p>
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Search */}
        <div className="rounded-2xl border border-border/30 bg-card p-4">
          <div className="relative">
            <Search className="absolute top-1/2 -translate-y-1/2 text-muted-foreground w-4 h-4" style={{ [isRTL ? 'right' : 'left']: '12px' }} />
            <Input
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
              placeholder={isRTL ? 'بحث بالاسم أو البريد أو الهاتف أو المعرف...' : 'Search by name, email, phone, or ref ID...'}
              className="ps-10 h-10 rounded-xl bg-muted/30 border-border/20 focus:bg-background transition-colors"
            />
          </div>
        </div>

        {/* Accounts List */}
        {loadingProfiles ? (
          <div className="space-y-3">{Array.from({ length: 5 }).map((_, i) => <Skeleton key={i} className="h-20 rounded-2xl" />)}</div>
        ) : filtered.length === 0 ? (
          <div className="rounded-2xl border border-border/30 bg-card p-12 text-center">
            <Shield className="w-10 h-10 mx-auto text-accent/30 mb-3" />
            <p className="text-sm text-muted-foreground">{isRTL ? 'لا توجد نتائج' : 'No results found'}</p>
          </div>
        ) : (
          <div className="space-y-3">
            {filtered.map(profile => {
              const isBanned = profile.is_banned;
              const logs = resetLogsByEmail.get(profile.email?.toLowerCase()) || [];
              const lastReset = logs[0];

              return (
                <div key={profile.id} className={`rounded-2xl border bg-card p-4 transition-all hover:shadow-md ${isBanned ? 'border-destructive/30 opacity-70' : 'border-border/30'}`}>
                  <div className="flex flex-col sm:flex-row sm:items-center gap-4">
                    {/* User info */}
                    <div className="flex items-center gap-3 flex-1 min-w-0">
                      <Avatar className="w-10 h-10 shrink-0 ring-2 ring-border/10">
                        <AvatarImage src={profile.avatar_url || undefined} />
                        <AvatarFallback className="bg-gradient-to-br from-accent/20 to-primary/10 text-accent font-bold text-sm">
                          {(profile.full_name || '?').charAt(0)}
                        </AvatarFallback>
                      </Avatar>
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="font-heading font-bold text-sm truncate">{profile.full_name || (isRTL ? 'بدون اسم' : 'No name')}</span>
                          {profile.ref_id && <Badge variant="outline" className="text-[10px] px-1.5 py-0 font-mono"><Hash className="w-2.5 h-2.5 me-0.5" />{profile.ref_id}</Badge>}
                          {isBanned && <Badge variant="destructive" className="text-[9px] gap-0.5 px-1.5 py-0"><Ban className="w-2.5 h-2.5" />{isRTL ? 'معطّل' : 'Disabled'}</Badge>}
                        </div>
                        <div className="flex flex-wrap items-center gap-x-3 gap-y-0.5 mt-1">
                          {profile.email && <span className="flex items-center gap-1 text-[11px] text-muted-foreground truncate max-w-[200px]"><Mail className="w-3 h-3 shrink-0" />{profile.email}</span>}
                          {profile.phone && <span className="flex items-center gap-1 text-[11px] text-muted-foreground" dir="ltr"><Phone className="w-3 h-3 shrink-0" />{profile.phone}</span>}
                          <span className="flex items-center gap-1 text-[11px] text-muted-foreground"><Calendar className="w-3 h-3 shrink-0" />{formatDate(profile.created_at, language)}</span>
                        </div>
                        {/* Account status badges */}
                        <div className="flex flex-wrap items-center gap-1.5 mt-2">
                          <Badge variant="outline" className={`text-[10px] px-1.5 py-0 ${profile.is_onboarded ? 'border-success text-success dark:text-success' : 'border-warning text-warning dark:text-warning'}`}>
                            {profile.is_onboarded ? (isRTL ? 'مكتمل التسجيل' : 'Onboarded') : (isRTL ? 'لم يكتمل' : 'Not onboarded')}
                          </Badge>
                          <Badge variant="outline" className={`text-[10px] px-1.5 py-0 ${profile.phone_verified ? 'border-success text-success dark:text-success' : 'border-muted text-muted-foreground'}`}>
                            {profile.phone_verified ? (isRTL ? 'هاتف موثق' : 'Phone verified') : (isRTL ? 'هاتف غير موثق' : 'Phone not verified')}
                          </Badge>
                          {lastReset && (() => {
                            const cfg = statusConfig[lastReset.status] || statusConfig.requested;
                            const StatusIcon = cfg.icon;
                            return (
                              <Badge className={`${cfg.color} text-[10px] border px-1.5 py-0 gap-0.5`}>
                                <StatusIcon className="w-2.5 h-2.5" />
                                {isRTL ? `آخر تعيين: ${cfg.labelAr}` : `Last reset: ${cfg.labelEn}`}
                              </Badge>
                            );
                          })()}
                        </div>
                      </div>
                    </div>

                    {/* Actions */}
                    <div className="flex items-center gap-2 shrink-0">
                      <Button
                        variant="outline"
                        size="sm"
                        className="h-8 gap-1.5 text-xs rounded-xl"
                        onClick={() => sendResetMutation.mutate(profile.user_id)}
                        disabled={sendResetMutation.isPending}
                      >
                        {sendResetMutation.isPending ? <Loader2 className="w-3 h-3 animate-spin" /> : <Send className="w-3 h-3" />}
                        {isRTL ? 'إرسال رابط تعيين' : 'Send Reset Link'}
                      </Button>
                    </div>
                  </div>

                  {/* Reset history for this user */}
                  {logs.length > 0 && (
                    <div className="mt-3 pt-3 border-t border-border/20">
                      <p className="text-[11px] font-bold text-muted-foreground mb-2 flex items-center gap-1.5">
                        <KeyRound className="w-3 h-3" />
                        {isRTL ? `سجل إعادة التعيين (${logs.length})` : `Reset history (${logs.length})`}
                      </p>
                      <div className="space-y-1.5 max-h-32 overflow-y-auto">
                        {logs.slice(0, 5).map(log => {
                          const cfg = statusConfig[log.status] || statusConfig.requested;
                          const LogIcon = cfg.icon;
                          return (
                            <div key={log.id} className="flex items-center gap-2 text-[11px] text-muted-foreground">
                              <LogIcon className="w-3 h-3 shrink-0" />
                              <Badge className={`${cfg.color} text-[9px] border px-1.5 py-0`}>{isRTL ? cfg.labelAr : cfg.labelEn}</Badge>
                              <span>{formatDate(log.created_at, language)}</span>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}

        {/* Recent Reset Activity */}
        {!loadingLogs && resetLogs.length > 0 && (
          <div className="rounded-2xl border border-border/30 bg-card p-5">
            <h3 className="font-heading font-bold text-sm flex items-center gap-2 mb-4">
              <div className="w-7 h-7 rounded-lg bg-accent/15 flex items-center justify-center">
                <History className="w-3.5 h-3.5 text-accent" />
              </div>
              {isRTL ? 'آخر عمليات إعادة التعيين' : 'Recent Reset Activity'}
            </h3>
            <div className="space-y-2">
              {resetLogs.slice(0, 15).map(log => {
                const cfg = statusConfig[log.status] || statusConfig.requested;
                const LogIcon = cfg.icon;
                return (
                  <div key={log.id} className="flex items-center gap-3 rounded-xl bg-muted/30 px-3 py-2 text-sm">
                    <LogIcon className="w-4 h-4 shrink-0 text-muted-foreground" />
                    <span className="font-mono text-xs text-muted-foreground truncate max-w-[200px]">{log.email}</span>
                    <Badge className={`${cfg.color} text-[9px] border px-1.5 py-0`}>{isRTL ? cfg.labelAr : cfg.labelEn}</Badge>
                    <span className="text-[11px] text-muted-foreground ms-auto">{formatDate(log.created_at, language)}</span>
                  </div>
                );
              })}
            </div>
          </div>
        )}
        </>
        )}
       </div>
    </DashboardLayout>
  );
};

export default AdminAccessManagement;