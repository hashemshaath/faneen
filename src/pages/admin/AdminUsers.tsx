import React, { useState, useMemo, useCallback, useTransition, useEffect, useRef } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { Skeleton } from '@/components/ui/skeleton';
import { DashboardLayout } from '@/components/dashboard/DashboardLayout';
import { useLanguage } from '@/i18n/LanguageContext';
import { CrQuickScanInline } from '@/components/admin/CrQuickScanInline';
import { useAuth } from '@/contexts/AuthContext';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { adminCreateUser, type AdminCreateUserPayload } from '@/modules/admin';
import { listContractsForUserParticipant } from '@/modules/contracts';
import {
  listAdminBusinesses,
  listAllBusinessStaffForAdmin,
  updateBusinessStaffRole,
  removeBusinessStaff,
} from '@/modules/businesses';
import { countMessagesBySender } from '@/modules/messaging';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';
import { Progress } from '@/components/ui/progress';
import { Checkbox } from '@/components/ui/checkbox';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import {
  Tooltip, TooltipContent, TooltipProvider, TooltipTrigger,
} from '@/components/ui/tooltip';
import { toast } from 'sonner';
import {
  Users, Search, Shield, ShieldCheck, ShieldAlert, UserPlus, Mail, Phone, Calendar, Crown,
  Loader2, Pencil, Ban, UserX, Download, KeyRound, Send, Lock, Eye, EyeOff, X, AlertTriangle,
  Check, TrendingUp, UserCheck, Filter, Hash, Sparkles, Building2, Briefcase, Link2,
  ChevronDown, ChevronUp, ChevronLeft, ChevronRight, BarChart3, Activity, FileText, MessageSquare,
  Star, MoreHorizontal, RefreshCw, ArrowUpDown, Copy, Clock, Rows3, LayoutList, Zap, TrendingDown, Command,
} from 'lucide-react';
import {
  AreaChart, Area, ResponsiveContainer, XAxis, YAxis, Tooltip as RTooltip,
  PieChart, Pie, Cell, BarChart, Bar, CartesianGrid, Legend,
} from 'recharts';
import type { Tables } from '@/integrations/supabase/types';
import { maskEmail, maskPhone } from '@/lib/masking';
import { listAllUserRoles, grantRole, revokeRoleById, adminResetPassword, adminDeleteUser } from '@/modules/identity';
import { listProfiles, updateProfileById, updateProfilesByIds } from '@/modules/users';
import type { NormalizedRpcError } from '@/services/rpc';

import { useNoIndex } from "@/hooks/useNoIndex";
type Profile = Tables<'profiles'>;
type UserRole = Tables<'user_roles'>;

interface BusinessInfo {
  id: string; user_id: string; name_ar: string; name_en: string | null;
  ref_id: string; username: string; is_active: boolean; is_verified: boolean;
  membership_tier: string; business_number: number;
}

type StaffRole = 'owner' | 'manager' | 'editor' | 'viewer';

interface BusinessLink {
  business: BusinessInfo;
  role: StaffRole;
  staffId: string | null; // null = ownership inferred from businesses.user_id with no staff row
  isOwnerByEntity: boolean; // owns the business record itself
  isActive: boolean;
}

const staffRoleConfig: Record<StaffRole, { ar: string; en: string; color: string }> = {
  owner:   { ar: 'مالك',     en: 'Owner',   color: 'bg-success/15 text-success border-success/40 dark:text-success' },
  manager: { ar: 'مدير',     en: 'Manager', color: 'bg-info/15 text-info border-info/40 dark:text-info' },
  editor:  { ar: 'محرر',     en: 'Editor',  color: 'bg-warning/15 text-warning border-warning/40 dark:text-warning' },
  viewer:  { ar: 'مشاهد',    en: 'Viewer',  color: 'bg-muted text-muted-foreground border-border' },
};

const roleConfig = {
  super_admin: { icon: ShieldAlert, badge: 'bg-secondary text-secondary dark:bg-secondary/30 dark:text-secondary border-secondary dark:border-secondary', iconBg: 'bg-secondary/15 text-secondary dark:text-secondary', labelAr: 'مشرف أعلى', labelEn: 'Super Admin', rank: 0 },
  admin: { icon: Crown, badge: 'bg-destructive text-destructive dark:bg-destructive/30 dark:text-destructive border-destructive dark:border-destructive', iconBg: 'bg-destructive/15 text-destructive dark:text-destructive', labelAr: 'مشرف', labelEn: 'Admin', rank: 1 },
  moderator: { icon: ShieldCheck, badge: 'bg-warning text-warning dark:bg-warning/30 dark:text-warning border-warning dark:border-warning', iconBg: 'bg-warning/15 text-warning dark:text-warning', labelAr: 'مشرف محتوى', labelEn: 'Moderator', rank: 2 },
  user: { icon: Users, badge: 'bg-info text-info dark:bg-info/30 dark:text-info border-info dark:border-info', iconBg: 'bg-info/15 text-info dark:text-info', labelAr: 'مستخدم', labelEn: 'User', rank: 3 },
} as const;

const tierConfig = {
  free: { labelAr: 'مجاني', labelEn: 'Free', color: 'bg-muted text-muted-foreground border-border' },
  basic: { labelAr: 'أساسي', labelEn: 'Basic', color: 'bg-info text-info dark:bg-info/20 dark:text-info border-info dark:border-info' },
  premium: { labelAr: 'مميز', labelEn: 'Premium', color: 'bg-accent/10 text-accent border-accent/30' },
  enterprise: { labelAr: 'مؤسسات', labelEn: 'Enterprise', color: 'bg-secondary text-secondary dark:bg-secondary/20 dark:text-secondary border-secondary dark:border-secondary' },
} as const;

const accountTypeConfig: Record<string, { labelAr: string; labelEn: string; icon: React.ElementType; color: string }> = {
  individual: { labelAr: 'فرد', labelEn: 'Individual', icon: Users, color: 'text-info bg-info/10 border-info dark:border-info' },
  business: { labelAr: 'مزود خدمة', labelEn: 'Provider', icon: Briefcase, color: 'text-success bg-success/10 border-success dark:border-success' },
  company: { labelAr: 'شركة', labelEn: 'Company', icon: Building2, color: 'text-secondary bg-secondary/10 border-secondary dark:border-secondary' },
};

type ActivePanel =
  | null
  | { type: 'edit'; profile: Profile }
  | { type: 'password'; userId: string; userName: string }
  | { type: 'delete'; userId: string; userName: string }
  | { type: 'create' };

type SortKey = 'created_at' | 'full_name' | 'membership_tier' | 'account_type';
type Density = 'comfortable' | 'compact';

const formatDate = (dateStr: string | null | undefined, lang: string): string => {
  if (!dateStr) return lang === 'ar' ? 'غير محدد' : 'N/A';
  const d = new Date(dateStr);
  if (isNaN(d.getTime())) return lang === 'ar' ? 'غير محدد' : 'N/A';
  return d.toLocaleDateString(lang === 'ar' ? 'ar-SA-u-nu-latn' : 'en', { year: 'numeric', month: 'short', day: 'numeric' });
};

const formatRelative = (dateStr: string | null | undefined, isRTL: boolean): string => {
  if (!dateStr) return isRTL ? 'غير محدد' : 'N/A';
  const d = new Date(dateStr); if (isNaN(d.getTime())) return isRTL ? 'غير محدد' : 'N/A';
  const diff = (Date.now() - d.getTime()) / 1000;
  if (diff < 60) return isRTL ? 'الآن' : 'now';
  if (diff < 3600) return isRTL ? `منذ ${Math.floor(diff/60)} د` : `${Math.floor(diff/60)}m ago`;
  if (diff < 86400) return isRTL ? `منذ ${Math.floor(diff/3600)} س` : `${Math.floor(diff/3600)}h ago`;
  if (diff < 86400*30) return isRTL ? `منذ ${Math.floor(diff/86400)} يوم` : `${Math.floor(diff/86400)}d ago`;
  return formatDate(dateStr, isRTL ? 'ar' : 'en');
};

const getPasswordValidationMessage = (password: string, isRTL: boolean): string | null => {
  if (!password) return null;
  if (password.length < 8) return isRTL ? 'كلمة المرور يجب أن تكون 8 حروف على الأقل' : 'Password must be at least 8 characters';
  if (/\s/.test(password)) return isRTL ? 'كلمة المرور يجب ألا تحتوي على مسافات' : 'Password must not contain spaces';
  const cnt = [/[a-z]/, /[A-Z]/, /\d/, /[^A-Za-z0-9\s]/].filter(r => r.test(password)).length;
  if (cnt < 3) return isRTL ? 'استخدم 3 أنواع على الأقل: كبيرة، صغيرة، أرقام، رموز' : 'Use at least 3 of: upper, lower, numbers, symbols';
  if (['password', 'qwerty', 'admin', '123456', 'qitaat'].some(w => password.toLowerCase().includes(w)))
    return isRTL ? 'تجنب الكلمات الشائعة' : 'Avoid common words';
  return null;
};

/* ─── KPI card ─── */
const KpiCard = React.memo(({ icon: Icon, label, value, gradient, iconBg, trend }: {
  icon: React.ElementType; label: string; value: number | string; gradient: string; iconBg: string; trend?: string;
}) => (
  <div className={`relative overflow-hidden rounded-2xl border border-border/30 bg-gradient-to-br ${gradient} p-4 transition-all hover:shadow-md hover-lift group`}>
    <div className="flex items-center gap-3">
      <div className={`w-10 h-10 rounded-xl ${iconBg} flex items-center justify-center transition-transform group-hover:scale-110`}>
        <Icon className="w-5 h-5" />
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-2xl font-bold font-heading leading-none tech-content">{value}</p>
        <p className="text-[11px] text-muted-foreground mt-0.5 truncate">{label}</p>
      </div>
      {trend && (
        <span className={`text-[10px] font-bold tech-content shrink-0 inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded-md ${
          trend.startsWith('-') ? 'text-destructive bg-destructive/10' : 'text-success bg-success/10'
        }`}>
          {trend.startsWith('-') ? <TrendingDown className="w-2.5 h-2.5" /> : <TrendingUp className="w-2.5 h-2.5" />}
          {trend.replace('-', '')}
        </span>
      )}
    </div>
  </div>
));
KpiCard.displayName = 'KpiCard';

