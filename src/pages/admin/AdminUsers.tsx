import React, { useState, useMemo, useCallback, useTransition } from 'react';
import { Skeleton } from '@/components/ui/skeleton';
import { DashboardLayout } from '@/components/dashboard/DashboardLayout';
import { useLanguage } from '@/i18n/LanguageContext';
import { useAuth } from '@/contexts/AuthContext';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';
import { Progress } from '@/components/ui/progress';
import { toast } from 'sonner';
import {
  Users, Search, Shield, ShieldCheck, ShieldAlert, UserPlus, Trash2,
  Mail, Phone, Calendar, Crown, Loader2, Pencil, Ban, UserX, Download,
  KeyRound, Send, Lock, Eye, EyeOff, X, AlertTriangle, Check,
  LayoutGrid, LayoutList, TrendingUp, UserCheck, Filter,
  Hash, Sparkles, Building2, Briefcase, Link2, ExternalLink,
} from 'lucide-react';
import type { Tables } from '@/integrations/supabase/types';

type Profile = Tables<'profiles'>;
type UserRole = Tables<'user_roles'>;

interface BusinessInfo {
  id: string;
  user_id: string;
  name_ar: string;
  name_en: string | null;
  ref_id: string;
  username: string;
  is_active: boolean;
  is_verified: boolean;
  membership_tier: string;
  business_number: number;
}

