import React, { useState } from 'react';
import { Skeleton } from '@/components/ui/skeleton';
import { DashboardLayout } from '@/components/dashboard/DashboardLayout';
import { useLanguage } from '@/i18n/LanguageContext';
import { useAuth } from '@/contexts/AuthContext';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';
import { toast } from 'sonner';
import {
  Users, Search, Shield, ShieldCheck, ShieldAlert, UserPlus, Trash2,
  Mail, Phone, Calendar, Crown, Loader2, Pencil, Ban, UserX, Download,
  KeyRound, Send, Lock, Eye, EyeOff, X, AlertTriangle, Check,
} from 'lucide-react';
import type { Tables } from '@/integrations/supabase/types';

type Profile = Tables<'profiles'>;
type UserRole = Tables<'user_roles'>;

const roleConfig = {
  super_admin: { icon: ShieldAlert, color: 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400', labelAr: 'مشرف أعلى', labelEn: 'Super Admin' },
  admin: { icon: Crown, color: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400', labelAr: 'مشرف', labelEn: 'Admin' },
  moderator: { icon: ShieldCheck, color: 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400', labelAr: 'مشرف محتوى', labelEn: 'Moderator' },
  user: { icon: Users, color: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400', labelAr: 'مستخدم', labelEn: 'User' },
};

const tierConfig = {
  free: { labelAr: 'مجاني', labelEn: 'Free', color: 'bg-muted text-muted-foreground' },
  basic: { labelAr: 'أساسي', labelEn: 'Basic', color: 'bg-blue-100 text-blue-700' },
  premium: { labelAr: 'مميز', labelEn: 'Premium', color: 'bg-gold/20 text-gold' },
  enterprise: { labelAr: 'مؤسسات', labelEn: 'Enterprise', color: 'bg-purple-100 text-purple-700' },
};

const accountTypeConfig = {
  individual: { labelAr: 'فرد', labelEn: 'Individual' },
  business: { labelAr: 'أعمال', labelEn: 'Business' },
  company: { labelAr: 'شركة', labelEn: 'Company' },
};

// ─── Inline panel type ───
type ActivePanel =
  | null
  | { type: 'edit'; profile: Profile }
  | { type: 'password'; userId: string; userName: string }
  | { type: 'delete'; userId: string; userName: string };

const AdminUsers = () => {
  const { isRTL, language } = useLanguage();
  const { user, isSuperAdmin } = useAuth();
  const queryClient = useQueryClient();

  const [searchTerm, setSearchTerm] = useState('');
  const [filterRole, setFilterRole] = useState<string>('all');
  const [addingRoleFor, setAddingRoleFor] = useState<string | null>(null);
  const [selectedRole, setSelectedRole] = useState<string>('user');

  // Inline panel state (replaces all dialogs)
  const [activePanel, setActivePanel] = useState<ActivePanel>(null);
  const [editForm, setEditForm] = useState({ full_name: '', account_type: '', membership_tier: '', phone: '', email: '' });
  const [newPassword, setNewPassword] = useState('');
  const [showNewPassword, setShowNewPassword] = useState(false);

  const closePanel = () => { setActivePanel(null); setNewPassword(''); setShowNewPassword(false); };

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
    onError: (err: any) => toast.error(err.message || (isRTL ? 'فشل تغيير كلمة المرور' : 'Failed to change password')),
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
    onError: (err: any) => toast.error(err.message || (isRTL ? 'فشل إرسال الرابط' : 'Failed to send reset link')),
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

  // ─── Helpers ───
  const openEdit = (profile: Profile) => {
    setActivePanel({ type: 'edit', profile });
    setEditForm({
      full_name: profile.full_name || '', account_type: profile.account_type || 'individual',
      membership_tier: profile.membership_tier || 'free', phone: profile.phone || '', email: profile.email || '',
    });
  };

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

  const roleMap = new Map<string, UserRole[]>();
  userRoles.forEach(r => { const arr = roleMap.get(r.user_id) || []; arr.push(r); roleMap.set(r.user_id, arr); });

  const filtered = profiles.filter(p => {
    const matchesSearch = !searchTerm || p.full_name?.toLowerCase().includes(searchTerm.toLowerCase()) || p.email?.toLowerCase().includes(searchTerm.toLowerCase()) || p.phone?.includes(searchTerm);
    const roles = roleMap.get(p.user_id) || [];
    const matchesRole = filterRole === 'all' || (filterRole === 'no_role' && roles.length === 0) || roles.some(r => r.role === filterRole);
    return matchesSearch && matchesRole;
  });

  const exportCSV = () => {
    const headers = ['Name', 'Email', 'Phone', 'Account Type', 'Membership', 'Roles', 'Banned', 'Created At'];
    const rows = filtered.map(p => {
      const roles = (roleMap.get(p.user_id) || []).map(r => r.role).join(', ') || 'none';
      const accType = accountTypeConfig[p.account_type as keyof typeof accountTypeConfig]?.labelEn || p.account_type;
      const tier = tierConfig[p.membership_tier as keyof typeof tierConfig]?.labelEn || p.membership_tier;
      return [p.full_name || '', p.email || '', p.phone || '', accType, tier, roles, (p as any).is_banned ? 'Yes' : 'No', new Date(p.created_at).toISOString().split('T')[0]]
        .map(v => `"${String(v).replace(/"/g, '""')}"`).join(',');
    });
    const csv = '\uFEFF' + [headers.join(','), ...rows].join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a'); a.href = url; a.download = `users_${new Date().toISOString().split('T')[0]}.csv`; a.click();
    URL.revokeObjectURL(url);
    toast.success(isRTL ? 'تم تصدير القائمة بنجاح' : 'Users exported successfully');
  };

  const totalUsers = profiles.length;
  const superAdmins = userRoles.filter(r => r.role === 'super_admin').length;
  const admins = userRoles.filter(r => r.role === 'admin').length;
  const moderators = userRoles.filter(r => r.role === 'moderator').length;

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
        {/* Header */}
        <div>
          <h1 className="font-heading font-bold text-2xl text-foreground flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-accent/10 flex items-center justify-center">
              <Users className="w-5 h-5 text-accent" />
            </div>
            {isRTL ? 'إدارة المستخدمين والصلاحيات' : 'Users & Roles Management'}
          </h1>
          <p className="text-muted-foreground font-body mt-1">
            {isRTL ? 'عرض وإدارة المستخدمين وتعيين الصلاحيات' : 'View and manage users and assign roles'}
          </p>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {[
            { label: isRTL ? 'إجمالي المستخدمين' : 'Total Users', value: totalUsers, icon: Users, color: 'text-blue-500' },
            { label: isRTL ? 'مشرف أعلى' : 'Super Admins', value: superAdmins, icon: ShieldAlert, color: 'text-purple-500' },
            { label: isRTL ? 'المشرفين' : 'Admins', value: admins, icon: Crown, color: 'text-red-500' },
            { label: isRTL ? 'مشرفي المحتوى' : 'Moderators', value: moderators, icon: ShieldCheck, color: 'text-amber-500' },
          ].map((stat, i) => (
            <Card key={i}>
              <CardContent className="p-4 flex items-center gap-3">
                <stat.icon className={`w-8 h-8 ${stat.color}`} />
                <div>
                  <p className="font-heading font-bold text-xl">{stat.value}</p>
                  <p className="text-xs text-muted-foreground font-body">{stat.label}</p>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Search & Filter */}
        <Card>
          <CardContent className="p-4">
            <div className="flex flex-col md:flex-row gap-3">
              <div className="relative flex-1">
                <Search className="absolute top-2.5 text-muted-foreground w-4 h-4" style={{ [isRTL ? 'right' : 'left']: '12px' }} />
                <Input value={searchTerm} onChange={e => setSearchTerm(e.target.value)} placeholder={isRTL ? 'بحث بالاسم أو البريد أو الهاتف...' : 'Search by name, email, or phone...'} className="ps-10" />
              </div>
              <Select value={filterRole} onValueChange={setFilterRole}>
                <SelectTrigger className="w-full md:w-48"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">{isRTL ? 'جميع المستخدمين' : 'All Users'}</SelectItem>
                  <SelectItem value="super_admin">{isRTL ? 'مشرف أعلى' : 'Super Admin'}</SelectItem>
                  <SelectItem value="admin">{isRTL ? 'المشرفين' : 'Admins'}</SelectItem>
                  <SelectItem value="moderator">{isRTL ? 'مشرفي المحتوى' : 'Moderators'}</SelectItem>
                  <SelectItem value="user">{isRTL ? 'مستخدم عادي' : 'Regular User'}</SelectItem>
                  <SelectItem value="no_role">{isRTL ? 'بدون صلاحيات' : 'No Role'}</SelectItem>
                </SelectContent>
              </Select>
              <Button variant="outline" onClick={exportCSV} className="gap-2">
                <Download className="w-4 h-4" />
                {isRTL ? 'تصدير CSV' : 'Export CSV'}
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* ═══ Inline Edit Panel ═══ */}
        {activePanel?.type === 'edit' && (
          <Card className="border-accent/30 bg-accent/5">
            <CardHeader className="flex flex-row items-center justify-between pb-4">
              <CardTitle className="flex items-center gap-2 text-lg">
                <Pencil className="w-5 h-5 text-accent" />
                {isRTL ? 'تعديل بيانات المستخدم' : 'Edit User Profile'}
              </CardTitle>
              <Button variant="ghost" size="icon" onClick={closePanel}><X className="w-4 h-4" /></Button>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>{isRTL ? 'الاسم الكامل' : 'Full Name'}</Label>
                  <Input value={editForm.full_name} onChange={e => setEditForm(p => ({ ...p, full_name: e.target.value }))} maxLength={100} />
                </div>
                <div className="space-y-2">
                  <Label>{isRTL ? 'البريد الإلكتروني' : 'Email'}</Label>
                  <Input type="email" value={editForm.email} onChange={e => setEditForm(p => ({ ...p, email: e.target.value }))} maxLength={255} />
                </div>
                <div className="space-y-2">
                  <Label>{isRTL ? 'رقم الهاتف' : 'Phone'}</Label>
                  <Input value={editForm.phone} onChange={e => setEditForm(p => ({ ...p, phone: e.target.value }))} dir="ltr" maxLength={20} />
                </div>
                <div className="space-y-2">
                  <Label>{isRTL ? 'نوع الحساب' : 'Account Type'}</Label>
                  <Select value={editForm.account_type} onValueChange={val => setEditForm(p => ({ ...p, account_type: val }))}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="individual">{isRTL ? 'فرد' : 'Individual'}</SelectItem>
                      <SelectItem value="business">{isRTL ? 'أعمال' : 'Business'}</SelectItem>
                      <SelectItem value="company">{isRTL ? 'شركة' : 'Company'}</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>{isRTL ? 'مستوى العضوية' : 'Membership Tier'}</Label>
                  <Select value={editForm.membership_tier} onValueChange={val => setEditForm(p => ({ ...p, membership_tier: val }))}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="free">{isRTL ? 'مجاني' : 'Free'}</SelectItem>
                      <SelectItem value="basic">{isRTL ? 'أساسي' : 'Basic'}</SelectItem>
                      <SelectItem value="premium">{isRTL ? 'مميز' : 'Premium'}</SelectItem>
                      <SelectItem value="enterprise">{isRTL ? 'مؤسسات' : 'Enterprise'}</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <Separator />
              <div className="flex items-center gap-2 justify-end">
                <Button variant="outline" onClick={closePanel}>{isRTL ? 'إلغاء' : 'Cancel'}</Button>
                <Button onClick={handleSaveProfile} disabled={updateProfileMutation.isPending}>
                  {updateProfileMutation.isPending && <Loader2 className="w-4 h-4 animate-spin me-2" />}
                  {isRTL ? 'حفظ التغييرات' : 'Save Changes'}
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        {/* ═══ Inline Password Panel ═══ */}
        {activePanel?.type === 'password' && (
          <Card className="border-accent/30 bg-accent/5">
            <CardHeader className="flex flex-row items-center justify-between pb-4">
              <CardTitle className="flex items-center gap-2 text-lg">
                <Lock className="w-5 h-5 text-accent" />
                {isRTL ? 'تغيير كلمة المرور' : 'Change Password'}
                <span className="text-sm font-normal text-muted-foreground">— {activePanel.userName}</span>
              </CardTitle>
              <Button variant="ghost" size="icon" onClick={closePanel}><X className="w-4 h-4" /></Button>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="max-w-md space-y-2">
                <Label>{isRTL ? 'كلمة المرور الجديدة' : 'New Password'}</Label>
                <div className="relative">
                  <Input
                    type={showNewPassword ? 'text' : 'password'}
                    value={newPassword}
                    onChange={e => setNewPassword(e.target.value)}
                    placeholder={isRTL ? '8 أحرف على الأقل' : 'Min 8 characters'}
                    minLength={8}
                    className="pe-10"
                  />
                  <button type="button" onClick={() => setShowNewPassword(!showNewPassword)} className="absolute top-2.5 text-muted-foreground" style={{ [isRTL ? 'left' : 'right']: '10px' }}>
                    {showNewPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <Button
                  onClick={() => changePasswordMutation.mutate({ targetUserId: activePanel.userId, password: newPassword })}
                  disabled={changePasswordMutation.isPending || newPassword.length < 8}
                >
                  {changePasswordMutation.isPending && <Loader2 className="w-4 h-4 animate-spin me-2" />}
                  {isRTL ? 'تغيير كلمة المرور' : 'Change Password'}
                </Button>
                <Button variant="outline" onClick={() => sendResetLinkMutation.mutate(activePanel.userId)} disabled={sendResetLinkMutation.isPending} className="gap-1.5">
                  <Send className="w-4 h-4" />
                  {isRTL ? 'إرسال رابط إعادة تعيين' : 'Send Reset Link'}
                </Button>
                <Button variant="ghost" onClick={closePanel}>{isRTL ? 'إلغاء' : 'Cancel'}</Button>
              </div>
            </CardContent>
          </Card>
        )}

        {/* ═══ Inline Delete Confirmation Panel ═══ */}
        {activePanel?.type === 'delete' && (
          <Card className="border-destructive/40 bg-destructive/5">
            <CardHeader className="flex flex-row items-center justify-between pb-4">
              <CardTitle className="flex items-center gap-2 text-lg text-destructive">
                <AlertTriangle className="w-5 h-5" />
                {isRTL ? 'تأكيد حذف الحساب' : 'Confirm Account Deletion'}
              </CardTitle>
              <Button variant="ghost" size="icon" onClick={closePanel}><X className="w-4 h-4" /></Button>
            </CardHeader>
            <CardContent className="space-y-4">
              <p className="text-sm text-muted-foreground">
                {isRTL
                  ? `هل أنت متأكد من حذف حساب "${activePanel.userName}"؟ سيتم حذف جميع بيانات المستخدم نهائياً ولا يمكن التراجع عن هذا الإجراء.`
                  : `Are you sure you want to delete "${activePanel.userName}"? All user data will be permanently removed and this action cannot be undone.`}
              </p>
              <div className="flex items-center gap-2">
                <Button
                  variant="destructive"
                  onClick={() => deleteUserMutation.mutate(activePanel.userId)}
                  disabled={deleteUserMutation.isPending}
                >
                  {deleteUserMutation.isPending && <Loader2 className="w-4 h-4 animate-spin me-2" />}
                  {isRTL ? 'حذف نهائي' : 'Delete Permanently'}
                </Button>
                <Button variant="outline" onClick={closePanel}>{isRTL ? 'إلغاء' : 'Cancel'}</Button>
              </div>
            </CardContent>
          </Card>
        )}

        {/* ═══ Users List ═══ */}
        {(loadingProfiles || loadingRoles) ? (
          <div className="space-y-3">{[1, 2, 3, 4, 5].map(i => <Skeleton key={i} className="h-20 rounded-xl" />)}</div>
        ) : filtered.length === 0 ? (
          <Card>
            <CardContent className="p-12 text-center">
              <Users className="w-16 h-16 mx-auto text-muted-foreground/20 mb-4" />
              <p className="text-muted-foreground font-body">{isRTL ? 'لا توجد نتائج' : 'No results'}</p>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-3">
            {filtered.map(profile => {
              const roles = roleMap.get(profile.user_id) || [];
              const tier = tierConfig[profile.membership_tier as keyof typeof tierConfig] || tierConfig.free;
              const accType = accountTypeConfig[profile.account_type as keyof typeof accountTypeConfig] || accountTypeConfig.individual;
              const createdDate = new Date(profile.created_at).toLocaleDateString(language === 'ar' ? 'ar-SA' : 'en', { year: 'numeric', month: 'short', day: 'numeric' });
              const isCurrentUser = profile.user_id === user.id;
              const targetIsSuperAdmin = roles.some(r => r.role === 'super_admin');
              const targetIsAdmin = roles.some(r => r.role === 'admin' || r.role === 'super_admin');
              const canManageUser = !isCurrentUser && (isSuperAdmin || (!targetIsSuperAdmin && !targetIsAdmin));

              return (
                <Card key={profile.id} className={`transition-colors ${isCurrentUser ? 'border-accent/40' : ''} ${(profile as any).is_banned ? 'opacity-60 border-destructive/40' : ''}`}>
                  <CardContent className="p-4">
                    <div className="flex flex-col md:flex-row md:items-center gap-4">
                      {/* User info */}
                      <div className="flex items-center gap-3 flex-1 min-w-0">
                        <Avatar className="w-12 h-12 shrink-0">
                          <AvatarImage src={profile.avatar_url || undefined} />
                          <AvatarFallback className="bg-accent/10 text-accent font-bold">
                            {(profile.full_name || '?').charAt(0)}
                          </AvatarFallback>
                        </Avatar>
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-2 flex-wrap">
                            <h3 className="font-heading font-bold text-foreground truncate">
                              {profile.full_name || (isRTL ? 'بدون اسم' : 'No name')}
                            </h3>
                            {isCurrentUser && <Badge variant="outline" className="text-[10px] border-accent text-accent">{isRTL ? 'أنت' : 'You'}</Badge>}
                            {(profile as any).is_banned && (
                              <Badge variant="destructive" className="text-[10px] gap-1"><Ban className="w-3 h-3" />{isRTL ? 'معطّل' : 'Disabled'}</Badge>
                            )}
                            <Badge className={`${tier.color} text-[10px]`}>{isRTL ? tier.labelAr : tier.labelEn}</Badge>
                          </div>
                          <div className="flex flex-wrap items-center gap-3 mt-1 text-xs text-muted-foreground">
                            {profile.email && <span className="flex items-center gap-1"><Mail className="w-3 h-3" /> {profile.email}</span>}
                            {profile.phone && <span className="flex items-center gap-1" dir="ltr"><Phone className="w-3 h-3" /> {profile.phone}</span>}
                            <span className="flex items-center gap-1"><Calendar className="w-3 h-3" /> {createdDate}</span>
                            <Badge variant="outline" className="text-[10px]">{isRTL ? accType.labelAr : accType.labelEn}</Badge>
                          </div>
                        </div>
                      </div>

                      {/* Actions & Roles */}
                      <div className="flex items-center gap-2 flex-wrap">
                        <Button variant="outline" size="sm" className="h-7 gap-1 text-xs" onClick={() => openEdit(profile)}>
                          <Pencil className="w-3 h-3" />{isRTL ? 'تعديل' : 'Edit'}
                        </Button>

                        {canManageUser && (
                          <>
                            {isSuperAdmin && (
                              <Button variant="outline" size="sm" className="h-7 gap-1 text-xs"
                                onClick={() => setActivePanel({ type: 'password', userId: profile.user_id, userName: profile.full_name || '' })}>
                                <KeyRound className="w-3 h-3" />{isRTL ? 'كلمة المرور' : 'Password'}
                              </Button>
                            )}
                            <Button variant="outline" size="sm"
                              className={`h-7 gap-1 text-xs ${(profile as any).is_banned ? 'text-green-600 hover:text-green-700' : 'text-amber-600 hover:text-amber-700'}`}
                              onClick={() => toggleBanMutation.mutate({ profileId: profile.id, userId: profile.user_id, isBanned: !(profile as any).is_banned })}
                              disabled={toggleBanMutation.isPending}>
                              <Ban className="w-3 h-3" />
                              {(profile as any).is_banned ? (isRTL ? 'تفعيل' : 'Enable') : (isRTL ? 'تعطيل' : 'Disable')}
                            </Button>
                            <Button variant="outline" size="sm" className="h-7 gap-1 text-xs text-destructive hover:text-destructive"
                              onClick={() => setActivePanel({ type: 'delete', userId: profile.user_id, userName: profile.full_name || '' })}>
                              <UserX className="w-3 h-3" />{isRTL ? 'حذف' : 'Delete'}
                            </Button>
                          </>
                        )}

                        {/* Roles badges */}
                        {roles.length === 0 && <span className="text-xs text-muted-foreground">{isRTL ? 'بدون صلاحيات' : 'No roles'}</span>}
                        {roles.map(r => {
                          const cfg = roleConfig[r.role as keyof typeof roleConfig] || roleConfig.user;
                          const RoleIcon = cfg.icon;
                          return (
                            <div key={r.id} className="flex items-center gap-1">
                              <Badge className={`${cfg.color} gap-1 text-xs`}><RoleIcon className="w-3 h-3" />{isRTL ? cfg.labelAr : cfg.labelEn}</Badge>
                              {!isCurrentUser && isSuperAdmin && (
                                <Button variant="ghost" size="icon" className="w-6 h-6 text-destructive hover:text-destructive"
                                  onClick={() => removeRoleMutation.mutate(r.id)} disabled={removeRoleMutation.isPending}>
                                  <Trash2 className="w-3 h-3" />
                                </Button>
                              )}
                            </div>
                          );
                        })}

                        {/* Add role inline */}
                        {isSuperAdmin && (addingRoleFor === profile.user_id ? (
                          <div className="flex items-center gap-1.5">
                            <Select value={selectedRole} onValueChange={setSelectedRole}>
                              <SelectTrigger className="h-7 w-32 text-xs"><SelectValue /></SelectTrigger>
                              <SelectContent>
                                <SelectItem value="super_admin">{isRTL ? 'مشرف أعلى' : 'Super Admin'}</SelectItem>
                                <SelectItem value="admin">{isRTL ? 'مشرف' : 'Admin'}</SelectItem>
                                <SelectItem value="moderator">{isRTL ? 'مشرف محتوى' : 'Moderator'}</SelectItem>
                                <SelectItem value="user">{isRTL ? 'مستخدم' : 'User'}</SelectItem>
                              </SelectContent>
                            </Select>
                            <Button variant="default" size="sm" className="h-7 px-2 text-xs"
                              onClick={() => addRoleMutation.mutate({ userId: profile.user_id, role: selectedRole })} disabled={addRoleMutation.isPending}>
                              {addRoleMutation.isPending ? <Loader2 className="w-3 h-3 animate-spin" /> : <Check className="w-3 h-3" />}
                            </Button>
                            <Button variant="ghost" size="sm" className="h-7 px-2 text-xs" onClick={() => setAddingRoleFor(null)}>
                              <X className="w-3 h-3" />
                            </Button>
                          </div>
                        ) : (
                          <Button variant="outline" size="sm" className="h-7 gap-1 text-xs"
                            onClick={() => { setAddingRoleFor(profile.user_id); setSelectedRole('user'); }}>
                            <UserPlus className="w-3 h-3" />{isRTL ? 'صلاحية' : 'Role'}
                          </Button>
                        ))}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}
      </div>
    </DashboardLayout>
  );
};

export default AdminUsers;