/* ─── Per-user expanded detail card ─── */
const UserDetailPanel = React.memo(({
  userId, isRTL, businessLinks, isSuperAdmin, onChangeStaffRole, onRemoveStaff,
}: {
  userId: string;
  isRTL: boolean;
  businessLinks: BusinessLink[];
  isSuperAdmin: boolean;
  onChangeStaffRole: (link: BusinessLink, role: StaffRole) => void;
  onRemoveStaff: (link: BusinessLink) => void;
}) => {
  const { data, isLoading } = useQuery({
    queryKey: ['admin-user-detail', userId],
    queryFn: async () => {
      const [contracts, messages, reviews, lastActivity] = await Promise.all([
        listContractsForUserParticipant({ userId, select: 'id', count: { mode: 'exact', head: true } }),
        countMessagesBySender({ userId }),
        supabase.from('reviews').select('id', { count: 'exact', head: true }).eq('user_id', userId),
        supabase.from('admin_activity_log').select('action, created_at, details').or(`user_id.eq.${userId},entity_id.eq.${userId}`).order('created_at', { ascending: false }).limit(5),
      ]);
      return {
        contracts: contracts.count ?? 0,
        messages: messages.count ?? 0,
        reviews: reviews.count ?? 0,
        recentActivity: lastActivity.data ?? [],
      };
    },
    staleTime: 60_000,
  });
  if (isLoading) return <div className="px-4 pb-4"><Skeleton className="h-20 rounded-xl" /></div>;
  if (!data) return null;
  const stats = [
    { label: isRTL ? 'العقود' : 'Contracts', val: data.contracts, icon: FileText, color: 'text-info bg-info/10' },
    { label: isRTL ? 'الرسائل' : 'Messages', val: data.messages, icon: MessageSquare, color: 'text-success bg-success/10' },
    { label: isRTL ? 'التقييمات' : 'Reviews', val: data.reviews, icon: Star, color: 'text-warning bg-warning/10' },
  ];
  return (
    <div className="border-t border-border/30 bg-muted/20 px-4 py-3 rounded-b-2xl space-y-3 animate-in slide-in-from-top-1 duration-200">
      <div className="grid grid-cols-3 gap-2">
        {stats.map(s => (
          <div key={s.label} className="rounded-xl bg-card border border-border/30 p-2.5 flex items-center gap-2">
            <div className={`w-8 h-8 rounded-lg ${s.color} flex items-center justify-center`}><s.icon className="w-4 h-4" /></div>
            <div><p className="text-base font-bold leading-none tech-content">{s.val}</p><p className="text-[10px] text-muted-foreground">{s.label}</p></div>
          </div>
        ))}
      </div>
      {businessLinks.length > 0 && (
        <div>
          <p className="text-[11px] font-bold text-muted-foreground mb-1.5 flex items-center gap-1">
            <Building2 className="w-3 h-3" />
            {isRTL ? `الصلاحيات على المنشآت (${businessLinks.length})` : `Business permissions (${businessLinks.length})`}
          </p>
          <div className="space-y-1.5">
            {businessLinks.map(link => {
              const cfg = staffRoleConfig[link.role];
              const lockedOwner = link.isOwnerByEntity; // can't downgrade actual owner
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
                      {isRTL ? 'غير نشط' : 'inactive'}
                    </Badge>
                  )}
                  {isSuperAdmin && !lockedOwner && link.staffId ? (
                    <Select value={link.role} onValueChange={(v) => onChangeStaffRole(link, v as StaffRole)}>
                      <SelectTrigger className="h-7 w-24 text-[10px] rounded-lg"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="manager">{isRTL ? 'مدير' : 'Manager'}</SelectItem>
                        <SelectItem value="editor">{isRTL ? 'محرر' : 'Editor'}</SelectItem>
                        <SelectItem value="viewer">{isRTL ? 'مشاهد' : 'Viewer'}</SelectItem>
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
                      title={isRTL ? 'إزالة الصلاحية' : 'Remove access'}
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
      {data.recentActivity.length > 0 && (
        <div>
          <p className="text-[11px] font-bold text-muted-foreground mb-1.5 flex items-center gap-1"><Activity className="w-3 h-3" />{isRTL ? 'آخر نشاط إداري' : 'Recent Admin Activity'}</p>
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

/* ─── User Row ─── */
interface UserRowProps {
  profile: Profile;
  roles: UserRole[];
  businessLinks: BusinessLink[];
  isCurrentUser: boolean;
  canManageUser: boolean;
  isSuperAdmin: boolean;
  isRTL: boolean;
  language: string;
  selected: boolean;
  expanded: boolean;
  density: Density;
  onToggleSelect: () => void;
  onToggleExpand: () => void;
  onEdit: (p: Profile) => void;
  onPassword: (p: Profile) => void;
  onToggleBan: (p: Profile) => void;
  onDelete: (p: Profile) => void;
  onAddRole: (userId: string, role: string) => void;
  onRemoveRole: (id: string) => void;
  onChangeStaffRole: (link: BusinessLink, role: StaffRole) => void;
  onRemoveStaff: (link: BusinessLink) => void;
}

const UserRow = React.memo(({ profile, roles, businessLinks, isCurrentUser, canManageUser, isSuperAdmin,
  isRTL, language, selected, expanded, density, onToggleSelect, onToggleExpand,
  onEdit, onPassword, onToggleBan, onDelete, onAddRole, onRemoveRole,
  onChangeStaffRole, onRemoveStaff }: UserRowProps) => {
  const [addingRole, setAddingRole] = useState(false);
  const [pickedRole, setPickedRole] = useState('user');
  const tier = tierConfig[profile.membership_tier as keyof typeof tierConfig] || tierConfig.free;
  const accType = accountTypeConfig[profile.account_type] || accountTypeConfig.individual;
  const AccIcon = accType.icon;
  const isBanned = profile.is_banned;
  const highest = roles.length > 0 ? roles.reduce((b, r) => (roleConfig[r.role as keyof typeof roleConfig]?.rank ?? 99) < (roleConfig[b.role as keyof typeof roleConfig]?.rank ?? 99) ? r : b) : null;
  const highestCfg = highest ? roleConfig[highest.role as keyof typeof roleConfig] : null;
  const compact = density === 'compact';
  // Super-admin only sees raw PII; other admins see masked values they can't copy.
  const canSeePII = isSuperAdmin;
  const displayedEmail = profile.email ? (canSeePII ? profile.email : maskEmail(profile.email)) : null;
  const displayedPhone = profile.phone ? (canSeePII ? profile.phone : maskPhone(profile.phone)) : null;

  const handleCopy = useCallback((value: string, label: string) => {
    if (!isSuperAdmin && (label.includes('بريد') || label.toLowerCase().includes('email') || label.includes('هاتف') || label.toLowerCase().includes('phone'))) {
      toast.error(isRTL
        ? 'هذه البيانات الحساسة متاحة فقط لمدير النظام (Super Admin).'
        : 'This sensitive data is only available to Super Admins.');
      return;
    }
    navigator.clipboard?.writeText(value).then(
      () => toast.success(isRTL ? `تم نسخ ${label}` : `${label} copied`),
      () => toast.error(isRTL ? 'فشل النسخ' : 'Copy failed'),
    );
  }, [isRTL, isSuperAdmin]);

  return (
    <div className={`group relative rounded-2xl border bg-card transition-all duration-200 hover:shadow-md
      ${selected ? 'ring-2 ring-accent border-accent/50' : isCurrentUser ? 'border-accent/40 ring-1 ring-accent/20' : 'border-border/30'}
      ${isBanned ? 'opacity-70 border-destructive/40' : ''}`}>
      <div className={`${compact ? 'p-2.5 sm:p-3 gap-2' : 'p-3 sm:p-4 gap-3'} flex flex-col sm:flex-row sm:items-start`}>
        <Checkbox checked={selected} onCheckedChange={onToggleSelect} className="mt-1 shrink-0" disabled={!canManageUser} />
        <div className="flex items-start gap-3 flex-1 min-w-0">
          <div className="relative shrink-0">
            <Avatar className={`${compact ? 'w-9 h-9' : 'w-11 h-11'} ring-2 ${isCurrentUser ? 'ring-accent/30' : 'ring-border/10'}`}>
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
              <button onClick={onToggleExpand} className="font-heading font-bold text-sm hover:text-accent transition-colors text-start truncate">
                {profile.full_name || (isRTL ? 'بدون اسم' : 'No name')}
              </button>
              {isCurrentUser && <Badge variant="outline" className="text-[9px] border-accent text-accent px-1.5 py-0">{isRTL ? 'أنت' : 'You'}</Badge>}
              {isBanned && <Badge variant="destructive" className="text-[9px] gap-0.5 px-1.5 py-0"><Ban className="w-2.5 h-2.5" />{isRTL ? 'معطّل' : 'Disabled'}</Badge>}
              {!compact && (
                <span className="text-[10px] text-muted-foreground inline-flex items-center gap-0.5">
                  <Clock className="w-2.5 h-2.5" />{formatRelative(profile.updated_at, isRTL)}
                </span>
              )}
            </div>
            {!compact && (
            <div className="flex flex-wrap items-center gap-x-3 gap-y-0.5 mt-1">
              {displayedEmail && (
                <button onClick={() => handleCopy(profile.email!, isRTL ? 'البريد' : 'Email')}
                  className={`flex items-center gap-1 text-[11px] truncate max-w-[200px] transition-colors group/cp ${canSeePII ? 'text-muted-foreground hover:text-accent' : 'text-muted-foreground/70 cursor-not-allowed'}`}
                  title={canSeePII ? (isRTL ? 'نسخ البريد' : 'Copy email') : (isRTL ? 'متاح فقط لمدير النظام' : 'Super Admin only')}>
                  <Mail className="w-3 h-3 shrink-0" />
                  <span className="truncate">{displayedEmail}</span>
                  {canSeePII
                    ? <Copy className="w-2.5 h-2.5 opacity-0 group-hover/cp:opacity-100 transition-opacity shrink-0" />
                    : <Lock className="w-2.5 h-2.5 shrink-0 opacity-60" />}
                </button>
              )}
              {displayedPhone && (
                <button onClick={() => handleCopy(profile.phone!, isRTL ? 'الهاتف' : 'Phone')}
                  className={`flex items-center gap-1 text-[11px] tech-content transition-colors group/cp ${canSeePII ? 'text-muted-foreground hover:text-accent' : 'text-muted-foreground/70 cursor-not-allowed'}`}
                  title={canSeePII ? (isRTL ? 'نسخ الهاتف' : 'Copy phone') : (isRTL ? 'متاح فقط لمدير النظام' : 'Super Admin only')}>
                  <Phone className="w-3 h-3 shrink-0" />{displayedPhone}
                  {canSeePII
                    ? <Copy className="w-2.5 h-2.5 opacity-0 group-hover/cp:opacity-100 transition-opacity shrink-0" />
                    : <Lock className="w-2.5 h-2.5 shrink-0 opacity-60" />}
                </button>
              )}
              <span className="flex items-center gap-1 text-[11px] text-muted-foreground"><Calendar className="w-3 h-3 shrink-0" />{formatDate(profile.created_at, language)}</span>
            </div>
            )}
            <div className={`flex flex-wrap items-center gap-1.5 ${compact ? 'mt-1' : 'mt-2'}`}>
              <Badge className={`${tier.color} text-[10px] border px-1.5 py-0`}>{isRTL ? tier.labelAr : tier.labelEn}</Badge>
              <Badge className={`${accType.color} text-[10px] border px-1.5 py-0 gap-0.5`}>
                <AccIcon className="w-2.5 h-2.5" />{isRTL ? accType.labelAr : accType.labelEn}
              </Badge>
              {profile.ref_id && (
                <button onClick={() => handleCopy(profile.ref_id, isRTL ? 'المعرّف' : 'Ref ID')}
                  title={isRTL ? 'نسخ المعرّف' : 'Copy Ref ID'}
                  className="inline-flex items-center gap-0.5 text-[10px] px-1.5 py-0 rounded-md border border-border/40 font-mono tech-content text-muted-foreground hover:text-accent hover:border-accent/40 transition-colors">
                  <Hash className="w-2.5 h-2.5" />{profile.ref_id}
                </button>
              )}
              {roles.map(r => {
                const cfg = roleConfig[r.role as keyof typeof roleConfig] || roleConfig.user;
                const RIcon = cfg.icon;
                return (
                  <div key={r.id} className="flex items-center">
                    <Badge className={`${cfg.badge} gap-0.5 text-[10px] border px-1.5 py-0`}><RIcon className="w-2.5 h-2.5" />{isRTL ? cfg.labelAr : cfg.labelEn}</Badge>
                    {!isCurrentUser && isSuperAdmin && (
                      <button onClick={() => onRemoveRole(r.id)} className="ms-0.5 p-0.5 rounded hover:bg-destructive/10 text-destructive/60 hover:text-destructive transition-colors">
                        <X className="w-3 h-3" />
                      </button>
                    )}
                  </div>
                );
              })}
              {roles.length === 0 && (
                <Badge variant="outline" className="text-[10px] px-1.5 py-0 text-muted-foreground border-dashed"><Shield className="w-2.5 h-2.5 me-0.5" />{isRTL ? 'عضو عادي' : 'Member'}</Badge>
              )}
            </div>
            {businessLinks.length > 0 && (
              <div className="mt-2 flex flex-wrap items-center gap-1.5">
                {businessLinks.length >= 4 && (
                  <Badge variant="outline" className="text-[10px] gap-1 px-1.5 py-0.5 border-warning/50 bg-warning/10 text-warning dark:text-warning">
                    <AlertTriangle className="w-2.5 h-2.5" />
                    {isRTL ? `مرتبط بـ ${businessLinks.length} منشآت` : `${businessLinks.length} businesses`}
                  </Badge>
                )}
                {businessLinks.map(link => {
                  const biz = link.business;
                  const cfg = staffRoleConfig[link.role];
                  return (
                    <Badge key={biz.id + (link.staffId ?? 'o')} variant="outline"
                      className={`text-[10px] gap-1 px-1.5 py-0.5 bg-success/5 border-success/30 ${!link.isActive ? 'opacity-60' : ''}`}
                      title={`${isRTL ? cfg.ar : cfg.en} • ${biz.ref_id}`}>
                      <Building2 className="w-2.5 h-2.5 text-success" />
                      <span className="truncate max-w-[120px]">{isRTL ? biz.name_ar : (biz.name_en || biz.name_ar)}</span>
                      <span className="font-mono text-success tech-content">{biz.ref_id}</span>
                      <span className={`text-[9px] px-1 rounded ${cfg.color} border-0`}>
                        {isRTL ? cfg.ar : cfg.en}
                      </span>
                      {biz.is_verified && <Check className="w-2.5 h-2.5 text-success" />}
                    </Badge>
                  );
                })}
              </div>
            )}
          </div>
        </div>
        <div className="flex items-center gap-1 flex-wrap sm:flex-nowrap shrink-0">
          <TooltipProvider delayDuration={200}>
            <Tooltip><TooltipTrigger asChild>
              <Button variant="ghost" size="icon" className="h-8 w-8 rounded-xl" onClick={onToggleExpand}>
                {expanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
              </Button>
            </TooltipTrigger><TooltipContent>{isRTL ? 'التفاصيل' : 'Details'}</TooltipContent></Tooltip>
            <Tooltip><TooltipTrigger asChild>
              <Button asChild variant="ghost" size="icon" className="h-8 w-8 rounded-xl">
                <Link to={`/admin/users/${profile.user_id}`} aria-label={isRTL ? 'فتح صفحة المستخدم' : 'Open user page'}>
                  <Eye className="w-4 h-4" />
                </Link>
              </Button>
            </TooltipTrigger><TooltipContent>{isRTL ? 'صفحة كاملة' : 'Full page'}</TooltipContent></Tooltip>
            <Tooltip><TooltipTrigger asChild>
              <Button variant="ghost" size="icon" className="h-8 w-8 rounded-xl" onClick={() => onEdit(profile)}>
                <Pencil className="w-4 h-4" />
              </Button>
            </TooltipTrigger><TooltipContent>{isRTL ? 'تعديل' : 'Edit'}</TooltipContent></Tooltip>
            {canManageUser && isSuperAdmin && (
              <Tooltip><TooltipTrigger asChild>
                <Button variant="ghost" size="icon" className="h-8 w-8 rounded-xl" onClick={() => onPassword(profile)}>
                  <KeyRound className="w-4 h-4" />
                </Button>
              </TooltipTrigger><TooltipContent>{isRTL ? 'كلمة المرور' : 'Password'}</TooltipContent></Tooltip>
            )}
            {canManageUser && (
              <Tooltip><TooltipTrigger asChild>
                <Button variant="ghost" size="icon" className={`h-8 w-8 rounded-xl ${isBanned ? 'text-success' : 'text-warning'}`} onClick={() => onToggleBan(profile)}>
                  {isBanned ? <UserCheck className="w-4 h-4" /> : <Ban className="w-4 h-4" />}
                </Button>
              </TooltipTrigger><TooltipContent>{isBanned ? (isRTL ? 'تفعيل' : 'Enable') : (isRTL ? 'تعطيل' : 'Disable')}</TooltipContent></Tooltip>
            )}
            {canManageUser && (
              <Tooltip><TooltipTrigger asChild>
                <Button variant="ghost" size="icon" className="h-8 w-8 rounded-xl text-destructive hover:bg-destructive/10" onClick={() => onDelete(profile)}>
                  <UserX className="w-4 h-4" />
                </Button>
              </TooltipTrigger><TooltipContent>{isRTL ? 'حذف' : 'Delete'}</TooltipContent></Tooltip>
            )}
            {isSuperAdmin && (addingRole ? (
              <div className="flex items-center gap-1">
                <Select value={pickedRole} onValueChange={setPickedRole}>
                  <SelectTrigger className="h-8 w-28 text-xs rounded-xl"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="super_admin">{isRTL ? 'مشرف أعلى' : 'Super Admin'}</SelectItem>
                    <SelectItem value="admin">{isRTL ? 'مشرف' : 'Admin'}</SelectItem>
                    <SelectItem value="moderator">{isRTL ? 'مشرف محتوى' : 'Moderator'}</SelectItem>
                    <SelectItem value="user">{isRTL ? 'مستخدم' : 'User'}</SelectItem>
                  </SelectContent>
                </Select>
                <Button size="sm" className="h-8 w-8 p-0 rounded-xl" onClick={() => { onAddRole(profile.user_id, pickedRole); setAddingRole(false); }}>
                  <Check className="w-3 h-3" />
                </Button>
                <Button variant="ghost" size="sm" className="h-8 w-8 p-0 rounded-xl" onClick={() => setAddingRole(false)}>
                  <X className="w-3 h-3" />
                </Button>
              </div>
            ) : (
              <Tooltip><TooltipTrigger asChild>
                <Button variant="ghost" size="icon" className="h-8 w-8 rounded-xl" onClick={() => setAddingRole(true)}>
                  <UserPlus className="w-4 h-4" />
                </Button>
              </TooltipTrigger><TooltipContent>{isRTL ? 'إضافة صلاحية' : 'Add Role'}</TooltipContent></Tooltip>
            ))}
          </TooltipProvider>
        </div>
      </div>
      {expanded && (
        <UserDetailPanel
          userId={profile.user_id}
          isRTL={isRTL}
          businessLinks={businessLinks}
          isSuperAdmin={isSuperAdmin}
          onChangeStaffRole={onChangeStaffRole}
          onRemoveStaff={onRemoveStaff}
        />
      )}
    </div>
  );
});
UserRow.displayName = 'UserRow';

/* ─── Main Component ─── */
const PAGE_SIZE = 20;

const AdminUsers = () => {
  useNoIndex();
  const { isRTL, language } = useLanguage();
  const { user, isSuperAdmin, isAdmin } = useAuth();
  const queryClient = useQueryClient();
  const [, startTransition] = useTransition();

  const [tab, setTab] = useState<'overview' | 'users' | 'staff' | 'disabled' | 'analytics'>('overview');
  const [searchTerm, setSearchTerm] = useState('');
  const [deferredSearch, setDeferredSearch] = useState('');
  const [filterRole, setFilterRole] = useState('all');
  const [filterAccountType, setFilterAccountType] = useState('all');
  const [filterTier, setFilterTier] = useState('all');
  const [filterBusinessLink, setFilterBusinessLink] = useState<'all' | 'multi' | 'none' | 'single'>('all');
  const [sortKey, setSortKey] = useState<SortKey>('created_at');
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('desc');
  const [page, setPage] = useState(1);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [expanded, setExpanded] = useState<Set<string>>(new Set());
  const [density, setDensity] = useState<Density>(() => (localStorage.getItem('qitaat_admin_users_density') as Density) || 'comfortable');
  const searchInputRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => { localStorage.setItem('qitaat_admin_users_density', density); }, [density]);

  const [activePanel, setActivePanel] = useState<ActivePanel>(null);
  const panelRef = useRef<HTMLDivElement | null>(null);

  // Open create panel and ensure it is visible: switch to a tab that renders panels,
  // then scroll the panel into view.
  const openCreatePanel = (preset?: 'individual' | 'business' | 'company') => {
    if (preset) setCreateForm(p => ({ ...p, account_type: preset }));
    if (tab !== 'users' && tab !== 'staff' && tab !== 'disabled') setTab('users');
    setActivePanel({ type: 'create' });
    setTimeout(() => panelRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' }), 80);
  };
  const [editForm, setEditForm] = useState({ full_name: '', account_type: '', membership_tier: '', phone: '', email: '' });
  const [newPassword, setNewPassword] = useState('');
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [createForm, setCreateForm] = useState({
    email: '', password: '', full_name: '', phone: '',
    account_type: 'individual', membership_tier: 'free', role: 'none',
  });
  const passwordValidationMessage = useMemo(() => getPasswordValidationMessage(newPassword, isRTL), [newPassword, isRTL]);

  // Auto-open create panel when navigated with ?create=provider|business|company|individual
  const [searchParams, setSearchParams] = useSearchParams();
  useEffect(() => {
    const createParam = searchParams.get('create');
    const typeParam = searchParams.get('type');
    const roleParam = searchParams.get('role');
    const focusParam = searchParams.get('focus');
    let mutated = false;
    const next = new URLSearchParams(searchParams);

    if (typeParam) {
      if (['individual', 'business', 'company', 'all'].includes(typeParam)) {
        setFilterAccountType(typeParam);
      }
      next.delete('type');
      mutated = true;
    }
    if (roleParam) {
      if (['super_admin', 'admin', 'moderator', 'user', 'no_role', 'all'].includes(roleParam)) {
        setFilterRole(roleParam);
      }
      next.delete('role');
      mutated = true;
    }

    if (createParam && isAdmin) {
      const preset = createParam === 'provider' ? 'business' : createParam;
      const allowed = ['individual', 'business', 'company'];
      if (allowed.includes(preset)) {
        openCreatePanel(preset as 'individual' | 'business' | 'company');
      }
      next.delete('create');
      mutated = true;
    }

    if (focusParam && isAdmin) {
      // Defer until profiles load; handled in a separate effect below.
      next.delete('focus');
      mutated = true;
      sessionStorage.setItem('qitaat_admin_users_pending_focus', focusParam);
    }

    if (mutated) {
      setSearchParams(next, { replace: true });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isAdmin, searchParams]);

  const closePanel = () => {
    setActivePanel(null); setNewPassword(''); setShowNewPassword(false);
    setCreateForm({ email: '', password: '', full_name: '', phone: '', account_type: 'individual', membership_tier: 'free', role: 'none' });
  };

  const createUserMutation = useMutation({
    mutationFn: async (payload: typeof createForm) => {
      const { data, error } = await adminCreateUser(payload as AdminCreateUserPayload);
      if (error) throw error;
      if (data?.error) throw new Error(data.error);
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-profiles'] });
      queryClient.invalidateQueries({ queryKey: ['admin-user-roles'] });
      closePanel();
      toast.success(isRTL ? 'تم إنشاء المستخدم' : 'User created');
    },
    onError: (e: unknown) => toast.error(e instanceof Error ? e.message : (isRTL ? 'فشل الإنشاء' : 'Failed to create')),
  });

  // Keyboard shortcuts: ⌘K / Ctrl+K to focus search, Esc to clear panel/selection
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement | null;
      const isTyping = target && (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.isContentEditable);
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        searchInputRef.current?.focus();
        searchInputRef.current?.select();
      } else if (e.key === 'Escape' && !isTyping) {
        if (activePanel) closePanel();
        else if (selected.size > 0) setSelected(new Set());
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [activePanel, selected]);

  const handleSearchChange = useCallback((val: string) => {
    setSearchTerm(val); setPage(1);
    startTransition(() => setDeferredSearch(val));
  }, []);

  // ─── Queries ───
  const { data: profiles = [], isLoading: loadingProfiles, refetch: refetchProfiles } = useQuery({
    queryKey: ['admin-profiles'],
    queryFn: async () => {
      const { data, error } = await listProfiles<Profile>({
        select: '*',
        orderBy: { column: 'created_at', ascending: false },
      });
      if (error) throw error;
      return data as Profile[];
    },
    enabled: !!user,
    staleTime: 2 * 60_000,
  });

  const { data: userRoles = [], isLoading: loadingRoles } = useQuery({
    queryKey: ['admin-user-roles'],
    queryFn: () => listAllUserRoles() as Promise<UserRole[]>,
    enabled: !!user,
    staleTime: 5 * 60_000,
  });

  const { data: businesses = [] } = useQuery({
    queryKey: ['admin-businesses-map'],
    queryFn: async () => {
      const { data, error } = await listAdminBusinesses<BusinessInfo>({
        select: 'id, user_id, name_ar, name_en, ref_id, username, is_active, is_verified, membership_tier, business_number',
      });
      if (error) throw error;
      return (data ?? []) as BusinessInfo[];
    },
    enabled: !!user,
    staleTime: 5 * 60_000,
  });

  const { data: businessStaff = [] } = useQuery({
    queryKey: ['admin-business-staff'],
    queryFn: async () => {
      const { data, error } = await listAllBusinessStaffForAdmin<{
        id: string;
        business_id: string;
        user_id: string;
        role: StaffRole;
        is_active: boolean;
      }>({ select: 'id, business_id, user_id, role, is_active' });
      if (error) throw error;
      return data ?? [];
    },
    enabled: !!user,
    staleTime: 5 * 60_000,
  });

  const { data: recentAdminActivity = [] } = useQuery({
    queryKey: ['admin-recent-activity'],
    queryFn: async () => {
      const { data, error } = await supabase.from('admin_activity_log')
        .select('id, user_id, action, entity_type, entity_id, created_at, details')
        .order('created_at', { ascending: false }).limit(30);
      if (error) throw error;
      return data ?? [];
    },
    enabled: !!user && (tab === 'overview' || tab === 'analytics'),
    staleTime: 60_000,
  });

  const businessMap = useMemo(() => {
    const m = new Map<string, BusinessInfo[]>();
    businesses.forEach(b => { const arr = m.get(b.user_id) || []; arr.push(b); m.set(b.user_id, arr); });
    return m;
  }, [businesses]);

  // Per-user list of business links (combining ownership and staff rows, de-duplicated by business_id).
  const businessLinksMap = useMemo(() => {
    const bizById = new Map(businesses.map(b => [b.id, b]));
    const m = new Map<string, BusinessLink[]>();
    // Seed with ownership (businesses.user_id)
    businesses.forEach(b => {
      const arr = m.get(b.user_id) || [];
      arr.push({ business: b, role: 'owner', staffId: null, isOwnerByEntity: true, isActive: b.is_active });
      m.set(b.user_id, arr);
    });
    // Add staff rows (skip duplicates per (user, business))
    businessStaff.forEach(s => {
      const biz = bizById.get(s.business_id);
      if (!biz) return;
      const arr = m.get(s.user_id) || [];
      const existing = arr.find(l => l.business.id === s.business_id);
      if (existing) {
        // If user is the entity owner, keep it locked but record the staffId for the underlying row.
        if (existing.isOwnerByEntity) {
          existing.staffId = s.id;
          existing.isActive = existing.isActive && s.is_active;
          return;
        }
        return;
      }
      arr.push({ business: biz, role: s.role, staffId: s.id, isOwnerByEntity: false, isActive: s.is_active });
      m.set(s.user_id, arr);
    });
    return m;
  }, [businesses, businessStaff]);

  const roleMap = useMemo(() => {
    const m = new Map<string, UserRole[]>();
    userRoles.forEach(r => { const arr = m.get(r.user_id) || []; arr.push(r); m.set(r.user_id, arr); });
    return m;
  }, [userRoles]);

  // ─── Mutations ───
  const addRoleMutation = useMutation({
    mutationFn: ({ userId, role }: { userId: string; role: string }) =>
      grantRole(userId, role as Tables<'user_roles'>['role']),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['admin-user-roles'] }); toast.success(isRTL ? 'تم إضافة الصلاحية' : 'Role added'); },
    onError: (err: unknown) => {
      const code = (err as { normalized?: NormalizedRpcError })?.normalized?.code;
      toast.error(
        code === 'DUPLICATE_KEY'
          ? (isRTL ? 'الصلاحية موجودة' : 'Role exists')
          : (isRTL ? 'فشل إضافة الصلاحية' : 'Failed to add role')
      );
    },
  });

  const removeRoleMutation = useMutation({
    mutationFn: (id: string) => revokeRoleById(id),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['admin-user-roles'] }); toast.success(isRTL ? 'تم إزالة الصلاحية' : 'Role removed'); },
    onError: () => toast.error(isRTL ? 'فشل الإزالة' : 'Failed to remove'),
  });

  const updateStaffRoleMutation = useMutation({
    mutationFn: async ({ staffId, role }: { staffId: string; role: StaffRole }) => {
      await updateBusinessStaffRole(staffId, role);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-business-staff'] });
      toast.success(isRTL ? 'تم تحديث الصلاحية' : 'Permission updated');
    },
    onError: (e: unknown) => toast.error(e instanceof Error ? e.message : (isRTL ? 'فشل التحديث' : 'Failed to update')),
  });

  const removeStaffMutation = useMutation({
    mutationFn: async (staffId: string) => {
      await removeBusinessStaff(staffId);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-business-staff'] });
      toast.success(isRTL ? 'تمت الإزالة من المنشأة' : 'Removed from business');
    },
    onError: (e: unknown) => toast.error(e instanceof Error ? e.message : (isRTL ? 'فشل الإزالة' : 'Failed to remove')),
  });

  const updateProfileMutation = useMutation({
    mutationFn: async ({ profileId, data }: { profileId: string; data: Partial<Profile> }) => {
      const { error } = await updateProfileById({ id: profileId, values: data });
      if (error) throw error;
    },
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['admin-profiles'] }); closePanel(); toast.success(isRTL ? 'تم التحديث' : 'Updated'); },
    onError: () => toast.error(isRTL ? 'فشل التحديث' : 'Failed to update'),
  });

  const toggleBanMutation = useMutation({
    mutationFn: async ({ profileId, isBanned }: { profileId: string; isBanned: boolean }) => {
      const { error } = await updateProfileById({ id: profileId, values: { is_banned: isBanned } });
      if (error) throw error;
    },
    onSuccess: (_, v) => { queryClient.invalidateQueries({ queryKey: ['admin-profiles'] }); toast.success(v.isBanned ? (isRTL ? 'تم التعطيل' : 'Disabled') : (isRTL ? 'تم التفعيل' : 'Enabled')); },
    onError: () => toast.error(isRTL ? 'فشل' : 'Failed'),
  });

  const bulkBanMutation = useMutation({
    mutationFn: async ({ ids, isBanned }: { ids: string[]; isBanned: boolean }) => {
      const { error } = await updateProfilesByIds({ ids, values: { is_banned: isBanned } });
      if (error) throw error;
    },
    onSuccess: (_, v) => {
      queryClient.invalidateQueries({ queryKey: ['admin-profiles'] });
      setSelected(new Set());
      toast.success(isRTL ? `تم ${v.isBanned ? 'تعطيل' : 'تفعيل'} ${v.ids.length} حساب` : `${v.ids.length} accounts ${v.isBanned ? 'disabled' : 'enabled'}`);
    },
    onError: () => toast.error(isRTL ? 'فشلت العملية الجماعية' : 'Bulk action failed'),
  });

  const changePasswordMutation = useMutation({
    mutationFn: async ({ targetUserId, password }: { targetUserId: string; password: string }) => {
      const res = await adminResetPassword({ target_user_id: targetUserId, action: 'change_password', new_password: password });
      if (res.error) throw res.error;
      if (res.data?.error) throw new Error(res.data.error);
    },
    onSuccess: () => { closePanel(); toast.success(isRTL ? 'تم تغيير كلمة المرور' : 'Password changed'); },
    onError: (err: unknown) => toast.error(err instanceof Error ? err.message : (isRTL ? 'فشل' : 'Failed')),
  });

  const sendResetLinkMutation = useMutation({
    mutationFn: async (targetUserId: string) => {
      const res = await adminResetPassword({ target_user_id: targetUserId, action: 'send_reset_link' });
      if (res.error) throw res.error;
      if (res.data?.error) throw new Error(res.data.error);
    },
    onSuccess: () => toast.success(isRTL ? 'تم إرسال الرابط' : 'Link sent'),
    onError: (err: unknown) => toast.error(err instanceof Error ? err.message : (isRTL ? 'فشل' : 'Failed')),
  });

  const deleteUserMutation = useMutation({
    mutationFn: async (targetUserId: string) => {
      const res = await adminDeleteUser({ target_user_id: targetUserId });
      if (res.error) throw res.error;
      if (res.data?.error) throw new Error(res.data.error);
    },
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['admin-profiles'] }); queryClient.invalidateQueries({ queryKey: ['admin-user-roles'] }); closePanel(); toast.success(isRTL ? 'تم الحذف' : 'Deleted'); },
    onError: () => toast.error(isRTL ? 'فشل الحذف' : 'Failed to delete'),
  });

  const openEdit = useCallback((profile: Profile) => {
    setActivePanel({ type: 'edit', profile });
    setEditForm({
      full_name: profile.full_name || '',
      account_type: profile.account_type || 'individual',
      membership_tier: profile.membership_tier || 'free',
      // PII fields are only prefilled for Super Admin. Non-super admins see empty
      // placeholders so masked values are never leaked through the edit form.
      phone: isSuperAdmin ? (profile.phone || '') : '',
      email: isSuperAdmin ? (profile.email || '') : '',
    });
  }, [isSuperAdmin]);

  const handleSaveProfile = () => {
    if (activePanel?.type !== 'edit') return;
    const trimmed = editForm.full_name.trim();
    if (!trimmed) { toast.error(isRTL ? 'الاسم مطلوب' : 'Name required'); return; }
    const data: Partial<Profile> = {
      full_name: trimmed,
      account_type: editForm.account_type as Profile['account_type'],
      membership_tier: editForm.membership_tier as Profile['membership_tier'],
    };
    // Only Super Admin may write PII fields; for others we keep existing values.
    if (isSuperAdmin) {
      data.phone = editForm.phone.trim() || '';
      data.email = editForm.email.trim() || null;
    }
    updateProfileMutation.mutate({ profileId: activePanel.profile.id, data });
  };

  // ─── Filtering ───
  const baseFiltered = useMemo(() => {
    const lower = deferredSearch.toLowerCase();
    return profiles.filter(p => {
      const bizList = businessMap.get(p.user_id) || [];
      const matchesSearch = !deferredSearch
        || p.full_name?.toLowerCase().includes(lower)
        || p.email?.toLowerCase().includes(lower)
        || p.phone?.includes(deferredSearch)
        || p.ref_id?.toLowerCase().includes(lower)
        || bizList.some(b => b.ref_id?.toLowerCase().includes(lower) || b.name_ar?.toLowerCase().includes(lower) || b.username?.toLowerCase().includes(lower));
      const roles = roleMap.get(p.user_id) || [];
      const matchesRole = filterRole === 'all' || (filterRole === 'no_role' && roles.length === 0) || roles.some(r => r.role === filterRole);
      const matchesType = filterAccountType === 'all' || p.account_type === filterAccountType;
      const matchesTier = filterTier === 'all' || p.membership_tier === filterTier;
      const linkCount = (businessLinksMap.get(p.user_id) || []).length;
      const matchesBizLink =
        filterBusinessLink === 'all'
        || (filterBusinessLink === 'none' && linkCount === 0)
        || (filterBusinessLink === 'single' && linkCount === 1)
        || (filterBusinessLink === 'multi' && linkCount > 1);
      return matchesSearch && matchesRole && matchesType && matchesTier && matchesBizLink;
    });
  }, [profiles, deferredSearch, filterRole, filterAccountType, filterTier, filterBusinessLink, roleMap, businessMap, businessLinksMap]);

  const tabFiltered = useMemo(() => {
    if (tab === 'staff') return baseFiltered.filter(p => {
      const r = roleMap.get(p.user_id) || [];
      return r.some(x => x.role === 'super_admin' || x.role === 'admin' || x.role === 'moderator');
    });
    if (tab === 'disabled') return baseFiltered.filter(p => p.is_banned);
    return baseFiltered;
  }, [baseFiltered, tab, roleMap]);

  const sorted = useMemo(() => {
    const copy = [...tabFiltered];
    copy.sort((a, b) => {
      let av: string | number = '', bv: string | number = '';
      if (sortKey === 'created_at') { av = new Date(a.created_at).getTime(); bv = new Date(b.created_at).getTime(); }
      else if (sortKey === 'full_name') { av = (a.full_name || '').toLowerCase(); bv = (b.full_name || '').toLowerCase(); }
      else if (sortKey === 'membership_tier') { av = a.membership_tier; bv = b.membership_tier; }
      else if (sortKey === 'account_type') { av = a.account_type; bv = b.account_type; }
      if (av < bv) return sortDir === 'asc' ? -1 : 1;
      if (av > bv) return sortDir === 'asc' ? 1 : -1;
      return 0;
    });
    return copy;
  }, [tabFiltered, sortKey, sortDir]);

  const totalPages = Math.max(1, Math.ceil(sorted.length / PAGE_SIZE));
  useEffect(() => { if (page > totalPages) setPage(1); }, [totalPages, page]);
  const paginated = useMemo(() => sorted.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE), [sorted, page]);

  const stats = useMemo(() => {
    const totalUsers = profiles.length;
    const superAdmins = userRoles.filter(r => r.role === 'super_admin').length;
    const admins = userRoles.filter(r => r.role === 'admin').length;
    const moderators = userRoles.filter(r => r.role === 'moderator').length;
    const bannedCount = profiles.filter(p => p.is_banned).length;
    const providers = profiles.filter(p => p.account_type === 'business' || p.account_type === 'company').length;
    const verified = profiles.filter(p => p.phone_verified).length;
    const onboarded = profiles.filter(p => p.is_onboarded).length;
    const tierDist = { free: 0, basic: 0, premium: 0, enterprise: 0 };
    profiles.forEach(p => { const t = p.membership_tier as keyof typeof tierDist; if (t in tierDist) tierDist[t]++; });
    const now = Date.now();
    const weekAgo = now - 7 * 86400000;
    const twoWeeksAgo = now - 14 * 86400000;
    const dayAgo = now - 86400000;
    let recentUsers = 0, prevWeekUsers = 0, last24h = 0;
    profiles.forEach(p => {
      const t = new Date(p.created_at).getTime();
      if (isNaN(t)) return;
      if (t > weekAgo) recentUsers++;
      else if (t > twoWeeksAgo) prevWeekUsers++;
      if (t > dayAgo) last24h++;
    });
    const wow = prevWeekUsers === 0
      ? (recentUsers > 0 ? 100 : 0)
      : Math.round(((recentUsers - prevWeekUsers) / prevWeekUsers) * 100);
    return { totalUsers, superAdmins, admins, moderators, bannedCount, tierDist, recentUsers, prevWeekUsers, wow, last24h, providers, verified, onboarded };
  }, [profiles, userRoles]);

  // ─── Analytics: signups over 30 days ───
  const signupSeries = useMemo(() => {
    const days: { date: string; total: number; providers: number; label: string }[] = [];
    const today = new Date(); today.setHours(0, 0, 0, 0);
    for (let i = 29; i >= 0; i--) {
      const d = new Date(today); d.setDate(d.getDate() - i);
      const key = d.toISOString().split('T')[0];
      days.push({ date: key, total: 0, providers: 0, label: `${d.getDate()}/${d.getMonth() + 1}` });
    }
    const idx = new Map(days.map((d, i) => [d.date, i]));
    profiles.forEach(p => {
      const d = new Date(p.created_at); if (isNaN(d.getTime())) return;
      const key = d.toISOString().split('T')[0];
      const i = idx.get(key); if (i === undefined) return;
      days[i].total++;
      if (p.account_type === 'business' || p.account_type === 'company') days[i].providers++;
    });
    return days;
  }, [profiles]);

  const accountTypePie = useMemo(() => [
    { name: isRTL ? 'أفراد' : 'Individuals', value: profiles.filter(p => p.account_type === 'individual').length, color: 'hsl(217 91% 60%)' },
    { name: isRTL ? 'مزودي خدمة' : 'Providers', value: profiles.filter(p => p.account_type === 'business').length, color: 'hsl(160 84% 39%)' },
    { name: isRTL ? 'شركات' : 'Companies', value: profiles.filter(p => p.account_type === 'company').length, color: 'hsl(271 91% 65%)' },
  ], [profiles, isRTL]);

  const tierBar = useMemo(() => Object.entries(stats.tierDist).map(([k, v]) => ({
    name: isRTL ? tierConfig[k as keyof typeof tierConfig].labelAr : tierConfig[k as keyof typeof tierConfig].labelEn,
    count: v,
  })), [stats.tierDist, isRTL]);

  const exportCSV = () => {
    const rows = sorted.map(p => {
      const roles = (roleMap.get(p.user_id) || []).map(r => r.role).join(', ') || 'none';
      const bizList = businessMap.get(p.user_id) || [];
      const bizRefs = bizList.map(b => b.ref_id).join(' | ');
      const bizNames = bizList.map(b => b.name_ar).join(' | ');
      const created = p.created_at ? new Date(p.created_at).toISOString().split('T')[0] : '';
      return [p.ref_id, p.full_name || '', p.email || '', p.phone || '', p.account_type, bizRefs, bizNames, p.membership_tier, roles, p.is_banned ? 'Yes' : 'No', created]
        .map(v => `"${String(v).replace(/"/g, '""')}"`).join(',');
    });
    const csv = '\uFEFF' + ['Ref,Name,Email,Phone,Type,BizRefs,BizNames,Tier,Roles,Banned,Created', ...rows].join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a'); a.href = url; a.download = `users_${new Date().toISOString().split('T')[0]}.csv`; a.click();
    URL.revokeObjectURL(url);
    toast.success(isRTL ? 'تم التصدير' : 'Exported');
  };

  const toggleSelect = useCallback((id: string) => {
    setSelected(prev => { const n = new Set(prev); if (n.has(id)) n.delete(id); else n.add(id); return n; });
  }, []);
  const toggleExpand = useCallback((id: string) => {
    setExpanded(prev => { const n = new Set(prev); if (n.has(id)) n.delete(id); else n.add(id); return n; });
  }, []);

  const allOnPageSelected = paginated.length > 0 && paginated.every(p => selected.has(p.id));
  const toggleSelectPage = () => {
    setSelected(prev => {
      const n = new Set(prev);
      if (allOnPageSelected) paginated.forEach(p => n.delete(p.id));
      else paginated.forEach(p => n.add(p.id));
      return n;
    });
  };

  const cycleSort = (key: SortKey) => {
    if (sortKey === key) setSortDir(d => d === 'asc' ? 'desc' : 'asc');
    else { setSortKey(key); setSortDir('desc'); }
  };

  if (!user) {
    return <DashboardLayout><div className="flex items-center justify-center h-96"><p className="text-muted-foreground">{isRTL ? 'يرجى تسجيل الدخول' : 'Please log in'}</p></div></DashboardLayout>;
  }

  return (
    <DashboardLayout>
      <div className="space-y-5">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div>
            <h1 className="font-heading font-bold text-2xl text-foreground flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-accent/20 to-primary/10 flex items-center justify-center shadow-sm">
                <Users className="w-5 h-5 text-accent" />
              </div>
              {isRTL ? 'إدارة المستخدمين' : 'User Management'}
            </h1>
            <p className="text-muted-foreground font-body mt-1 text-sm">
              {isRTL ? `${stats.totalUsers} مستخدم • ${stats.providers} مزود • ${stats.recentUsers} جديد هذا الأسبوع` : `${stats.totalUsers} users • ${stats.providers} providers • ${stats.recentUsers} new this week`}
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" className="rounded-xl gap-2 h-9" onClick={() => refetchProfiles()}>
              <RefreshCw className="w-4 h-4" />
              <span className="hidden sm:inline">{isRTL ? 'تحديث' : 'Refresh'}</span>
            </Button>
            <Button variant="outline" size="sm" onClick={exportCSV} className="gap-2 rounded-xl h-9">
              <Download className="w-4 h-4" />
              <span className="hidden sm:inline">{isRTL ? 'تصدير CSV' : 'Export CSV'}</span>
            </Button>
            {isAdmin && (
              <Button size="sm" className="gap-2 rounded-xl h-9" onClick={() => openCreatePanel()}>
                <UserPlus className="w-4 h-4" />
                <span className="hidden sm:inline">{isRTL ? 'إنشاء مستخدم' : 'New User'}</span>
              </Button>
            )}
          </div>
        </div>

        {/* Tabs */}
        <Tabs value={tab} onValueChange={(v) => { setTab(v as typeof tab); setPage(1); setSelected(new Set()); }}>
          <TabsList className="grid w-full grid-cols-2 sm:grid-cols-5 h-auto p-1 rounded-2xl bg-muted/40">
            <TabsTrigger value="overview" className="rounded-xl gap-1.5 py-2"><Sparkles className="w-3.5 h-3.5" />{isRTL ? 'نظرة عامة' : 'Overview'}</TabsTrigger>
            <TabsTrigger value="users" className="rounded-xl gap-1.5 py-2"><Users className="w-3.5 h-3.5" />{isRTL ? 'المستخدمون' : 'Users'}</TabsTrigger>
            <TabsTrigger value="staff" className="rounded-xl gap-1.5 py-2"><Crown className="w-3.5 h-3.5" />{isRTL ? 'فريق الإدارة' : 'Staff'}</TabsTrigger>
            <TabsTrigger value="disabled" className="rounded-xl gap-1.5 py-2"><Ban className="w-3.5 h-3.5" />{isRTL ? 'المعطّلون' : 'Disabled'}</TabsTrigger>
            <TabsTrigger value="analytics" className="rounded-xl gap-1.5 py-2"><BarChart3 className="w-3.5 h-3.5" />{isRTL ? 'تحليلات' : 'Analytics'}</TabsTrigger>
          </TabsList>

          {/* OVERVIEW */}
          <TabsContent value="overview" className="space-y-5 mt-5">
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
              <KpiCard icon={Users} label={isRTL ? 'إجمالي المستخدمين' : 'Total Users'} value={stats.totalUsers} gradient="from-primary/10 to-primary/5" iconBg="bg-primary/15 text-primary" />
              <KpiCard icon={Briefcase} label={isRTL ? 'مزودي الخدمات' : 'Providers'} value={stats.providers} gradient="from-success/10 to-success/5" iconBg="bg-success/15 text-success" />
              <KpiCard
                icon={UserCheck}
                label={isRTL ? 'مكتمل التسجيل' : 'Onboarded'}
                value={stats.onboarded}
                gradient="from-info/10 to-info/5"
                iconBg="bg-info/15 text-info"
                trend={stats.totalUsers > 0 ? `${Math.round((stats.onboarded / stats.totalUsers) * 100)}%` : undefined}
              />
              <KpiCard
                icon={TrendingUp}
                label={isRTL ? `جديد هذا الأسبوع • ${stats.last24h} اليوم` : `New 7d • ${stats.last24h} today`}
                value={stats.recentUsers}
                gradient="from-warning/10 to-warning/5"
                iconBg="bg-warning/15 text-warning"
                trend={`${stats.wow >= 0 ? '' : '-'}${Math.abs(stats.wow)}%`}
              />
            </div>
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
              <div className="lg:col-span-2 rounded-2xl border border-border/30 bg-card p-5">
                <h3 className="font-heading font-bold text-sm flex items-center gap-2 mb-3"><TrendingUp className="w-4 h-4 text-accent" />{isRTL ? 'تسجيلات آخر 30 يوم' : 'Signups (30 days)'}</h3>
                <div className="h-56">
                  <ResponsiveContainer>
                    <AreaChart data={signupSeries}>
                      <defs>
                        <linearGradient id="colTotal" x1="0" y1="0" x2="0" y2="1"><stop offset="5%" stopColor="hsl(var(--accent))" stopOpacity={0.4} /><stop offset="95%" stopColor="hsl(var(--accent))" stopOpacity={0} /></linearGradient>
                        <linearGradient id="colProv" x1="0" y1="0" x2="0" y2="1"><stop offset="5%" stopColor="hsl(160 84% 39%)" stopOpacity={0.4} /><stop offset="95%" stopColor="hsl(160 84% 39%)" stopOpacity={0} /></linearGradient>
                      </defs>
                      <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                      <XAxis dataKey="label" tick={{ fontSize: 10 }} reversed={isRTL} />
                      <YAxis tick={{ fontSize: 10 }} orientation={isRTL ? 'right' : 'left'} />
                      <RTooltip contentStyle={{ background: 'hsl(var(--card))', border: '1px solid hsl(var(--border))', borderRadius: 8, fontSize: 12 }} />
                      <Area type="monotone" dataKey="total" stroke="hsl(var(--accent))" fill="url(#colTotal)" name={isRTL ? 'الكل' : 'Total'} />
                      <Area type="monotone" dataKey="providers" stroke="hsl(160 84% 39%)" fill="url(#colProv)" name={isRTL ? 'مزودين' : 'Providers'} />
                    </AreaChart>
                  </ResponsiveContainer>
                </div>
              </div>
              <div className="rounded-2xl border border-border/30 bg-card p-5">
                <h3 className="font-heading font-bold text-sm flex items-center gap-2 mb-3"><Activity className="w-4 h-4 text-accent" />{isRTL ? 'آخر النشاط الإداري' : 'Recent Admin Activity'}</h3>
                <div className="space-y-2 max-h-56 overflow-y-auto no-scrollbar">
                  {recentAdminActivity.length === 0 ? (
                    <p className="text-xs text-muted-foreground text-center py-6">{isRTL ? 'لا يوجد نشاط' : 'No activity'}</p>
                  ) : recentAdminActivity.slice(0, 12).map(a => (
                    <div key={a.id} className="flex items-start gap-2 rounded-xl bg-muted/30 px-2.5 py-1.5">
                      <div className="w-2 h-2 rounded-full bg-accent mt-1.5 shrink-0" />
                      <div className="flex-1 min-w-0">
                        <p className="text-xs font-medium truncate">{a.action}</p>
                        <p className="text-[10px] text-muted-foreground">{formatRelative(a.created_at, isRTL)}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </TabsContent>

          {/* USERS / STAFF / DISABLED — shared list view */}
          {(['users', 'staff', 'disabled'] as const).map(t => (
            <TabsContent key={t} value={t} className="space-y-4 mt-5">
              {/* Quick filter chips */}
              <div className="flex items-center gap-2 flex-wrap">
                {([
                  { key: 'recent', icon: Zap, ar: 'أحدث 7 أيام', en: 'New 7d', active: false, onClick: () => { setSortKey('created_at'); setSortDir('desc'); } },
                  { key: 'providers', icon: Briefcase, ar: 'مزودي الخدمات', en: 'Providers', active: filterAccountType === 'business', onClick: () => { setFilterAccountType(filterAccountType === 'business' ? 'all' : 'business'); setPage(1); } },
                  { key: 'companies', icon: Building2, ar: 'الشركات', en: 'Companies', active: filterAccountType === 'company', onClick: () => { setFilterAccountType(filterAccountType === 'company' ? 'all' : 'company'); setPage(1); } },
                  { key: 'premium', icon: Crown, ar: 'مميز فأعلى', en: 'Premium+', active: filterTier === 'premium' || filterTier === 'enterprise', onClick: () => { setFilterTier(filterTier === 'premium' ? 'enterprise' : filterTier === 'enterprise' ? 'all' : 'premium'); setPage(1); } },
                  { key: 'no_role', icon: Shield, ar: 'بدون صلاحيات', en: 'No role', active: filterRole === 'no_role', onClick: () => { setFilterRole(filterRole === 'no_role' ? 'all' : 'no_role'); setPage(1); } },
                  { key: 'multi', icon: Link2, ar: 'مرتبط بعدة منشآت', en: 'Multi-business', active: filterBusinessLink === 'multi', onClick: () => { setFilterBusinessLink(filterBusinessLink === 'multi' ? 'all' : 'multi'); setPage(1); } },
                ]).map(c => {
                  const Icon = c.icon;
                  return (
                    <button key={c.key} onClick={c.onClick}
                      className={`text-[11px] inline-flex items-center gap-1 px-2.5 py-1 rounded-full border transition-all
                        ${c.active ? 'bg-accent text-accent-foreground border-accent shadow-sm' : 'bg-card border-border/40 text-muted-foreground hover:border-accent/40 hover:text-foreground'}`}>
                      <Icon className="w-3 h-3" />{isRTL ? c.ar : c.en}
                    </button>
                  );
                })}
              </div>

              {/* Filters */}
              <div className="rounded-2xl border border-border/30 bg-card p-4">
                <div className="flex flex-col md:flex-row gap-3">
                  <div className="relative flex-1">
                    <Search className="absolute top-1/2 -translate-y-1/2 text-muted-foreground w-4 h-4" style={{ [isRTL ? 'right' : 'left']: '12px' }} />
                    <Input ref={searchInputRef} value={searchTerm} onChange={e => handleSearchChange(e.target.value)}
                      placeholder={isRTL ? 'بحث: اسم، بريد، هاتف، معرّف، أو نشاط تجاري...' : 'Search name, email, phone, ID, or business...'}
                      className="ps-10 pe-16 h-10 rounded-xl bg-muted/30 border-border/20 focus:bg-background" dir="auto" />
                    <kbd className="hidden sm:inline-flex absolute top-1/2 -translate-y-1/2 items-center gap-0.5 px-1.5 py-0.5 rounded-md border border-border/40 bg-background/80 text-[10px] text-muted-foreground font-mono pointer-events-none"
                      style={{ [isRTL ? 'left' : 'right']: '10px' }}>
                      <Command className="w-2.5 h-2.5" />K
                    </kbd>
                  </div>
                  <Select value={filterRole} onValueChange={(v) => { setFilterRole(v); setPage(1); }}>
                    <SelectTrigger className="w-full md:w-40 h-10 rounded-xl"><Filter className="w-4 h-4 me-2 text-muted-foreground" /><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">{isRTL ? 'كل الصلاحيات' : 'All Roles'}</SelectItem>
                      <SelectItem value="super_admin">{isRTL ? 'مشرف أعلى' : 'Super Admin'}</SelectItem>
                      <SelectItem value="admin">{isRTL ? 'مشرف' : 'Admin'}</SelectItem>
                      <SelectItem value="moderator">{isRTL ? 'مشرف محتوى' : 'Moderator'}</SelectItem>
                      <SelectItem value="user">{isRTL ? 'مستخدم' : 'User'}</SelectItem>
                      <SelectItem value="no_role">{isRTL ? 'بدون صلاحيات' : 'No Role'}</SelectItem>
                    </SelectContent>
                  </Select>
                  <Select value={filterAccountType} onValueChange={(v) => { setFilterAccountType(v); setPage(1); }}>
                    <SelectTrigger className="w-full md:w-40 h-10 rounded-xl"><Building2 className="w-4 h-4 me-2 text-muted-foreground" /><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">{isRTL ? 'كل الأنواع' : 'All Types'}</SelectItem>
                      <SelectItem value="individual">{isRTL ? 'أفراد' : 'Individuals'}</SelectItem>
                      <SelectItem value="business">{isRTL ? 'مزودين' : 'Providers'}</SelectItem>
                      <SelectItem value="company">{isRTL ? 'شركات' : 'Companies'}</SelectItem>
                    </SelectContent>
                  </Select>
                  <Select value={filterTier} onValueChange={(v) => { setFilterTier(v); setPage(1); }}>
                    <SelectTrigger className="w-full md:w-36 h-10 rounded-xl"><Sparkles className="w-4 h-4 me-2 text-muted-foreground" /><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">{isRTL ? 'كل العضويات' : 'All Tiers'}</SelectItem>
                      <SelectItem value="free">{isRTL ? 'مجاني' : 'Free'}</SelectItem>
                      <SelectItem value="basic">{isRTL ? 'أساسي' : 'Basic'}</SelectItem>
                      <SelectItem value="premium">{isRTL ? 'مميز' : 'Premium'}</SelectItem>
                      <SelectItem value="enterprise">{isRTL ? 'مؤسسات' : 'Enterprise'}</SelectItem>
                    </SelectContent>
                  </Select>
                  <Select value={filterBusinessLink} onValueChange={(v) => { setFilterBusinessLink(v as typeof filterBusinessLink); setPage(1); }}>
                    <SelectTrigger className="w-full md:w-44 h-10 rounded-xl"><Link2 className="w-4 h-4 me-2 text-muted-foreground" /><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">{isRTL ? 'كل الارتباطات' : 'All links'}</SelectItem>
                      <SelectItem value="none">{isRTL ? 'بدون منشآت' : 'No business'}</SelectItem>
                      <SelectItem value="single">{isRTL ? 'منشأة واحدة' : 'Single business'}</SelectItem>
                      <SelectItem value="multi">{isRTL ? 'عدة منشآت' : 'Multiple businesses'}</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                {/* Sort + select-all + counter */}
                <div className="flex items-center gap-2 mt-3 pt-3 border-t border-border/20 flex-wrap">
                  <Checkbox checked={allOnPageSelected} onCheckedChange={toggleSelectPage} />
                  <span className="text-[11px] text-muted-foreground">
                    {isRTL ? `${sorted.length} نتيجة • صفحة ${page}/${totalPages}` : `${sorted.length} results • Page ${page}/${totalPages}`}
                  </span>
                  {(deferredSearch || filterRole !== 'all' || filterAccountType !== 'all' || filterTier !== 'all' || filterBusinessLink !== 'all') && (
                    <button
                      onClick={() => { handleSearchChange(''); setFilterRole('all'); setFilterAccountType('all'); setFilterTier('all'); setFilterBusinessLink('all'); }}
                      className="text-[11px] inline-flex items-center gap-1 px-2 py-1 rounded-lg border border-dashed border-border/50 text-muted-foreground hover:text-foreground hover:border-border transition-colors"
                    >
                      <X className="w-3 h-3" />{isRTL ? 'مسح الفلاتر' : 'Clear filters'}
                    </button>
                  )}
                  <div className="ms-auto flex items-center gap-1.5 flex-wrap">
                    <div className="inline-flex rounded-lg border border-border/30 p-0.5 bg-muted/30">
                      <button onClick={() => setDensity('comfortable')}
                        className={`p-1 rounded ${density === 'comfortable' ? 'bg-card shadow-sm text-accent' : 'text-muted-foreground hover:text-foreground'}`}
                        title={isRTL ? 'مريح' : 'Comfortable'} aria-label={isRTL ? 'مريح' : 'Comfortable'}>
                        <LayoutList className="w-3.5 h-3.5" />
                      </button>
                      <button onClick={() => setDensity('compact')}
                        className={`p-1 rounded ${density === 'compact' ? 'bg-card shadow-sm text-accent' : 'text-muted-foreground hover:text-foreground'}`}
                        title={isRTL ? 'مضغوط' : 'Compact'} aria-label={isRTL ? 'مضغوط' : 'Compact'}>
                        <Rows3 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                    <span className="text-[11px] text-muted-foreground">{isRTL ? 'ترتيب:' : 'Sort:'}</span>
                    {([
                      ['created_at', isRTL ? 'الأحدث' : 'Date'],
                      ['full_name', isRTL ? 'الاسم' : 'Name'],
                      ['membership_tier', isRTL ? 'العضوية' : 'Tier'],
                      ['account_type', isRTL ? 'النوع' : 'Type'],
                    ] as const).map(([k, lbl]) => (
                      <button key={k} onClick={() => cycleSort(k)}
                        className={`text-[11px] gap-1 inline-flex items-center px-2 py-1 rounded-lg border transition-colors
                          ${sortKey === k ? 'border-accent text-accent bg-accent/10' : 'border-border/30 text-muted-foreground hover:border-border'}`}>
                        {lbl}
                        {sortKey === k ? (sortDir === 'asc' ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />) : <ArrowUpDown className="w-3 h-3" />}
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              {/* Bulk action bar */}
              {selected.size > 0 && (
                <div className="rounded-2xl border border-accent/40 bg-accent/5 p-3 flex items-center gap-3 flex-wrap animate-in slide-in-from-top-1">
                  <Badge className="bg-accent text-accent-foreground gap-1"><Check className="w-3 h-3" />{selected.size}</Badge>
                  <span className="text-xs text-foreground">{isRTL ? 'محدد' : 'selected'}</span>
                  <div className="ms-auto flex items-center gap-2 flex-wrap">
                    <Button variant="outline" size="sm" className="rounded-xl gap-1.5 h-8" onClick={() => {
                      const selectedProfiles = sorted.filter(p => selected.has(p.id));
                      const rows = selectedProfiles.map(p => {
                        const roles = (roleMap.get(p.user_id) || []).map(r => r.role).join(', ') || 'none';
                        const created = p.created_at ? new Date(p.created_at).toISOString().split('T')[0] : '';
                        return [p.ref_id, p.full_name || '', p.email || '', p.phone || '', p.account_type, p.membership_tier, roles, p.is_banned ? 'Yes' : 'No', created]
                          .map(v => `"${String(v).replace(/"/g, '""')}"`).join(',');
                      });
                      const csv = '\uFEFF' + ['Ref,Name,Email,Phone,Type,Tier,Roles,Banned,Created', ...rows].join('\n');
                      const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
                      const url = URL.createObjectURL(blob);
                      const a = document.createElement('a'); a.href = url; a.download = `users_selected_${new Date().toISOString().split('T')[0]}.csv`; a.click();
                      URL.revokeObjectURL(url);
                      toast.success(isRTL ? `تم تصدير ${selectedProfiles.length}` : `Exported ${selectedProfiles.length}`);
                    }}>
                      <Download className="w-3.5 h-3.5" />{isRTL ? 'تصدير المحدد' : 'Export'}
                    </Button>
                    {isSuperAdmin && (<>
                    <Button variant="outline" size="sm" className="rounded-xl gap-1.5 h-8 text-warning border-warning"
                      onClick={() => {
                        const safeIds = sorted.filter(p => {
                          if (!selected.has(p.id)) return false;
                          if (p.user_id === user.id) return false;
                          const r = roleMap.get(p.user_id) || [];
                          return !r.some(x => x.role === 'super_admin' || x.role === 'admin');
                        }).map(p => p.id);
                        const skipped = selected.size - safeIds.length;
                        if (safeIds.length === 0) {
                          toast.error(isRTL ? 'لا يمكن تعطيل حسابك أو حسابات المشرفين' : 'Cannot disable your own account or admin accounts');
                          return;
                        }
                        if (skipped > 0) toast.warning(isRTL ? `تم تجاهل ${skipped} حساب محمي` : `Skipped ${skipped} protected account(s)`);
                        bulkBanMutation.mutate({ ids: safeIds, isBanned: true });
                      }}
                      disabled={bulkBanMutation.isPending}>
                      <Ban className="w-3.5 h-3.5" />{isRTL ? 'تعطيل' : 'Disable'}
                    </Button>
                    <Button variant="outline" size="sm" className="rounded-xl gap-1.5 h-8 text-success border-success"
                      onClick={() => bulkBanMutation.mutate({ ids: Array.from(selected), isBanned: false })}
                      disabled={bulkBanMutation.isPending}>
                      <UserCheck className="w-3.5 h-3.5" />{isRTL ? 'تفعيل' : 'Enable'}
                    </Button>
                    </>)}
                    <Button variant="ghost" size="sm" className="rounded-xl h-8" onClick={() => setSelected(new Set())}>
                      <X className="w-3.5 h-3.5" />{isRTL ? 'إلغاء' : 'Clear'}
                    </Button>
                  </div>
                </div>
              )}

              {/* Inline panels */}
              {activePanel?.type === 'create' && (
                <div ref={panelRef} className="rounded-2xl border border-accent/30 bg-gradient-to-r from-accent/5 to-transparent p-5 animate-in slide-in-from-top-2 scroll-mt-24">
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="font-heading font-bold text-lg flex items-center gap-2">
                      <div className="w-8 h-8 rounded-lg bg-accent/15 flex items-center justify-center"><UserPlus className="w-4 h-4 text-accent" /></div>
                      {isRTL ? 'إنشاء مستخدم جديد' : 'Create New User'}
                    </h3>
                    <Button variant="ghost" size="icon" onClick={closePanel} className="rounded-xl"><X className="w-4 h-4" /></Button>
                  </div>
                  <div className="mb-4">
                    <CrQuickScanInline
                      onParsed={(scan) => {
                        setCreateForm((p) => ({
                          ...p,
                          full_name: p.full_name || scan.owner_name || scan.business_name_ar || scan.business_name_en || '',
                          account_type: scan.cr_number ? 'business' : p.account_type,
                        }));
                      }}
                    />
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    <div className="space-y-1.5"><Label className="text-xs">{isRTL ? 'الاسم الكامل *' : 'Full name *'}</Label>
                      <Input value={createForm.full_name} onChange={e => setCreateForm(p => ({ ...p, full_name: e.target.value }))} maxLength={100} className="h-10 rounded-xl" /></div>
                    <div className="space-y-1.5"><Label className="text-xs">{isRTL ? 'البريد *' : 'Email *'}</Label>
                      <Input type="email" dir="ltr" value={createForm.email} onChange={e => setCreateForm(p => ({ ...p, email: e.target.value }))} className="h-10 rounded-xl" /></div>
                    <div className="space-y-1.5"><Label className="text-xs">{isRTL ? 'كلمة المرور *' : 'Password *'}</Label>
                      <Input type="text" dir="ltr" value={createForm.password} onChange={e => setCreateForm(p => ({ ...p, password: e.target.value }))} className="h-10 rounded-xl tech-content" placeholder="8+ chars" /></div>
                    <div className="space-y-1.5"><Label className="text-xs">{isRTL ? 'الهاتف' : 'Phone'}</Label>
                      <Input dir="ltr" value={createForm.phone} onChange={e => setCreateForm(p => ({ ...p, phone: e.target.value }))} className="h-10 rounded-xl tech-content" /></div>
                    <div className="space-y-1.5"><Label className="text-xs">{isRTL ? 'نوع الحساب' : 'Account Type'}</Label>
                      <Select value={createForm.account_type} onValueChange={v => setCreateForm(p => ({ ...p, account_type: v }))}>
                        <SelectTrigger className="h-10 rounded-xl"><SelectValue /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="individual">{isRTL ? 'فرد' : 'Individual'}</SelectItem>
                          <SelectItem value="business">{isRTL ? 'مزود خدمة' : 'Provider'}</SelectItem>
                          <SelectItem value="company">{isRTL ? 'شركة' : 'Company'}</SelectItem>
                        </SelectContent>
                      </Select></div>
                    <div className="space-y-1.5"><Label className="text-xs">{isRTL ? 'العضوية' : 'Tier'}</Label>
                      <Select value={createForm.membership_tier} onValueChange={v => setCreateForm(p => ({ ...p, membership_tier: v }))}>
                        <SelectTrigger className="h-10 rounded-xl"><SelectValue /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="free">{isRTL ? 'مجاني' : 'Free'}</SelectItem>
                          <SelectItem value="basic">{isRTL ? 'أساسي' : 'Basic'}</SelectItem>
                          <SelectItem value="premium">{isRTL ? 'مميز' : 'Premium'}</SelectItem>
                          <SelectItem value="enterprise">{isRTL ? 'مؤسسات' : 'Enterprise'}</SelectItem>
                        </SelectContent>
                      </Select></div>
                    <div className="space-y-1.5"><Label className="text-xs">{isRTL ? 'الصلاحية' : 'Role'}</Label>
                      <Select value={createForm.role} onValueChange={v => setCreateForm(p => ({ ...p, role: v }))}>
                        <SelectTrigger className="h-10 rounded-xl"><SelectValue /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="none">{isRTL ? 'بدون' : 'None'}</SelectItem>
                          <SelectItem value="moderator">{isRTL ? 'مشرف محتوى' : 'Moderator'}</SelectItem>
                          <SelectItem value="admin">{isRTL ? 'مشرف' : 'Admin'}</SelectItem>
                          <SelectItem value="super_admin">{isRTL ? 'مشرف أعلى' : 'Super Admin'}</SelectItem>
                        </SelectContent>
                      </Select></div>
                  </div>
                  <Separator className="my-4" />
                  <div className="flex items-center gap-2 justify-end">
                    <Button variant="outline" onClick={closePanel} className="rounded-xl">{isRTL ? 'إلغاء' : 'Cancel'}</Button>
                    <Button onClick={() => createUserMutation.mutate(createForm)} disabled={createUserMutation.isPending || !createForm.email || !createForm.password || !createForm.full_name} className="rounded-xl gap-2">
                      {createUserMutation.isPending && <Loader2 className="w-4 h-4 animate-spin" />}{isRTL ? 'إنشاء' : 'Create'}
                    </Button>
                  </div>
                </div>
              )}
              {activePanel?.type === 'edit' && (
                <div className="rounded-2xl border border-accent/30 bg-gradient-to-r from-accent/5 to-transparent p-5 animate-in slide-in-from-top-2">
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="font-heading font-bold text-lg flex items-center gap-2">
                      <div className="w-8 h-8 rounded-lg bg-accent/15 flex items-center justify-center"><Pencil className="w-4 h-4 text-accent" /></div>
                      {isRTL ? 'تعديل المستخدم' : 'Edit User'}
                      {activePanel.profile.ref_id && <Badge variant="outline" className="font-mono text-xs tech-content">{activePanel.profile.ref_id}</Badge>}
                    </h3>
                    <Button variant="ghost" size="icon" onClick={closePanel} className="rounded-xl"><X className="w-4 h-4" /></Button>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    <div className="space-y-1.5"><Label className="text-xs">{isRTL ? 'الاسم الكامل' : 'Full Name'}</Label>
                      <Input value={editForm.full_name} onChange={e => setEditForm(p => ({ ...p, full_name: e.target.value }))} maxLength={100} className="h-10 rounded-xl" /></div>
                    {isSuperAdmin ? (
                      <>
                        <div className="space-y-1.5"><Label className="text-xs">{isRTL ? 'البريد' : 'Email'}</Label>
                          <Input type="email" value={editForm.email} onChange={e => setEditForm(p => ({ ...p, email: e.target.value }))} maxLength={255} className="h-10 rounded-xl" /></div>
                        <div className="space-y-1.5"><Label className="text-xs">{isRTL ? 'الهاتف' : 'Phone'}</Label>
                          <Input value={editForm.phone} onChange={e => setEditForm(p => ({ ...p, phone: e.target.value }))} dir="ltr" maxLength={20} className="h-10 rounded-xl tech-content" /></div>
                      </>
                    ) : (
                      <div className="md:col-span-2 rounded-xl border border-dashed border-border/40 bg-muted/30 p-3 text-[11px] text-muted-foreground flex items-center gap-2">
                        <Lock className="w-3.5 h-3.5 shrink-0" />
                        {isRTL ? 'تعديل البريد والهاتف متاح فقط لمدير النظام (Super Admin).' : 'Editing email & phone is restricted to Super Admins.'}
                      </div>
                    )}
                    <div className="space-y-1.5"><Label className="text-xs">{isRTL ? 'نوع الحساب' : 'Account Type'}</Label>
                      <Select value={editForm.account_type} onValueChange={v => setEditForm(p => ({ ...p, account_type: v }))}>
                        <SelectTrigger className="h-10 rounded-xl"><SelectValue /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="individual">{isRTL ? 'فرد' : 'Individual'}</SelectItem>
                          <SelectItem value="business">{isRTL ? 'مزود' : 'Provider'}</SelectItem>
                          <SelectItem value="company">{isRTL ? 'شركة' : 'Company'}</SelectItem>
                        </SelectContent>
                      </Select></div>
                    <div className="space-y-1.5"><Label className="text-xs">{isRTL ? 'العضوية' : 'Tier'}</Label>
                      <Select value={editForm.membership_tier} onValueChange={v => setEditForm(p => ({ ...p, membership_tier: v }))}>
                        <SelectTrigger className="h-10 rounded-xl"><SelectValue /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="free">{isRTL ? 'مجاني' : 'Free'}</SelectItem>
                          <SelectItem value="basic">{isRTL ? 'أساسي' : 'Basic'}</SelectItem>
                          <SelectItem value="premium">{isRTL ? 'مميز' : 'Premium'}</SelectItem>
                          <SelectItem value="enterprise">{isRTL ? 'مؤسسات' : 'Enterprise'}</SelectItem>
                        </SelectContent>
                      </Select></div>
                  </div>
                  <Separator className="my-4" />
                  <div className="flex items-center gap-2 justify-end">
                    <Button variant="outline" onClick={closePanel} className="rounded-xl">{isRTL ? 'إلغاء' : 'Cancel'}</Button>
                    <Button onClick={handleSaveProfile} disabled={updateProfileMutation.isPending} className="rounded-xl gap-2">
                      {updateProfileMutation.isPending && <Loader2 className="w-4 h-4 animate-spin" />}{isRTL ? 'حفظ' : 'Save'}
                    </Button>
                  </div>
                </div>
              )}

              {activePanel?.type === 'password' && (
                <div className="rounded-2xl border border-accent/30 bg-gradient-to-r from-accent/5 to-transparent p-5 animate-in slide-in-from-top-2">
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="font-heading font-bold text-lg flex items-center gap-2">
                      <div className="w-8 h-8 rounded-lg bg-accent/15 flex items-center justify-center"><Lock className="w-4 h-4 text-accent" /></div>
                      {isRTL ? 'تغيير كلمة المرور' : 'Change Password'}
                      <span className="text-sm font-normal text-muted-foreground">— {activePanel.userName}</span>
                    </h3>
                    <Button variant="ghost" size="icon" onClick={closePanel} className="rounded-xl"><X className="w-4 h-4" /></Button>
                  </div>
                  <div className="max-w-md space-y-3">
                    <div className="space-y-1.5">
                      <Label className="text-xs">{isRTL ? 'كلمة المرور الجديدة' : 'New Password'}</Label>
                      <div className="relative">
                        <Input type={showNewPassword ? 'text' : 'password'} value={newPassword} onChange={e => setNewPassword(e.target.value)}
                          placeholder={isRTL ? '8+ مع أرقام ورموز' : '8+ with numbers and symbols'} minLength={8} className="pe-10 h-10 rounded-xl" />
                        <button type="button" onClick={() => setShowNewPassword(!showNewPassword)} className="absolute top-2.5 text-muted-foreground hover:text-foreground" style={{ [isRTL ? 'left' : 'right']: '10px' }}>
                          {showNewPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                        </button>
                      </div>
                      {passwordValidationMessage && <p className="text-xs text-destructive">{passwordValidationMessage}</p>}
                    </div>
                    <div className="flex items-center gap-2 flex-wrap">
                      <Button onClick={() => changePasswordMutation.mutate({ targetUserId: activePanel.userId, password: newPassword })}
                        disabled={changePasswordMutation.isPending || !!passwordValidationMessage || !newPassword} className="rounded-xl gap-2">
                        {changePasswordMutation.isPending && <Loader2 className="w-4 h-4 animate-spin" />}{isRTL ? 'تغيير' : 'Change'}
                      </Button>
                      <Button variant="outline" onClick={() => sendResetLinkMutation.mutate(activePanel.userId)} disabled={sendResetLinkMutation.isPending} className="gap-1.5 rounded-xl">
                        <Send className="w-4 h-4" />{isRTL ? 'إرسال رابط' : 'Send Link'}
                      </Button>
                      <Button variant="ghost" onClick={closePanel} className="rounded-xl">{isRTL ? 'إلغاء' : 'Cancel'}</Button>
                    </div>
                  </div>
                </div>
              )}

              {activePanel?.type === 'delete' && (
                <div className="rounded-2xl border border-destructive/30 bg-gradient-to-r from-destructive/5 to-transparent p-5 animate-in slide-in-from-top-2">
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="font-heading font-bold text-lg flex items-center gap-2 text-destructive">
                      <div className="w-8 h-8 rounded-lg bg-destructive/15 flex items-center justify-center"><AlertTriangle className="w-4 h-4 text-destructive" /></div>
                      {isRTL ? 'تأكيد حذف الحساب' : 'Confirm Deletion'}
                    </h3>
                    <Button variant="ghost" size="icon" onClick={closePanel} className="rounded-xl"><X className="w-4 h-4" /></Button>
                  </div>
                  <p className="text-sm text-muted-foreground mb-4 max-w-lg">
                    {isRTL ? `هل أنت متأكد من حذف "${activePanel.userName}"؟ سيتم حذف جميع البيانات نهائياً.` : `Delete "${activePanel.userName}"? All data will be removed permanently.`}
                  </p>
                  <div className="flex items-center gap-2">
                    <Button variant="destructive" onClick={() => deleteUserMutation.mutate(activePanel.userId)} disabled={deleteUserMutation.isPending} className="rounded-xl gap-2">
                      {deleteUserMutation.isPending && <Loader2 className="w-4 h-4 animate-spin" />}{isRTL ? 'حذف نهائي' : 'Delete'}
                    </Button>
                    <Button variant="outline" onClick={closePanel} className="rounded-xl">{isRTL ? 'إلغاء' : 'Cancel'}</Button>
                  </div>
                </div>
              )}

              {/* List */}
              {(loadingProfiles || loadingRoles) ? (
                <div className="space-y-3">{Array.from({ length: 5 }).map((_, i) => <Skeleton key={i} className="h-24 rounded-2xl" />)}</div>
              ) : paginated.length === 0 ? (
                <div className="rounded-2xl border border-border/30 bg-card p-12 text-center">
                  <div className="w-16 h-16 mx-auto mb-4 rounded-2xl bg-gradient-to-br from-accent/10 to-primary/10 flex items-center justify-center">
                    <Users className="w-8 h-8 text-accent/30" />
                  </div>
                  <p className="font-heading font-bold text-sm mb-1">{isRTL ? 'لا توجد نتائج' : 'No results'}</p>
                  <p className="text-xs text-muted-foreground">{isRTL ? 'جرّب تغيير الفلاتر' : 'Try changing filters'}</p>
                </div>
              ) : (
                <>
                  <div className="space-y-3">
                    {paginated.map(profile => {
                      const roles = roleMap.get(profile.user_id) || [];
                      const isCurrentUser = profile.user_id === user.id;
                      const targetIsSuperAdmin = roles.some(r => r.role === 'super_admin');
                      const targetIsAdmin = roles.some(r => r.role === 'admin' || r.role === 'super_admin');
                      const canManageUser = !isCurrentUser && (isSuperAdmin || (!targetIsSuperAdmin && !targetIsAdmin));
                      return (
                        <UserRow key={profile.id} profile={profile} roles={roles}
                          businessLinks={businessLinksMap.get(profile.user_id) || []}
                          isCurrentUser={isCurrentUser} canManageUser={canManageUser} isSuperAdmin={isSuperAdmin}
                          isRTL={isRTL} language={language}
                          selected={selected.has(profile.id)} expanded={expanded.has(profile.id)} density={density}
                          onToggleSelect={() => toggleSelect(profile.id)} onToggleExpand={() => toggleExpand(profile.id)}
                          onEdit={openEdit}
                          onPassword={(p) => setActivePanel({ type: 'password', userId: p.user_id, userName: p.full_name || '' })}
                          onToggleBan={(p) => toggleBanMutation.mutate({ profileId: p.id, isBanned: !p.is_banned })}
                          onDelete={(p) => setActivePanel({ type: 'delete', userId: p.user_id, userName: p.full_name || '' })}
                          onAddRole={(uid, role) => addRoleMutation.mutate({ userId: uid, role })}
                          onRemoveRole={(rid) => removeRoleMutation.mutate(rid)}
                          onChangeStaffRole={(link, role) => {
                            if (!link.staffId) return;
                            updateStaffRoleMutation.mutate({ staffId: link.staffId, role });
                          }}
                          onRemoveStaff={(link) => {
                            if (!link.staffId || link.isOwnerByEntity) return;
                            removeStaffMutation.mutate(link.staffId);
                          }}
                        />
                      );
                    })}
                  </div>
                  {totalPages > 1 && (
                    <div className="flex items-center justify-between gap-2 pt-2">
                      <Button variant="outline" size="sm" className="rounded-xl gap-1" disabled={page === 1} onClick={() => setPage(p => Math.max(1, p - 1))}>
                        {isRTL ? <ChevronRight className="w-4 h-4" /> : <ChevronLeft className="w-4 h-4" />}
                        {isRTL ? 'السابق' : 'Prev'}
                      </Button>
                      <div className="flex items-center gap-1">
                        {Array.from({ length: Math.min(7, totalPages) }, (_, i) => {
                          let n = i + 1;
                          if (totalPages > 7) {
                            if (page > 4) n = page - 3 + i;
                            if (n > totalPages - 6) n = totalPages - 6 + i;
                          }
                          return (
                            <button key={n} onClick={() => setPage(n)}
                              className={`w-8 h-8 rounded-lg text-xs font-bold transition-colors tech-content
                                ${n === page ? 'bg-accent text-accent-foreground' : 'hover:bg-muted'}`}>
                              {n}
                            </button>
                          );
                        })}
                      </div>
                      <Button variant="outline" size="sm" className="rounded-xl gap-1" disabled={page === totalPages} onClick={() => setPage(p => Math.min(totalPages, p + 1))}>
                        {isRTL ? 'التالي' : 'Next'}
                        {isRTL ? <ChevronLeft className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
                      </Button>
                    </div>
                  )}
                </>
              )}
            </TabsContent>
          ))}

          {/* ANALYTICS */}
          <TabsContent value="analytics" className="space-y-5 mt-5">
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
              <KpiCard icon={ShieldAlert} label={isRTL ? 'مشرف أعلى' : 'Super Admins'} value={stats.superAdmins} gradient="from-secondary/10 to-secondary/5" iconBg="bg-secondary/15 text-secondary" />
              <KpiCard icon={Crown} label={isRTL ? 'المشرفين' : 'Admins'} value={stats.admins} gradient="from-destructive/10 to-destructive/5" iconBg="bg-destructive/15 text-destructive" />
              <KpiCard icon={ShieldCheck} label={isRTL ? 'مشرفي محتوى' : 'Moderators'} value={stats.moderators} gradient="from-warning/10 to-warning/5" iconBg="bg-warning/15 text-warning" />
              <KpiCard icon={Ban} label={isRTL ? 'معطّلون' : 'Disabled'} value={stats.bannedCount} gradient="from-destructive/10 to-destructive/5" iconBg="bg-destructive/15 text-destructive" />
            </div>
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              <div className="rounded-2xl border border-border/30 bg-card p-5">
                <h3 className="font-heading font-bold text-sm mb-3">{isRTL ? 'توزيع أنواع الحسابات' : 'Account Type Distribution'}</h3>
                <div className="h-64">
                  <ResponsiveContainer>
                    <PieChart>
                      <Pie data={accountTypePie} dataKey="value" nameKey="name" innerRadius={50} outerRadius={90} paddingAngle={3}>
                        {accountTypePie.map((e, i) => <Cell key={i} fill={e.color} />)}
                      </Pie>
                      <RTooltip contentStyle={{ background: 'hsl(var(--card))', border: '1px solid hsl(var(--border))', borderRadius: 8, fontSize: 12 }} />
                      <Legend wrapperStyle={{ fontSize: 11 }} />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
              </div>
              <div className="rounded-2xl border border-border/30 bg-card p-5">
                <h3 className="font-heading font-bold text-sm mb-3">{isRTL ? 'توزيع العضويات' : 'Membership Tiers'}</h3>
                <div className="h-64">
                  <ResponsiveContainer>
                    <BarChart data={tierBar}>
                      <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                      <XAxis dataKey="name" tick={{ fontSize: 11 }} reversed={isRTL} />
                      <YAxis tick={{ fontSize: 11 }} orientation={isRTL ? 'right' : 'left'} />
                      <RTooltip contentStyle={{ background: 'hsl(var(--card))', border: '1px solid hsl(var(--border))', borderRadius: 8, fontSize: 12 }} />
                      <Bar dataKey="count" fill="hsl(var(--accent))" radius={[8, 8, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </div>
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </DashboardLayout>
  );
};

export default AdminUsers;