const roleConfig = {
  super_admin: { icon: ShieldAlert, gradient: 'from-purple-500/15 to-purple-500/5', iconBg: 'bg-purple-500/15 text-purple-600 dark:text-purple-400', badge: 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400 border-purple-200 dark:border-purple-800', labelAr: 'مشرف أعلى', labelEn: 'Super Admin' },
  admin: { icon: Crown, gradient: 'from-red-500/15 to-red-500/5', iconBg: 'bg-red-500/15 text-red-600 dark:text-red-400', badge: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400 border-red-200 dark:border-red-800', labelAr: 'مشرف', labelEn: 'Admin' },
  moderator: { icon: ShieldCheck, gradient: 'from-amber-500/15 to-amber-500/5', iconBg: 'bg-amber-500/15 text-amber-600 dark:text-amber-400', badge: 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400 border-amber-200 dark:border-amber-800', labelAr: 'مشرف محتوى', labelEn: 'Moderator' },
  user: { icon: Users, gradient: 'from-blue-500/15 to-blue-500/5', iconBg: 'bg-blue-500/15 text-blue-600 dark:text-blue-400', badge: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400 border-blue-200 dark:border-blue-800', labelAr: 'مستخدم', labelEn: 'User' },
};

const tierConfig = {
  free: { labelAr: 'مجاني', labelEn: 'Free', color: 'bg-muted text-muted-foreground border-border' },
  basic: { labelAr: 'أساسي', labelEn: 'Basic', color: 'bg-blue-50 text-blue-700 dark:bg-blue-900/20 dark:text-blue-400 border-blue-200 dark:border-blue-800' },
  premium: { labelAr: 'مميز', labelEn: 'Premium', color: 'bg-accent/10 text-accent border-accent/30' },
  enterprise: { labelAr: 'مؤسسات', labelEn: 'Enterprise', color: 'bg-purple-50 text-purple-700 dark:bg-purple-900/20 dark:text-purple-400 border-purple-200 dark:border-purple-800' },
};

const accountTypeConfig: Record<string, { labelAr: string; labelEn: string; icon: React.ElementType; color: string }> = {
  individual: { labelAr: 'فرد', labelEn: 'Individual', icon: Users, color: 'text-blue-600 bg-blue-500/10 border-blue-200 dark:border-blue-800' },
  business: { labelAr: 'مزود خدمة', labelEn: 'Provider', icon: Briefcase, color: 'text-emerald-600 bg-emerald-500/10 border-emerald-200 dark:border-emerald-800' },
  company: { labelAr: 'شركة', labelEn: 'Company', icon: Building2, color: 'text-purple-600 bg-purple-500/10 border-purple-200 dark:border-purple-800' },
};

type ActivePanel =
  | null
  | { type: 'edit'; profile: Profile }
  | { type: 'password'; userId: string; userName: string }
  | { type: 'delete'; userId: string; userName: string };

/** Safe date formatter — returns fallback for invalid/missing dates */
const formatDate = (dateStr: string | null | undefined, lang: string): string => {
  if (!dateStr) return lang === 'ar' ? 'غير محدد' : 'N/A';
  const d = new Date(dateStr);
  if (isNaN(d.getTime())) return lang === 'ar' ? 'غير محدد' : 'N/A';
  return d.toLocaleDateString(lang === 'ar' ? 'ar-SA' : 'en', { year: 'numeric', month: 'short', day: 'numeric' });
};

/* ─── Stat Card ─── */
const StatCard = React.memo(({ icon: Icon, label, value, gradient, iconBg, percentage }: {
  icon: React.ElementType; label: string; value: number; gradient: string; iconBg: string; percentage?: number;
}) => (
  <div className={`relative overflow-hidden rounded-2xl border border-border/30 bg-gradient-to-br ${gradient} p-4 transition-all hover:shadow-md group`}>
    <div className="flex items-center gap-3">
      <div className={`w-10 h-10 rounded-xl ${iconBg} flex items-center justify-center transition-transform group-hover:scale-110`}>
        <Icon className="w-5 h-5" />
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-2xl font-bold font-heading leading-none">{value}</p>
        <p className="text-[11px] text-muted-foreground mt-0.5 truncate">{label}</p>
      </div>
    </div>
    {percentage !== undefined && (
      <div className="mt-2.5">
        <Progress value={percentage} className="h-1.5" />
      </div>
    )}
  </div>
));
StatCard.displayName = 'StatCard';

/* ─── User Card (memo) ─── */
const UserCard = React.memo(({ profile, roles, business, isCurrentUser, canManageUser, isSuperAdmin, isRTL, language,
  onEdit, onPassword, onToggleBan, onDelete, onAddRole, onRemoveRole, addingRoleFor, selectedRole, setSelectedRole, addRoleMutation, setAddingRoleFor,
}: any) => {
  const tier = tierConfig[profile.membership_tier as keyof typeof tierConfig] || tierConfig.free;
  const accType = accountTypeConfig[profile.account_type as keyof typeof accountTypeConfig] || accountTypeConfig.individual;
  const AccIcon = accType.icon;
  const createdDate = formatDate(profile.created_at, language);
  const isBanned = (profile as any).is_banned;
  const bizList = (business as BusinessInfo[] | null) || [];

  const highestRole = roles.length > 0
    ? roles.reduce((best: any, r: any) => {
        const order = ['super_admin', 'admin', 'moderator', 'user'];
        return order.indexOf(r.role) < order.indexOf(best.role) ? r : best;
      })
    : null;
  const highestCfg = highestRole ? roleConfig[highestRole.role as keyof typeof roleConfig] : null;

  return (
    <div className={`group relative rounded-2xl border bg-card transition-all duration-200 hover:shadow-md
      ${isCurrentUser ? 'border-accent/40 ring-1 ring-accent/20' : 'border-border/30'}
      ${isBanned ? 'opacity-60 border-destructive/40' : ''}`}>
      <div className="p-4">
        <div className="flex flex-col sm:flex-row sm:items-start gap-4">
          {/* Avatar & basic info */}
          <div className="flex items-start gap-3 flex-1 min-w-0">
            <div className="relative">
              <Avatar className={`w-12 h-12 shrink-0 ring-2 ${isCurrentUser ? 'ring-accent/30' : 'ring-border/10'}`}>
                <AvatarImage src={profile.avatar_url || undefined} />
                <AvatarFallback className="bg-gradient-to-br from-accent/20 to-primary/10 text-accent font-bold text-sm">
                  {(profile.full_name || '?').charAt(0)}
                </AvatarFallback>
              </Avatar>
              {highestCfg && (
                <div className={`absolute -bottom-1 -end-1 w-5 h-5 rounded-full ${highestCfg.iconBg} flex items-center justify-center ring-2 ring-card`}>
                  <highestCfg.icon className="w-2.5 h-2.5" />
                </div>
              )}
            </div>
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2 flex-wrap">
                <h3 className="font-heading font-bold text-foreground truncate text-sm">
                  {profile.full_name || (isRTL ? 'بدون اسم' : 'No name')}
                </h3>
                {isCurrentUser && (
                  <Badge variant="outline" className="text-[9px] border-accent text-accent px-1.5 py-0">{isRTL ? 'أنت' : 'You'}</Badge>
                )}
                {isBanned && (
                  <Badge variant="destructive" className="text-[9px] gap-0.5 px-1.5 py-0"><Ban className="w-2.5 h-2.5" />{isRTL ? 'معطّل' : 'Disabled'}</Badge>
                )}
              </div>

              {/* Contact info */}
              <div className="flex flex-wrap items-center gap-x-3 gap-y-0.5 mt-1">
                {profile.email && (
                  <span className="flex items-center gap-1 text-[11px] text-muted-foreground truncate max-w-[200px]">
                    <Mail className="w-3 h-3 shrink-0" /> {profile.email}
                  </span>
                )}
                {profile.phone && (
                  <span className="flex items-center gap-1 text-[11px] text-muted-foreground" dir="ltr">
                    <Phone className="w-3 h-3 shrink-0" /> {profile.phone}
                  </span>
                )}
                <span className="flex items-center gap-1 text-[11px] text-muted-foreground">
                  <Calendar className="w-3 h-3 shrink-0" /> {createdDate}
                </span>
              </div>

              {/* Badges row */}
              <div className="flex flex-wrap items-center gap-1.5 mt-2">
                <Badge className={`${tier.color} text-[10px] border px-1.5 py-0`}>{isRTL ? tier.labelAr : tier.labelEn}</Badge>
                <Badge className={`${accType.color} text-[10px] border px-1.5 py-0 gap-0.5`}>
                  <AccIcon className="w-2.5 h-2.5" /> {isRTL ? accType.labelAr : accType.labelEn}
                </Badge>
                {profile.ref_id && (
                  <Badge variant="outline" className="text-[10px] px-1.5 py-0 gap-0.5 font-mono">
                    <Hash className="w-2.5 h-2.5" />{profile.ref_id}
                  </Badge>
                )}
                {/* Role badges */}
                {roles.map((r: any) => {
                  const cfg = roleConfig[r.role as keyof typeof roleConfig] || roleConfig.user;
                  const RoleIcon = cfg.icon;
                  return (
                    <div key={r.id} className="flex items-center">
                      <Badge className={`${cfg.badge} gap-0.5 text-[10px] border px-1.5 py-0`}>
                        <RoleIcon className="w-2.5 h-2.5" />{isRTL ? cfg.labelAr : cfg.labelEn}
                      </Badge>
                      {!isCurrentUser && isSuperAdmin && (
                        <button onClick={() => onRemoveRole(r.id)} className="ms-0.5 p-0.5 rounded hover:bg-destructive/10 text-destructive/60 hover:text-destructive transition-colors">
                          <X className="w-3 h-3" />
                        </button>
                      )}
                    </div>
                  );
                })}
                {roles.length === 0 && (
                  <Badge variant="outline" className="text-[10px] px-1.5 py-0 text-muted-foreground border-dashed">
                    <Shield className="w-2.5 h-2.5 me-0.5" />{isRTL ? 'عضو عادي' : 'Member'}
                  </Badge>
                )}
              </div>

              {/* ─── Business Cards (linked entities) ─── */}
              {bizList.length > 0 && (
                <div className="mt-2.5 space-y-1.5">
                  {bizList.map(biz => (
                    <div key={biz.id} className="flex items-center gap-2 rounded-xl bg-muted/40 border border-border/30 px-3 py-2">
                      <Building2 className="w-4 h-4 text-emerald-600 shrink-0" />
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <span className="text-xs font-bold text-foreground truncate">{isRTL ? biz.name_ar : (biz.name_en || biz.name_ar)}</span>
                          {biz.is_verified && <Check className="w-3 h-3 text-emerald-500" />}
                        </div>
                        <div className="flex items-center gap-2 mt-0.5 flex-wrap">
                          <span className="text-[10px] font-mono text-accent flex items-center gap-0.5">
                            <Link2 className="w-2.5 h-2.5" />{biz.ref_id}
                          </span>
                          <span className="text-[10px] text-muted-foreground">@{biz.username}</span>
                        </div>
                      </div>
                      <Badge variant="outline" className="text-[9px] px-1.5 py-0 shrink-0">
                        {isRTL ? 'مالك' : 'Owner'}
                      </Badge>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Actions */}
          <div className="flex items-center gap-1.5 flex-wrap sm:flex-nowrap shrink-0">
            <Button variant="outline" size="sm" className="h-8 gap-1.5 text-xs rounded-xl" onClick={() => onEdit(profile)}>
              <Pencil className="w-3 h-3" />{isRTL ? 'تعديل' : 'Edit'}
            </Button>
            {canManageUser && (
              <>
                {isSuperAdmin && (
                  <Button variant="outline" size="sm" className="h-8 gap-1.5 text-xs rounded-xl"
                    onClick={() => onPassword(profile)}>
                    <KeyRound className="w-3 h-3" />{isRTL ? 'كلمة المرور' : 'Password'}
                  </Button>
                )}
                <Button variant="outline" size="sm"
                  className={`h-8 gap-1.5 text-xs rounded-xl ${isBanned ? 'text-emerald-600 hover:text-emerald-700 border-emerald-200' : 'text-amber-600 hover:text-amber-700 border-amber-200'}`}
                  onClick={() => onToggleBan(profile)}>
                  {isBanned ? <UserCheck className="w-3 h-3" /> : <Ban className="w-3 h-3" />}
                  {isBanned ? (isRTL ? 'تفعيل' : 'Enable') : (isRTL ? 'تعطيل' : 'Disable')}
                </Button>
                <Button variant="outline" size="sm" className="h-8 gap-1.5 text-xs rounded-xl text-destructive hover:text-destructive border-destructive/30"
                  onClick={() => onDelete(profile)}>
                  <UserX className="w-3 h-3" />{isRTL ? 'حذف' : 'Delete'}
                </Button>
              </>
            )}
            {/* Add role inline */}
            {isSuperAdmin && (addingRoleFor === profile.user_id ? (
              <div className="flex items-center gap-1">
                <Select value={selectedRole} onValueChange={setSelectedRole}>
                  <SelectTrigger className="h-8 w-28 text-xs rounded-xl"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="super_admin">{isRTL ? 'مشرف أعلى' : 'Super Admin'}</SelectItem>
                    <SelectItem value="admin">{isRTL ? 'مشرف' : 'Admin'}</SelectItem>
                    <SelectItem value="moderator">{isRTL ? 'مشرف محتوى' : 'Moderator'}</SelectItem>
                    <SelectItem value="user">{isRTL ? 'مستخدم' : 'User'}</SelectItem>
                  </SelectContent>
                </Select>
                <Button size="sm" className="h-8 w-8 p-0 rounded-xl"
                  onClick={() => onAddRole(profile.user_id)} disabled={addRoleMutation.isPending}>
                  {addRoleMutation.isPending ? <Loader2 className="w-3 h-3 animate-spin" /> : <Check className="w-3 h-3" />}
                </Button>
                <Button variant="ghost" size="sm" className="h-8 w-8 p-0 rounded-xl" onClick={() => setAddingRoleFor(null)}>
                  <X className="w-3 h-3" />
                </Button>
              </div>
            ) : (
              <Button variant="outline" size="sm" className="h-8 gap-1.5 text-xs rounded-xl"
                onClick={() => { setAddingRoleFor(profile.user_id); setSelectedRole('user'); }}>
                <UserPlus className="w-3 h-3" />{isRTL ? 'صلاحية' : 'Role'}
              </Button>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
});
UserCard.displayName = 'UserCard';

/* ─── Main Component ─── */
const AdminUsers = () => {
  const { isRTL, language } = useLanguage();
  const { user, isSuperAdmin } = useAuth();
  const queryClient = useQueryClient();
  const [, startTransition] = useTransition();

  const [searchTerm, setSearchTerm] = useState('');
  const [deferredSearch, setDeferredSearch] = useState('');
  const [filterRole, setFilterRole] = useState<string>('all');
  const [filterAccountType, setFilterAccountType] = useState<string>('all');
  const [addingRoleFor, setAddingRoleFor] = useState<string | null>(null);
  const [selectedRole, setSelectedRole] = useState<string>('user');
  const [viewMode, setViewMode] = useState<'list' | 'grid'>('list');

  const [activePanel, setActivePanel] = useState<ActivePanel>(null);
  const [editForm, setEditForm] = useState({ full_name: '', account_type: '', membership_tier: '', phone: '', email: '' });
  const [newPassword, setNewPassword] = useState('');
  const [showNewPassword, setShowNewPassword] = useState(false);

  const closePanel = () => { setActivePanel(null); setNewPassword(''); setShowNewPassword(false); };

  const handleSearchChange = useCallback((val: string) => {
    setSearchTerm(val);
    startTransition(() => setDeferredSearch(val));
  }, []);

  // ─── Queries ───
  const { data: profiles = [], isLoading: loadingProfiles } = useQuery({
    queryKey: ['admin-profiles'],
    queryFn: async () => {
      const { data, error } = await supabase.from('profiles').select('*').order('created_at', { ascending: false });
      if (error) throw error;
      return data as Profile[];
    },
    enabled: !!user,
  });

  const { data: userRoles = [], isLoading: loadingRoles } = useQuery({
    queryKey: ['admin-user-roles'],
    queryFn: async () => {
      const { data, error } = await supabase.from('user_roles').select('*');
      if (error) throw error;
      return data as UserRole[];
    },
    enabled: !!user,
  });

  const { data: businesses = [] } = useQuery({
    queryKey: ['admin-businesses-map'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('businesses')
        .select('id, user_id, name_ar, name_en, ref_id, username, is_active, is_verified, membership_tier, business_number');
      if (error) throw error;
      return data as BusinessInfo[];
    },
    enabled: !!user,
  });

  // ─── Business map by user_id (supports multiple businesses per user) ───
  const businessMap = useMemo(() => {
    const map = new Map<string, BusinessInfo[]>();
    businesses.forEach(b => {
      const arr = map.get(b.user_id) || [];
      arr.push(b);
      map.set(b.user_id, arr);
    });
    return map;
  }, [businesses]);

  // ─── Mutations ───
  const addRoleMutation = useMutation({
    mutationFn: async ({ userId, role }: { userId: string; role: string }) => {
      const { error } = await supabase.from('user_roles').insert({ user_id: userId, role: role as any });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-user-roles'] });
      setAddingRoleFor(null);
      toast.success(isRTL ? 'تم إضافة الصلاحية بنجاح' : 'Role added successfully');
    },
    onError: (err: any) => {
      toast.error(err.message?.includes('duplicate')
        ? (isRTL ? 'هذه الصلاحية موجودة بالفعل' : 'Role already exists')
        : (isRTL ? 'فشل إضافة الصلاحية' : 'Failed to add role'));
    },
  });

  const removeRoleMutation = useMutation({
    mutationFn: async (roleId: string) => {
      const { error } = await supabase.from('user_roles').delete().eq('id', roleId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-user-roles'] });
      toast.success(isRTL ? 'تم إزالة الصلاحية' : 'Role removed');
    },
    onError: () => toast.error(isRTL ? 'فشل إزالة الصلاحية' : 'Failed to remove role'),
  });

  const updateProfileMutation = useMutation({
    mutationFn: async ({ profileId, userId, data, oldData }: { profileId: string; userId: string; data: Partial<Profile>; oldData: Partial<Profile> }) => {
      const { error } = await supabase.from('profiles').update(data).eq('id', profileId);
      if (error) throw error;
      const changes: Record<string, { old: any; new: any }> = {};
      for (const key of Object.keys(data) as (keyof typeof data)[]) {
        if (data[key] !== oldData[key]) changes[key] = { old: oldData[key], new: data[key] };
      }
      if (Object.keys(changes).length > 0) {
        await supabase.from('admin_activity_log').insert({
          user_id: user!.id, action: 'update', entity_type: 'user', entity_id: userId,
          details: { target_user_id: userId, changes },
        });
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-profiles'] });
      closePanel();
      toast.success(isRTL ? 'تم تحديث بيانات المستخدم بنجاح' : 'User profile updated successfully');
    },
    onError: () => toast.error(isRTL ? 'فشل تحديث البيانات' : 'Failed to update profile'),
  });

  const toggleBanMutation = useMutation({
    mutationFn: async ({ profileId, userId, isBanned }: { profileId: string; userId: string; isBanned: boolean }) => {
      const { error } = await supabase.from('profiles').update({ is_banned: isBanned } as any).eq('id', profileId);
      if (error) throw error;
      await supabase.from('admin_activity_log').insert({
        user_id: user!.id, action: isBanned ? 'user_disabled' : 'user_enabled',
        entity_type: 'user', entity_id: userId, details: { target_user_id: userId, is_banned: isBanned },
      });
    },
    onSuccess: (_, vars) => {
      queryClient.invalidateQueries({ queryKey: ['admin-profiles'] });
      toast.success(vars.isBanned ? (isRTL ? 'تم تعطيل الحساب' : 'Account disabled') : (isRTL ? 'تم تفعيل الحساب' : 'Account enabled'));
    },
    onError: () => toast.error(isRTL ? 'فشل تحديث حالة الحساب' : 'Failed to update account status'),
  });

  const changePasswordMutation = useMutation({
    mutationFn: async ({ targetUserId, password }: { targetUserId: string; password: string }) => {
      const res = await supabase.functions.invoke('admin-reset-password', {
        body: { target_user_id: targetUserId, action: 'change_password', new_password: password },
      });
      if (res.error) throw res.error;
      if (res.data?.error) throw new Error(res.data.error);
    },
    onSuccess: () => {
      closePanel();
      toast.success(isRTL ? 'تم تغيير كلمة المرور بنجاح' : 'Password changed successfully');
    },
    onError: (err: Error) => toast.error(err.message || (isRTL ? 'فشل تغيير كلمة المرور' : 'Failed to change password')),
  });

  const sendResetLinkMutation = useMutation({
    mutationFn: async (targetUserId: string) => {
      const res = await supabase.functions.invoke('admin-reset-password', {
        body: { target_user_id: targetUserId, action: 'send_reset_link' },
      });
      if (res.error) throw res.error;
      if (res.data?.error) throw new Error(res.data.error);
    },
    onSuccess: () => toast.success(isRTL ? 'تم إرسال رابط إعادة تعيين كلمة المرور' : 'Password reset link sent'),
    onError: (err: Error) => toast.error(err.message || (isRTL ? 'فشل إرسال الرابط' : 'Failed to send reset link')),
  });

  const deleteUserMutation = useMutation({
    mutationFn: async (targetUserId: string) => {
      const res = await supabase.functions.invoke('admin-delete-user', { body: { target_user_id: targetUserId } });
      if (res.error) throw res.error;
      if (res.data?.error) throw new Error(res.data.error);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-profiles'] });
      queryClient.invalidateQueries({ queryKey: ['admin-user-roles'] });
      closePanel();
      toast.success(isRTL ? 'تم حذف الحساب بنجاح' : 'Account deleted successfully');
    },
    onError: () => toast.error(isRTL ? 'فشل حذف الحساب' : 'Failed to delete account'),
  });

  // ─── Handlers ───
  const openEdit = useCallback((profile: Profile) => {
    setActivePanel({ type: 'edit', profile });
    setEditForm({
      full_name: profile.full_name || '', account_type: profile.account_type || 'individual',
      membership_tier: profile.membership_tier || 'free', phone: profile.phone || '', email: profile.email || '',
    });
  }, []);

  const handleSaveProfile = () => {
    if (activePanel?.type !== 'edit') return;
    const p = activePanel.profile;
    const trimmed = editForm.full_name.trim();
    if (!trimmed) { toast.error(isRTL ? 'الاسم مطلوب' : 'Name is required'); return; }
    updateProfileMutation.mutate({
      profileId: p.id, userId: p.user_id,
      data: { full_name: trimmed, account_type: editForm.account_type as any, membership_tier: editForm.membership_tier as any, phone: editForm.phone.trim() || null, email: editForm.email.trim() || null },
      oldData: { full_name: p.full_name, account_type: p.account_type, membership_tier: p.membership_tier, phone: p.phone, email: p.email },
    });
  };

  // ─── Computed ───
  const roleMap = useMemo(() => {
    const map = new Map<string, UserRole[]>();
    userRoles.forEach(r => { const arr = map.get(r.user_id) || []; arr.push(r); map.set(r.user_id, arr); });
    return map;
  }, [userRoles]);

  const filtered = useMemo(() => profiles.filter(p => {
    const lowerSearch = deferredSearch.toLowerCase();
    const bizList = businessMap.get(p.user_id) || [];
    const matchesSearch = !deferredSearch
      || p.full_name?.toLowerCase().includes(lowerSearch)
      || p.email?.toLowerCase().includes(lowerSearch)
      || p.phone?.includes(deferredSearch)
      || p.ref_id?.toLowerCase().includes(lowerSearch)
      || bizList.some(b => b.ref_id?.toLowerCase().includes(lowerSearch))
      || bizList.some(b => b.name_ar?.toLowerCase().includes(lowerSearch))
      || bizList.some(b => b.username?.toLowerCase().includes(lowerSearch));
    const roles = roleMap.get(p.user_id) || [];
    const matchesRole = filterRole === 'all' || (filterRole === 'no_role' && roles.length === 0) || roles.some(r => r.role === filterRole);
    const matchesType = filterAccountType === 'all' || p.account_type === filterAccountType;
    return matchesSearch && matchesRole && matchesType;
  }), [profiles, deferredSearch, filterRole, filterAccountType, roleMap, businessMap]);

  const stats = useMemo(() => {
    const totalUsers = profiles.length;
    const superAdmins = userRoles.filter(r => r.role === 'super_admin').length;
    const admins = userRoles.filter(r => r.role === 'admin').length;
    const moderators = userRoles.filter(r => r.role === 'moderator').length;
    const bannedCount = profiles.filter(p => (p as any).is_banned).length;
    const providers = profiles.filter(p => p.account_type === 'business' || p.account_type === 'company').length;
    const tierDist = { free: 0, basic: 0, premium: 0, enterprise: 0 };
    profiles.forEach(p => {
      const t = p.membership_tier as keyof typeof tierDist;
      if (t in tierDist) tierDist[t]++;
    });
    const weekAgo = Date.now() - 7 * 24 * 60 * 60 * 1000;
    const recentUsers = profiles.filter(p => {
      const d = new Date(p.created_at);
      return !isNaN(d.getTime()) && d.getTime() > weekAgo;
    }).length;
    return { totalUsers, superAdmins, admins, moderators, bannedCount, tierDist, recentUsers, providers };
  }, [profiles, userRoles]);

  const exportCSV = () => {
    const headers = ['Ref ID', 'Name', 'Email', 'Phone', 'Account Type', 'Business Ref', 'Business Name', 'Membership', 'Roles', 'Banned', 'Created At'];
    const rows = filtered.map(p => {
      const roles = (roleMap.get(p.user_id) || []).map(r => r.role).join(', ') || 'none';
      const accType = accountTypeConfig[p.account_type as keyof typeof accountTypeConfig]?.labelEn || p.account_type;
      const tier = tierConfig[p.membership_tier as keyof typeof tierConfig]?.labelEn || p.membership_tier;
      const bizList = businessMap.get(p.user_id) || [];
      const bizRefs = bizList.map(b => b.ref_id).join(' | ');
      const bizNames = bizList.map(b => b.name_ar).join(' | ');
      const createdAt = p.created_at ? new Date(p.created_at) : null;
      const createdStr = createdAt && !isNaN(createdAt.getTime()) ? createdAt.toISOString().split('T')[0] : '';
      return [p.ref_id || '', p.full_name || '', p.email || '', p.phone || '', accType, bizRefs, bizNames, tier, roles, (p as any).is_banned ? 'Yes' : 'No', createdStr]
        .map(v => `"${String(v).replace(/"/g, '""')}"`).join(',');
    });
    const csv = '\uFEFF' + [headers.join(','), ...rows].join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a'); a.href = url; a.download = `users_${new Date().toISOString().split('T')[0]}.csv`; a.click();
    URL.revokeObjectURL(url);
    toast.success(isRTL ? 'تم تصدير القائمة بنجاح' : 'Users exported successfully');
  };

  if (!user) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center h-96">
          <p className="text-muted-foreground">{isRTL ? 'يرجى تسجيل الدخول' : 'Please log in'}</p>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* ─── Header ─── */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div>
            <h1 className="font-heading font-bold text-2xl text-foreground flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-accent/20 to-primary/10 flex items-center justify-center shadow-sm">
                <Users className="w-5 h-5 text-accent" />
              </div>
              {isRTL ? 'إدارة المستخدمين والصلاحيات' : 'Users & Roles Management'}
            </h1>
            <p className="text-muted-foreground font-body mt-1 text-sm">
              {isRTL ? `${stats.totalUsers} مستخدم مسجّل • ${stats.providers} مزود خدمة • ${stats.recentUsers} جديد هذا الأسبوع` : `${stats.totalUsers} users • ${stats.providers} providers • ${stats.recentUsers} new this week`}
            </p>
          </div>
          <div className="flex items-center gap-2">
            <div className="flex bg-muted/50 border border-border/30 rounded-xl overflow-hidden p-0.5">
              <button className={`p-2 rounded-lg transition-all ${viewMode === 'list' ? 'bg-card shadow-sm text-foreground' : 'text-muted-foreground hover:text-foreground'}`}
                onClick={() => setViewMode('list')}><LayoutList className="w-4 h-4" /></button>
              <button className={`p-2 rounded-lg transition-all ${viewMode === 'grid' ? 'bg-card shadow-sm text-foreground' : 'text-muted-foreground hover:text-foreground'}`}
                onClick={() => setViewMode('grid')}><LayoutGrid className="w-4 h-4" /></button>
            </div>
            <Button variant="outline" onClick={exportCSV} className="gap-2 rounded-xl h-9">
              <Download className="w-4 h-4" />
              <span className="hidden sm:inline">{isRTL ? 'تصدير' : 'Export'}</span>
            </Button>
          </div>
        </div>

        {/* ─── Stats Grid ─── */}
        <div className="grid grid-cols-2 lg:grid-cols-6 gap-3">
          <StatCard icon={Users} label={isRTL ? 'إجمالي المستخدمين' : 'Total Users'} value={stats.totalUsers} gradient="from-primary/10 to-primary/5" iconBg="bg-primary/15 text-primary" />
          <StatCard icon={Briefcase} label={isRTL ? 'مزودي الخدمات' : 'Providers'} value={stats.providers} gradient="from-emerald-500/10 to-emerald-500/5" iconBg="bg-emerald-500/15 text-emerald-600" percentage={stats.totalUsers ? (stats.providers / stats.totalUsers) * 100 : 0} />
          <StatCard icon={ShieldAlert} label={isRTL ? 'مشرف أعلى' : 'Super Admins'} value={stats.superAdmins} gradient="from-purple-500/10 to-purple-500/5" iconBg="bg-purple-500/15 text-purple-600" />
          <StatCard icon={Crown} label={isRTL ? 'المشرفين' : 'Admins'} value={stats.admins} gradient="from-red-500/10 to-red-500/5" iconBg="bg-red-500/15 text-red-600" />
          <StatCard icon={ShieldCheck} label={isRTL ? 'مشرفي المحتوى' : 'Moderators'} value={stats.moderators} gradient="from-amber-500/10 to-amber-500/5" iconBg="bg-amber-500/15 text-amber-600" />
          <StatCard icon={TrendingUp} label={isRTL ? 'جديد هذا الأسبوع' : 'New This Week'} value={stats.recentUsers} gradient="from-blue-500/10 to-blue-500/5" iconBg="bg-blue-500/15 text-blue-600" />
        </div>

        {/* ─── Membership Distribution ─── */}
        <div className="rounded-2xl border border-border/30 bg-card p-4">
          <div className="flex items-center justify-between mb-3">
            <h3 className="font-heading font-bold text-sm flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-accent" />
              {isRTL ? 'توزيع العضويات' : 'Membership Distribution'}
            </h3>
            {stats.bannedCount > 0 && (
              <Badge variant="destructive" className="text-[10px] gap-1">
                <Ban className="w-3 h-3" /> {stats.bannedCount} {isRTL ? 'معطّل' : 'disabled'}
              </Badge>
            )}
          </div>
          <div className="flex h-3 rounded-full overflow-hidden bg-muted/50">
            {Object.entries(stats.tierDist).map(([tier, count]) => {
              if (count === 0) return null;
              const pct = (count / stats.totalUsers) * 100;
              const colors: Record<string, string> = { free: 'bg-muted-foreground/30', basic: 'bg-blue-500', premium: 'bg-accent', enterprise: 'bg-purple-500' };
              return <div key={tier} className={`${colors[tier]} transition-all`} style={{ width: `${pct}%` }} title={`${tier}: ${count}`} />;
            })}
          </div>
          <div className="flex flex-wrap gap-3 mt-2">
            {Object.entries(stats.tierDist).map(([tier, count]) => {
              const cfg = tierConfig[tier as keyof typeof tierConfig];
              return (
                <span key={tier} className="text-[11px] text-muted-foreground flex items-center gap-1">
                  <span className={`w-2.5 h-2.5 rounded-full ${tier === 'free' ? 'bg-muted-foreground/30' : tier === 'basic' ? 'bg-blue-500' : tier === 'premium' ? 'bg-accent' : 'bg-purple-500'}`} />
                  {isRTL ? cfg.labelAr : cfg.labelEn}: {count}
                </span>
              );
            })}
          </div>
        </div>

        {/* ─── Search & Filter ─── */}
        <div className="rounded-2xl border border-border/30 bg-card p-4">
          <div className="flex flex-col md:flex-row gap-3">
            <div className="relative flex-1">
              <Search className="absolute top-1/2 -translate-y-1/2 text-muted-foreground w-4 h-4" style={{ [isRTL ? 'right' : 'left']: '12px' }} />
              <Input
                value={searchTerm}
                onChange={e => handleSearchChange(e.target.value)}
                placeholder={isRTL ? 'بحث بالاسم أو البريد أو الهاتف أو المفتاح التعريفي...' : 'Search name, email, phone, or ref ID...'}
                className="ps-10 h-10 rounded-xl bg-muted/30 border-border/20 focus:bg-background transition-colors"
              />
            </div>
            <Select value={filterRole} onValueChange={setFilterRole}>
              <SelectTrigger className="w-full md:w-44 h-10 rounded-xl">
                <Filter className="w-4 h-4 me-2 text-muted-foreground" />
                <SelectValue />
              </SelectTrigger>
              <SelectContent className="rounded-xl">
                <SelectItem value="all">{isRTL ? 'جميع الصلاحيات' : 'All Roles'}</SelectItem>
                <SelectItem value="super_admin">{isRTL ? 'مشرف أعلى' : 'Super Admin'}</SelectItem>
                <SelectItem value="admin">{isRTL ? 'المشرفين' : 'Admins'}</SelectItem>
                <SelectItem value="moderator">{isRTL ? 'مشرفي المحتوى' : 'Moderators'}</SelectItem>
                <SelectItem value="user">{isRTL ? 'مستخدم عادي' : 'Regular User'}</SelectItem>
                <SelectItem value="no_role">{isRTL ? 'بدون صلاحيات' : 'No Role'}</SelectItem>
              </SelectContent>
            </Select>
            <Select value={filterAccountType} onValueChange={setFilterAccountType}>
              <SelectTrigger className="w-full md:w-44 h-10 rounded-xl">
                <Building2 className="w-4 h-4 me-2 text-muted-foreground" />
                <SelectValue />
              </SelectTrigger>
              <SelectContent className="rounded-xl">
                <SelectItem value="all">{isRTL ? 'جميع الأنواع' : 'All Types'}</SelectItem>
                <SelectItem value="individual">{isRTL ? 'أفراد' : 'Individuals'}</SelectItem>
                <SelectItem value="business">{isRTL ? 'مزودي خدمات' : 'Providers'}</SelectItem>
                <SelectItem value="company">{isRTL ? 'شركات' : 'Companies'}</SelectItem>
              </SelectContent>
            </Select>
          </div>
          {/* Active filters */}
          {(filterRole !== 'all' || filterAccountType !== 'all' || deferredSearch) && (
            <div className="flex items-center gap-2 mt-3 pt-3 border-t border-border/20">
              <span className="text-[11px] text-muted-foreground">{isRTL ? 'النتائج:' : 'Results:'} {filtered.length}</span>
              {filterRole !== 'all' && (
                <Badge variant="secondary" className="text-[10px] gap-1 cursor-pointer rounded-lg" onClick={() => setFilterRole('all')}>
                  {filterRole} <X className="w-2.5 h-2.5" />
                </Badge>
              )}
              {filterAccountType !== 'all' && (
                <Badge variant="secondary" className="text-[10px] gap-1 cursor-pointer rounded-lg" onClick={() => setFilterAccountType('all')}>
                  {accountTypeConfig[filterAccountType]?.labelAr || filterAccountType} <X className="w-2.5 h-2.5" />
                </Badge>
              )}
              {deferredSearch && (
                <Badge variant="secondary" className="text-[10px] gap-1 cursor-pointer rounded-lg" onClick={() => { setSearchTerm(''); setDeferredSearch(''); }}>
                  "{deferredSearch}" <X className="w-2.5 h-2.5" />
                </Badge>
              )}
            </div>
          )}
        </div>

        {/* ═══ Inline Edit Panel ═══ */}
        {activePanel?.type === 'edit' && (
          <div className="rounded-2xl border border-accent/30 bg-gradient-to-r from-accent/5 to-transparent p-5 animate-in slide-in-from-top-2 duration-200">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-heading font-bold text-lg flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg bg-accent/15 flex items-center justify-center">
                  <Pencil className="w-4 h-4 text-accent" />
                </div>
                {isRTL ? 'تعديل بيانات المستخدم' : 'Edit User Profile'}
                {activePanel.profile.ref_id && (
                  <Badge variant="outline" className="font-mono text-xs">{activePanel.profile.ref_id}</Badge>
                )}
              </h3>
              <Button variant="ghost" size="icon" onClick={closePanel} className="rounded-xl"><X className="w-4 h-4" /></Button>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              <div className="space-y-1.5">
                <Label className="text-xs">{isRTL ? 'الاسم الكامل' : 'Full Name'}</Label>
                <Input value={editForm.full_name} onChange={e => setEditForm(p => ({ ...p, full_name: e.target.value }))} maxLength={100} className="h-10 rounded-xl" />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">{isRTL ? 'البريد الإلكتروني' : 'Email'}</Label>
                <Input type="email" value={editForm.email} onChange={e => setEditForm(p => ({ ...p, email: e.target.value }))} maxLength={255} className="h-10 rounded-xl" />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">{isRTL ? 'رقم الهاتف' : 'Phone'}</Label>
                <Input value={editForm.phone} onChange={e => setEditForm(p => ({ ...p, phone: e.target.value }))} dir="ltr" maxLength={20} className="h-10 rounded-xl" />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">{isRTL ? 'نوع الحساب' : 'Account Type'}</Label>
                <Select value={editForm.account_type} onValueChange={val => setEditForm(p => ({ ...p, account_type: val }))}>
                  <SelectTrigger className="h-10 rounded-xl"><SelectValue /></SelectTrigger>
                  <SelectContent className="rounded-xl">
                    <SelectItem value="individual">{isRTL ? 'فرد' : 'Individual'}</SelectItem>
                    <SelectItem value="business">{isRTL ? 'مزود خدمة' : 'Provider'}</SelectItem>
                    <SelectItem value="company">{isRTL ? 'شركة' : 'Company'}</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">{isRTL ? 'مستوى العضوية' : 'Membership Tier'}</Label>
                <Select value={editForm.membership_tier} onValueChange={val => setEditForm(p => ({ ...p, membership_tier: val }))}>
                  <SelectTrigger className="h-10 rounded-xl"><SelectValue /></SelectTrigger>
                  <SelectContent className="rounded-xl">
                    <SelectItem value="free">{isRTL ? 'مجاني' : 'Free'}</SelectItem>
                    <SelectItem value="basic">{isRTL ? 'أساسي' : 'Basic'}</SelectItem>
                    <SelectItem value="premium">{isRTL ? 'مميز' : 'Premium'}</SelectItem>
                    <SelectItem value="enterprise">{isRTL ? 'مؤسسات' : 'Enterprise'}</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Show linked business in edit panel */}
            {(() => {
              const bizList = businessMap.get(activePanel.profile.user_id) || [];
              if (bizList.length === 0) return null;
              return (
                <div className="mt-4 p-3 rounded-xl bg-muted/40 border border-border/30">
                  <div className="flex items-center gap-2 mb-2">
                    <Building2 className="w-4 h-4 text-emerald-600" />
                    <span className="text-xs font-bold">{isRTL ? 'الحسابات التجارية المرتبطة' : 'Linked Business Accounts'} ({bizList.length})</span>
                  </div>
                  <div className="space-y-1.5">
                    {bizList.map(biz => (
                      <div key={biz.id} className="flex items-center gap-3 flex-wrap">
                        <Badge variant="outline" className="font-mono text-xs gap-1"><Link2 className="w-3 h-3" />{biz.ref_id}</Badge>
                        <span className="text-xs text-muted-foreground">{biz.name_ar}</span>
                        <span className="text-xs text-muted-foreground">@{biz.username}</span>
                      </div>
                    ))}
                  </div>
                </div>
              );
            })()}

            <Separator className="my-4" />
            <div className="flex items-center gap-2 justify-end">
              <Button variant="outline" onClick={closePanel} className="rounded-xl">{isRTL ? 'إلغاء' : 'Cancel'}</Button>
              <Button onClick={handleSaveProfile} disabled={updateProfileMutation.isPending} className="rounded-xl gap-2">
                {updateProfileMutation.isPending && <Loader2 className="w-4 h-4 animate-spin" />}
                {isRTL ? 'حفظ التغييرات' : 'Save Changes'}
              </Button>
            </div>
          </div>
        )}

        {/* ═══ Inline Password Panel ═══ */}
        {activePanel?.type === 'password' && (
          <div className="rounded-2xl border border-accent/30 bg-gradient-to-r from-accent/5 to-transparent p-5 animate-in slide-in-from-top-2 duration-200">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-heading font-bold text-lg flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg bg-accent/15 flex items-center justify-center">
                  <Lock className="w-4 h-4 text-accent" />
                </div>
                {isRTL ? 'تغيير كلمة المرور' : 'Change Password'}
                <span className="text-sm font-normal text-muted-foreground">— {activePanel.userName}</span>
              </h3>
              <Button variant="ghost" size="icon" onClick={closePanel} className="rounded-xl"><X className="w-4 h-4" /></Button>
            </div>
            <div className="max-w-md space-y-3">
              <div className="space-y-1.5">
                <Label className="text-xs">{isRTL ? 'كلمة المرور الجديدة' : 'New Password'}</Label>
                <div className="relative">
                  <Input
                    type={showNewPassword ? 'text' : 'password'}
                    value={newPassword}
                    onChange={e => setNewPassword(e.target.value)}
                    placeholder={isRTL ? '8 أحرف على الأقل' : 'Min 8 characters'}
                    minLength={8}
                    className="pe-10 h-10 rounded-xl"
                  />
                  <button type="button" onClick={() => setShowNewPassword(!showNewPassword)} className="absolute top-2.5 text-muted-foreground hover:text-foreground transition-colors" style={{ [isRTL ? 'left' : 'right']: '10px' }}>
                    {showNewPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>
              <div className="flex items-center gap-2 flex-wrap">
                <Button
                  onClick={() => changePasswordMutation.mutate({ targetUserId: activePanel.userId, password: newPassword })}
                  disabled={changePasswordMutation.isPending || newPassword.length < 8}
                  className="rounded-xl gap-2"
                >
                  {changePasswordMutation.isPending && <Loader2 className="w-4 h-4 animate-spin" />}
                  {isRTL ? 'تغيير كلمة المرور' : 'Change Password'}
                </Button>
                <Button variant="outline" onClick={() => sendResetLinkMutation.mutate(activePanel.userId)} disabled={sendResetLinkMutation.isPending} className="gap-1.5 rounded-xl">
                  <Send className="w-4 h-4" />
                  {isRTL ? 'إرسال رابط إعادة تعيين' : 'Send Reset Link'}
                </Button>
                <Button variant="ghost" onClick={closePanel} className="rounded-xl">{isRTL ? 'إلغاء' : 'Cancel'}</Button>
              </div>
            </div>
          </div>
        )}

        {/* ═══ Inline Delete Confirmation ═══ */}
        {activePanel?.type === 'delete' && (
          <div className="rounded-2xl border border-destructive/30 bg-gradient-to-r from-destructive/5 to-transparent p-5 animate-in slide-in-from-top-2 duration-200">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-heading font-bold text-lg flex items-center gap-2 text-destructive">
                <div className="w-8 h-8 rounded-lg bg-destructive/15 flex items-center justify-center">
                  <AlertTriangle className="w-4 h-4 text-destructive" />
                </div>
                {isRTL ? 'تأكيد حذف الحساب' : 'Confirm Account Deletion'}
              </h3>
              <Button variant="ghost" size="icon" onClick={closePanel} className="rounded-xl"><X className="w-4 h-4" /></Button>
            </div>
            <p className="text-sm text-muted-foreground mb-4 max-w-lg">
              {isRTL
                ? `هل أنت متأكد من حذف حساب "${activePanel.userName}"؟ سيتم حذف جميع بيانات المستخدم نهائياً ولا يمكن التراجع عن هذا الإجراء.`
                : `Are you sure you want to delete "${activePanel.userName}"? All user data will be permanently removed and this action cannot be undone.`}
            </p>
            <div className="flex items-center gap-2">
              <Button
                variant="destructive"
                onClick={() => deleteUserMutation.mutate(activePanel.userId)}
                disabled={deleteUserMutation.isPending}
                className="rounded-xl gap-2"
              >
                {deleteUserMutation.isPending && <Loader2 className="w-4 h-4 animate-spin" />}
                {isRTL ? 'حذف نهائي' : 'Delete Permanently'}
              </Button>
              <Button variant="outline" onClick={closePanel} className="rounded-xl">{isRTL ? 'إلغاء' : 'Cancel'}</Button>
            </div>
          </div>
        )}

        {/* ═══ Users List ═══ */}
        {(loadingProfiles || loadingRoles) ? (
          <div className="space-y-3">{Array.from({ length: 5 }).map((_, i) => <Skeleton key={i} className="h-24 rounded-2xl" />)}</div>
        ) : filtered.length === 0 ? (
          <div className="rounded-2xl border border-border/30 bg-card p-12 text-center">
            <div className="w-16 h-16 mx-auto mb-4 rounded-2xl bg-gradient-to-br from-accent/10 to-primary/10 flex items-center justify-center">
              <Users className="w-8 h-8 text-accent/30" />
            </div>
            <p className="font-heading font-bold text-sm mb-1">{isRTL ? 'لا توجد نتائج' : 'No results found'}</p>
            <p className="text-xs text-muted-foreground">{isRTL ? 'حاول تغيير معايير البحث' : 'Try changing your search criteria'}</p>
          </div>
        ) : (
          <div className={viewMode === 'grid' ? 'grid grid-cols-1 lg:grid-cols-2 gap-3' : 'space-y-3'}>
            {filtered.map(profile => {
              const roles = roleMap.get(profile.user_id) || [];
              const isCurrentUser = profile.user_id === user.id;
              const targetIsSuperAdmin = roles.some(r => r.role === 'super_admin');
              const targetIsAdmin = roles.some(r => r.role === 'admin' || r.role === 'super_admin');
              const canManageUser = !isCurrentUser && (isSuperAdmin || (!targetIsSuperAdmin && !targetIsAdmin));

              return (
                <UserCard
                  key={profile.id}
                  profile={profile}
                  roles={roles}
                  business={businessMap.get(profile.user_id) || null}
                  isCurrentUser={isCurrentUser}
                  canManageUser={canManageUser}
                  isSuperAdmin={isSuperAdmin}
                  isRTL={isRTL}
                  language={language}
                  onEdit={openEdit}
                  onPassword={(p: Profile) => setActivePanel({ type: 'password', userId: p.user_id, userName: p.full_name || '' })}
                  onToggleBan={(p: Profile) => toggleBanMutation.mutate({ profileId: p.id, userId: p.user_id, isBanned: !(p as any).is_banned })}
                  onDelete={(p: Profile) => setActivePanel({ type: 'delete', userId: p.user_id, userName: p.full_name || '' })}
                  onAddRole={(userId: string) => addRoleMutation.mutate({ userId, role: selectedRole })}
                  onRemoveRole={(roleId: string) => removeRoleMutation.mutate(roleId)}
                  addingRoleFor={addingRoleFor}
                  selectedRole={selectedRole}
                  setSelectedRole={setSelectedRole}
                  addRoleMutation={addRoleMutation}
                  setAddingRoleFor={setAddingRoleFor}
                />
              );
            })}
          </div>
        )}
      </div>
    </DashboardLayout>
  );
};

export default AdminUsers;
