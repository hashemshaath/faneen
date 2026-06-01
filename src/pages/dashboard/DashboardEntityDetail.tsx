import React, { useMemo, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import {
  Building2, ArrowLeft, User, ShieldCheck, MapPin, Tag, Users,
  ExternalLink, UserPlus, Trash2, Crown, Library, Copy, Check,
  Search, Activity, Sparkles, ArrowRightLeft, Phone, Mail,
  CheckCircle2, AlertCircle,
} from 'lucide-react';
import { DashboardLayout } from '@/components/dashboard/DashboardLayout';
import { useAuth } from '@/contexts/AuthContext';
import { useLanguage } from '@/i18n/LanguageContext';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Progress } from '@/components/ui/progress';
import { toast } from '@/hooks/use-toast';
import { pickBi } from '@/components/common/Bilingual';
import { useNoIndex } from '@/hooks/useNoIndex';
import { getAdminBusinessById } from '@/modules/businesses/services/getAdminBusinessById';
import { listBusinessStaffByBusiness } from '@/modules/businesses/services/listBusinessStaffByBusiness';
import { insertBusinessStaff } from '@/modules/businesses/services/insertBusinessStaff';
import {
  updateBusinessStaffRole,
  setBusinessStaffActive,
  removeBusinessStaff,
} from '@/modules/businesses/services/guardedStaffMutations';
import { getProfileByUserId } from '@/modules/users/services/getProfileByUserId';
import { listProfilesByUserIds, getProfileByRefId } from '@/modules/users';
import { listBranchesByBusiness } from '@/modules/catalog';
import { supabase } from '@/integrations/supabase/client';
import { StaffPermissionsMatrix } from '@/components/dashboard/entities/StaffPermissionsMatrix';
import { TeamPermissionsOverview } from '@/components/dashboard/entities/TeamPermissionsOverview';
import { PermissionInspector } from '@/components/dashboard/entities/PermissionInspector';
import { useTransferPrimaryManagerMutation } from '@/hooks/useTransferPrimaryManagerMutation';

interface BizDetail {
  id: string;
  user_id: string;
  ref_id: string | null;
  legacy_ref_id: string | null;
  name_ar: string | null;
  name_en: string | null;
  username: string | null;
  email: string | null;
  phone: string | null;
  is_active: boolean | null;
  is_verified: boolean | null;
  membership_tier: string | null;
  approval_status: string | null;
  category_id: string | null;
  entity_type: string | null;
  description_ar?: string | null;
  description_en?: string | null;
}

interface OwnerProfile {
  user_id: string;
  ref_id: string | null;
  full_name: string | null;
  email: string | null;
  phone: string | null;
  avatar_url: string | null;
}

interface StaffRow {
  id: string;
  ref_id: string | null;
  user_id: string;
  role: 'owner' | 'manager' | 'editor' | 'viewer';
  is_active: boolean;
  is_primary_manager: boolean | null;
  created_at: string;
  permissions_override: unknown;
}

interface CategoryRow { id: string; name_ar: string | null; name_en: string | null; icon: string | null }
interface BranchRow {
  id: string;
  name_ar: string | null;
  name_en: string | null;
  city_id: string | null;
  is_main: boolean | null;
  is_active: boolean | null;
}

const ROLES: { value: StaffRow['role']; ar: string; en: string }[] = [
  { value: 'owner', ar: 'مالك', en: 'Owner' },
  { value: 'manager', ar: 'مدير', en: 'Manager' },
  { value: 'editor', ar: 'محرر', en: 'Editor' },
  { value: 'viewer', ar: 'مشاهد', en: 'Viewer' },
];

const DashboardEntityDetail: React.FC = () => {
  useNoIndex();
  const { id: routeParam = '' } = useParams<{ id: string }>();
  const { user, isAdmin } = useAuth();
  const { language } = useLanguage();
  const isRTL = language === 'ar';
  const queryClient = useQueryClient();

  // Route param may be a UUID or a ref_id like BIZ-1000001 / legacy_ref_id.
  const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  const isUuid = UUID_RE.test(routeParam);

  const { data: resolvedId } = useQuery({
    queryKey: ['entity-resolve-ref', routeParam],
    queryFn: async () => {
      const ref = routeParam.trim().toUpperCase();
      const { data } = await supabase
        .from('businesses')
        .select('id')
        .or(`ref_id.eq.${ref},legacy_ref_id.eq.${ref}`)
        .maybeSingle();
      return (data?.id as string | undefined) ?? null;
    },
    enabled: !!routeParam && !isUuid,
  });

  const id = isUuid ? routeParam : (resolvedId ?? '');

  const { data: biz, isLoading } = useQuery({
    queryKey: ['entity-detail', id],
    queryFn: async () => {
      const res = await getAdminBusinessById<BizDetail>({
        id,
        select:
          'id, user_id, ref_id, legacy_ref_id, name_ar, name_en, username, email, phone, is_active, is_verified, membership_tier, approval_status, category_id, entity_type, description_ar, description_en',
      });
      if (res.error) throw res.error;
      return res.data;
    },
    enabled: !!id,
  });

  const { data: owner } = useQuery({
    queryKey: ['entity-owner', biz?.user_id],
    queryFn: async () => {
      const res = await getProfileByUserId<OwnerProfile>({
        userId: biz!.user_id,
        select: 'user_id, ref_id, full_name, email, phone, avatar_url',
      });
      return res.data;
    },
    enabled: !!biz?.user_id,
  });

  const { data: staff, refetch: refetchStaff } = useQuery({
    queryKey: ['entity-staff', id],
    queryFn: async () => {
      const res = await listBusinessStaffByBusiness<StaffRow>({
        businessId: id,
        includeInactive: true,
        select: 'id, ref_id, user_id, role, is_active, is_primary_manager, created_at, permissions_override',
      });
      return (res.data ?? []) as StaffRow[];
    },
    enabled: !!id,
  });

  const { data: category } = useQuery({
    queryKey: ['entity-category', biz?.category_id],
    queryFn: async () => {
      const { data } = await supabase
        .from('categories')
        .select('id, name_ar, name_en, icon')
        .eq('id', biz!.category_id!)
        .maybeSingle();
      return data as CategoryRow | null;
    },
    enabled: !!biz?.category_id,
  });

  const { data: branches } = useQuery({
    queryKey: ['entity-branches', id],
    queryFn: async () => {
      const res = await listBranchesByBusiness<BranchRow>({
        businessId: id, select: 'id, name_ar, name_en, city_id, is_main, is_active',
        activeOnly: false, order: [{ column: 'is_main', ascending: false }],
      });
      return (res.data ?? []) as BranchRow[];
    },
    enabled: !!id,
  });

  // Permissions: owner OR admin OR primary manager can edit staff
  const currentMembership = (staff ?? []).find((s) => s.user_id === user?.id && s.is_active);
  const isOwner = biz?.user_id === user?.id;
  const canManageStaff = isAdmin || isOwner || currentMembership?.is_primary_manager === true || currentMembership?.role === 'owner' || currentMembership?.role === 'manager';

  // Staff resolved with profiles
  const staffUserIds = (staff ?? []).map((s) => s.user_id);
  const { data: staffProfiles } = useQuery({
    queryKey: ['entity-staff-profiles', staffUserIds.sort().join(',')],
    queryFn: async () => {
      if (staffUserIds.length === 0) return [];
      const { data } = await listProfilesByUserIds<OwnerProfile>({
        userIds: staffUserIds,
        select: 'user_id, ref_id, full_name, email, phone, avatar_url',
      });
      return (data ?? []) as OwnerProfile[];
    },
    enabled: staffUserIds.length > 0,
  });
  const profileMap = new Map((staffProfiles ?? []).map((p) => [p.user_id, p]));

  // Add staff state
  const [addRefId, setAddRefId] = useState('');
  const [addRole, setAddRole] = useState<StaffRow['role']>('viewer');
  const [submitting, setSubmitting] = useState(false);
  const [staffQuery, setStaffQuery] = useState('');
  const [staffRoleFilter, setStaffRoleFilter] = useState<'all' | StaffRow['role']>('all');
  const [copied, setCopied] = useState<string | null>(null);
  const transferMutation = useTransferPrimaryManagerMutation();

  const copyToClipboard = async (text: string, key: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(key);
      toast({ title: pickBi(isRTL, 'تم النسخ', 'Copied') });
      setTimeout(() => setCopied(null), 1500);
    } catch {
      toast({ title: pickBi(isRTL, 'تعذّر النسخ', 'Copy failed'), variant: 'destructive' });
    }
  };

  const handleTransferOwnership = async (targetUserId: string) => {
    const result = await transferMutation.mutateAsync({ businessId: id, toUserId: targetUserId });
    if (result.ok) {
      toast({ title: pickBi(isRTL, 'تم نقل الإدارة الرئيسية', 'Primary manager transferred') });
      refetchStaff();
    } else {
      toast({ title: pickBi(isRTL, 'تعذّر النقل', 'Transfer failed'), description: result.code, variant: 'destructive' });
    }
  };

  const handleAddStaff = async () => {
    const ref = addRefId.trim().toUpperCase();
    if (!ref.startsWith('USR-')) {
      toast({ title: pickBi(isRTL, 'معرّف غير صحيح', 'Invalid ID'), description: pickBi(isRTL, 'استخدم معرف USR-XXXXXXX', 'Use a USR-XXXXXXX reference'), variant: 'destructive' });
      return;
    }
    setSubmitting(true);
    try {
      const { data: prof } = await getProfileByRefId<{ user_id: string }>({ refId: ref, select: 'user_id' });
      if (!prof?.user_id) {
        toast({ title: pickBi(isRTL, 'لم يُعثر على المستخدم', 'User not found'), variant: 'destructive' });
        return;
      }
      if ((staff ?? []).some((s) => s.user_id === prof.user_id)) {
        toast({ title: pickBi(isRTL, 'المستخدم موجود ضمن الفريق', 'User already in team'), variant: 'destructive' });
        return;
      }
      const res = await insertBusinessStaff({
        payload: { business_id: id, user_id: prof.user_id, role: addRole, is_active: true },
      });
      if (res.error) throw res.error;
      toast({ title: pickBi(isRTL, 'تمت الإضافة', 'Member added') });
      setAddRefId('');
      setAddRole('viewer');
      refetchStaff();
      queryClient.invalidateQueries({ queryKey: ['entity-staff-profiles'] });
    } catch (err) {
      toast({ title: pickBi(isRTL, 'تعذّر الإضافة', 'Failed to add'), description: err instanceof Error ? err.message : String(err), variant: 'destructive' });
    } finally {
      setSubmitting(false);
    }
  };

  const handleChangeRole = async (staffId: string, role: StaffRow['role']) => {
    try {
      await updateBusinessStaffRole(staffId, role);
      toast({ title: pickBi(isRTL, 'تم تحديث الدور', 'Role updated') });
      refetchStaff();
    } catch {
      toast({ title: pickBi(isRTL, 'تعذّر التحديث', 'Update failed'), variant: 'destructive' });
    }
  };

  const handleToggleActive = async (s: StaffRow) => {
    try {
      await setBusinessStaffActive(s.id, !s.is_active);
      toast({ title: pickBi(isRTL, s.is_active ? 'تم الإيقاف' : 'تم التفعيل', s.is_active ? 'Deactivated' : 'Activated') });
      refetchStaff();
    } catch {
      toast({ title: pickBi(isRTL, 'تعذّر التحديث', 'Update failed'), variant: 'destructive' });
    }
  };

  const handleRemove = async (staffId: string) => {
    try {
      await removeBusinessStaff(staffId);
      toast({ title: pickBi(isRTL, 'تم الحذف', 'Removed') });
      refetchStaff();
    } catch {
      toast({ title: pickBi(isRTL, 'تعذّر الحذف', 'Delete failed'), variant: 'destructive' });
    }
  };

  // Completeness score (must run before any early return — Rules of Hooks)
  const completeness = useMemo(() => {
    const checks = [
      { key: 'name', ok: !!(biz?.name_ar || biz?.name_en), label: pickBi(isRTL, 'الاسم', 'Name') },
      { key: 'username', ok: !!biz?.username, label: pickBi(isRTL, 'اسم المستخدم', 'Username') },
      { key: 'email', ok: !!biz?.email, label: pickBi(isRTL, 'البريد', 'Email') },
      { key: 'phone', ok: !!biz?.phone, label: pickBi(isRTL, 'الهاتف', 'Phone') },
      { key: 'category', ok: !!biz?.category_id, label: pickBi(isRTL, 'التصنيف', 'Category') },
      { key: 'verified', ok: !!biz?.is_verified, label: pickBi(isRTL, 'التوثيق', 'Verified') },
      { key: 'branch', ok: (branches ?? []).length > 0, label: pickBi(isRTL, 'فرع واحد على الأقل', 'At least one branch') },
      { key: 'team', ok: (staff ?? []).length > 0, label: pickBi(isRTL, 'عضو فريق', 'Team member') },
      { key: 'description', ok: !!(biz?.description_ar || biz?.description_en), label: pickBi(isRTL, 'الوصف', 'Description') },
    ];
    const done = checks.filter((c) => c.ok).length;
    return { checks, done, total: checks.length, pct: Math.round((done / checks.length) * 100) };
  }, [biz, branches, staff, isRTL]);

  // Staff filtering (must run before any early return — Rules of Hooks)
  const filteredStaff = useMemo(() => {
    const list = staff ?? [];
    const q = staffQuery.trim().toLowerCase();
    return list.filter((s) => {
      if (staffRoleFilter !== 'all' && s.role !== staffRoleFilter) return false;
      if (!q) return true;
      const prof = profileMap.get(s.user_id);
      const hay = `${prof?.full_name ?? ''} ${prof?.ref_id ?? ''} ${prof?.email ?? ''} ${s.ref_id ?? ''}`.toLowerCase();
      return hay.includes(q);
    });
  }, [staff, staffQuery, staffRoleFilter, profileMap]);

  if (isLoading) {
    return (
      <DashboardLayout>
        <Skeleton className="h-32 rounded-xl mb-4" />
        <Skeleton className="h-64 rounded-xl" />
      </DashboardLayout>
    );
  }

  if (!biz) {
    return (
      <DashboardLayout>
        <Card className="p-12 text-center">
          <Building2 className="w-12 h-12 mx-auto mb-3 opacity-40" />
          <p>{pickBi(isRTL, 'الكيان غير موجود', 'Entity not found')}</p>
          <Link to="/dashboard/entities" className="text-primary text-sm mt-4 inline-block">
            {pickBi(isRTL, 'العودة للقائمة', 'Back to list')}
          </Link>
        </Card>
      </DashboardLayout>
    );
  }

  const bizName = pickBi(isRTL, biz.name_ar ?? '', biz.name_en ?? '') || biz.username || '—';
  const refIdDisplay = biz.ref_id ?? biz.legacy_ref_id ?? '';

  const kpis = [
    { icon: Users, label: pickBi(isRTL, 'أعضاء الفريق', 'Team members'), value: (staff ?? []).filter((s) => s.is_active).length, total: (staff ?? []).length, color: 'text-blue-500' },
    { icon: MapPin, label: pickBi(isRTL, 'الفروع', 'Branches'), value: (branches ?? []).filter((b) => b.is_active).length, total: (branches ?? []).length, color: 'text-emerald-500' },
    { icon: ShieldCheck, label: pickBi(isRTL, 'الحالة', 'Status'), value: biz.is_verified ? pickBi(isRTL, 'موثّق', 'Verified') : pickBi(isRTL, 'غير موثّق', 'Unverified'), color: biz.is_verified ? 'text-emerald-500' : 'text-amber-500' },
    { icon: Sparkles, label: pickBi(isRTL, 'العضوية', 'Membership'), value: biz.membership_tier ?? 'free', color: 'text-amber-500' },
  ];

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <Link to="/dashboard/entities" className="text-sm text-muted-foreground inline-flex items-center gap-1 hover:text-primary">
          <ArrowLeft className={`w-4 h-4 ${isRTL ? 'rotate-180' : ''}`} />
          {pickBi(isRTL, 'كل الكيانات', 'All entities')}
        </Link>

        {/* Header */}
        <Card className="p-6 bg-gradient-to-br from-card via-card to-primary/5">
          <div className="flex items-start justify-between gap-4 flex-wrap">
            <div className="flex items-center gap-4 min-w-0">
              <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-primary/20 to-primary/5 text-primary flex items-center justify-center shrink-0 ring-1 ring-primary/20">
                <Building2 className="w-8 h-8" />
              </div>
              <div className="min-w-0">
                <h1 className="text-2xl font-bold truncate">{bizName}</h1>
                <div className="flex items-center gap-1.5 mt-1 flex-wrap">
                  {refIdDisplay && (
                    <button
                      onClick={() => copyToClipboard(refIdDisplay, 'ref')}
                      className="text-xs text-muted-foreground tech-content inline-flex items-center gap-1 hover:text-primary transition-colors px-1.5 py-0.5 rounded hover:bg-primary/5"
                      title={pickBi(isRTL, 'نسخ المعرف', 'Copy ID')}
                    >
                      {refIdDisplay}
                      {copied === 'ref' ? <Check className="w-3 h-3 text-emerald-500" /> : <Copy className="w-3 h-3 opacity-50" />}
                    </button>
                  )}
                  {biz.username && (
                    <button
                      onClick={() => copyToClipboard(`${window.location.origin}/${biz.username}`, 'link')}
                      className="text-xs text-muted-foreground tech-content inline-flex items-center gap-1 hover:text-primary transition-colors px-1.5 py-0.5 rounded hover:bg-primary/5"
                      title={pickBi(isRTL, 'نسخ الرابط العام', 'Copy public link')}
                    >
                      @{biz.username}
                      {copied === 'link' ? <Check className="w-3 h-3 text-emerald-500" /> : <Copy className="w-3 h-3 opacity-50" />}
                    </button>
                  )}
                </div>
                <div className="flex flex-wrap gap-1.5 mt-2">
                  {biz.is_verified && (
                    <Badge className="text-[10px]"><ShieldCheck className="w-3 h-3 me-1" />{pickBi(isRTL, 'موثّق', 'Verified')}</Badge>
                  )}
                  <Badge variant="outline" className="text-[10px]">{biz.approval_status ?? 'draft'}</Badge>
                  <Badge variant="secondary" className="text-[10px]">{biz.membership_tier ?? 'free'}</Badge>
                  {!biz.is_active && <Badge variant="destructive" className="text-[10px]">{pickBi(isRTL, 'موقوف', 'Inactive')}</Badge>}
                </div>
              </div>
            </div>
            <div className="flex gap-2 flex-wrap">
              {biz.username && (
                <Button asChild variant="outline" size="sm">
                  <Link to={`/${biz.username}`} target="_blank" rel="noopener">
                    <ExternalLink className="w-4 h-4 me-1" />
                    {pickBi(isRTL, 'الملف العام', 'Public profile')}
                  </Link>
                </Button>
              )}
              {(isOwner || isAdmin) && (
                <Button asChild variant="default" size="sm">
                  <Link to="/dashboard/business-edit">{pickBi(isRTL, 'تحرير', 'Edit')}</Link>
                </Button>
              )}
            </div>
          </div>

          {/* KPI strip */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mt-6 pt-6 border-t border-border/40">
            {kpis.map((k, i) => (
              <div key={i} className="flex items-center gap-3">
                <div className={`w-10 h-10 rounded-xl bg-muted flex items-center justify-center ${k.color} shrink-0`}>
                  <k.icon className="w-5 h-5" />
                </div>
                <div className="min-w-0">
                  <p className="text-[10px] uppercase tracking-wide text-muted-foreground truncate">{k.label}</p>
                  <p className="text-sm font-semibold truncate">
                    {k.value}
                    {typeof k.total === 'number' && k.total !== k.value && (
                      <span className="text-[10px] text-muted-foreground ms-1">/ {k.total}</span>
                    )}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </Card>

        {/* Tabs */}
        <Tabs defaultValue="overview" className="space-y-4">
          <TabsList className="grid w-full grid-cols-5 h-11">
            <TabsTrigger value="overview" className="text-xs sm:text-sm">{pickBi(isRTL, 'نظرة عامة', 'Overview')}</TabsTrigger>
            <TabsTrigger value="team" className="text-xs sm:text-sm">{pickBi(isRTL, 'الفريق', 'Team')}</TabsTrigger>
            <TabsTrigger value="permissions" className="text-xs sm:text-sm">{pickBi(isRTL, 'الصلاحيات', 'Permissions')}</TabsTrigger>
            <TabsTrigger value="branches" className="text-xs sm:text-sm">{pickBi(isRTL, 'الفروع', 'Branches')}</TabsTrigger>
            <TabsTrigger value="settings" className="text-xs sm:text-sm">{pickBi(isRTL, 'الإعدادات', 'Settings')}</TabsTrigger>
          </TabsList>

          {/* ===== Overview ===== */}
          <TabsContent value="overview" className="space-y-4 mt-0">
            <div className="grid gap-4 lg:grid-cols-3">
              {/* Owner */}
              <Card className="p-5 lg:col-span-2">
                <h2 className="font-semibold mb-3 flex items-center gap-2"><Crown className="w-4 h-4 text-amber-500" />{pickBi(isRTL, 'المالك', 'Owner')}</h2>
                {owner ? (
                  <div className="flex items-center gap-3">
                    {owner.avatar_url ? (
                      <img src={owner.avatar_url} alt="" className="w-12 h-12 rounded-full object-cover" />
                    ) : (
                      <div className="w-12 h-12 rounded-full bg-muted flex items-center justify-center"><User className="w-6 h-6 text-muted-foreground" /></div>
                    )}
                    <div className="flex-1 min-w-0">
                      <p className="font-medium truncate">{owner.full_name ?? '—'}</p>
                      <p className="text-xs text-muted-foreground tech-content truncate">{owner.ref_id ?? '—'}{owner.email && ` • ${owner.email}`}</p>
                      {owner.phone && <p className="text-[11px] text-muted-foreground tech-content">{owner.phone}</p>}
                    </div>
                    {isAdmin && (
                      <Button asChild variant="ghost" size="sm">
                        <Link to={`/admin/users?focus=${owner.user_id}`}>
                          <ExternalLink className="w-4 h-4" />
                        </Link>
                      </Button>
                    )}
                  </div>
                ) : (
                  <p className="text-sm text-muted-foreground">{pickBi(isRTL, 'لا توجد بيانات مالك', 'No owner data')}</p>
                )}

                {/* Contact + Category quick rows */}
                <div className="grid sm:grid-cols-2 gap-3 mt-5 pt-4 border-t border-border/40">
                  {biz.email && (
                    <div className="flex items-center gap-2 text-sm">
                      <Mail className="w-4 h-4 text-muted-foreground" />
                      <span className="tech-content truncate">{biz.email}</span>
                    </div>
                  )}
                  {biz.phone && (
                    <div className="flex items-center gap-2 text-sm">
                      <Phone className="w-4 h-4 text-muted-foreground" />
                      <span className="tech-content">{biz.phone}</span>
                    </div>
                  )}
                  {category && (
                    <div className="flex items-center gap-2 text-sm">
                      <Tag className="w-4 h-4 text-muted-foreground" />
                      <Link to={`/sectors/${category.id}`} className="hover:text-primary truncate">
                        {category.icon && <span className="me-1">{category.icon}</span>}
                        {pickBi(isRTL, category.name_ar ?? '', category.name_en ?? '')}
                      </Link>
                    </div>
                  )}
                  {biz.entity_type && (
                    <div className="flex items-center gap-2 text-sm">
                      <Building2 className="w-4 h-4 text-muted-foreground" />
                      <span>{biz.entity_type}</span>
                    </div>
                  )}
                </div>
              </Card>

              {/* Completeness */}
              <Card className="p-5">
                <h2 className="font-semibold mb-3 flex items-center gap-2">
                  <Activity className="w-4 h-4 text-primary" />
                  {pickBi(isRTL, 'اكتمال الملف', 'Profile completeness')}
                </h2>
                <div className="flex items-baseline gap-2 mb-2">
                  <span className="text-3xl font-bold tech-content">{completeness.pct}%</span>
                  <span className="text-xs text-muted-foreground">{completeness.done}/{completeness.total}</span>
                </div>
                <Progress value={completeness.pct} className="h-2 mb-4" />
                <ul className="space-y-1.5 text-xs">
                  {completeness.checks.map((c) => (
                    <li key={c.key} className="flex items-center gap-2">
                      {c.ok ? (
                        <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500 shrink-0" />
                      ) : (
                        <AlertCircle className="w-3.5 h-3.5 text-muted-foreground/50 shrink-0" />
                      )}
                      <span className={c.ok ? 'text-foreground' : 'text-muted-foreground'}>{c.label}</span>
                    </li>
                  ))}
                </ul>
              </Card>
            </div>

            {/* Description */}
            {(biz.description_ar || biz.description_en) && (
              <Card className="p-5">
                <h2 className="font-semibold mb-3 text-sm">{pickBi(isRTL, 'الوصف', 'Description')}</h2>
                <p className="text-sm text-muted-foreground leading-relaxed whitespace-pre-line">
                  {pickBi(isRTL, biz.description_ar ?? '', biz.description_en ?? '')}
                </p>
              </Card>
            )}
          </TabsContent>

          {/* ===== Team ===== */}
          <TabsContent value="team" className="space-y-4 mt-0">
            <Card className="p-5">
              <div className="flex items-center justify-between mb-4 flex-wrap gap-2">
                <h2 className="font-semibold flex items-center gap-2">
                  <Users className="w-4 h-4 text-primary" />
                  {pickBi(isRTL, 'فريق العمل', 'Team')}
                  <Badge variant="outline" className="text-[10px]">{(staff ?? []).length}</Badge>
                </h2>
              </div>

              {canManageStaff && (
                <div className="grid gap-2 md:grid-cols-[1fr_180px_auto] mb-4 p-3 rounded-xl bg-muted/40 border border-border/40">
                  <Input dir="ltr" value={addRefId} onChange={(e) => setAddRefId(e.target.value)} placeholder="USR-1000001" className="h-10 tech-content" />
                  <Select value={addRole} onValueChange={(v) => setAddRole(v as StaffRow['role'])}>
                    <SelectTrigger className="h-10"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {ROLES.filter((r) => r.value !== 'owner').map((r) => (
                        <SelectItem key={r.value} value={r.value}>{pickBi(isRTL, r.ar, r.en)}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <Button onClick={handleAddStaff} disabled={submitting || !addRefId.trim()} size="sm" className="h-10">
                    <UserPlus className="w-4 h-4 me-1" />{pickBi(isRTL, 'إضافة', 'Add')}
                  </Button>
                </div>
              )}

              {/* Search + filter */}
              {(staff ?? []).length > 0 && (
                <div className="grid gap-2 md:grid-cols-[1fr_180px] mb-3">
                  <div className="relative">
                    <Search className={`w-4 h-4 absolute top-1/2 -translate-y-1/2 ${isRTL ? 'right-3' : 'left-3'} text-muted-foreground`} />
                    <Input
                      value={staffQuery}
                      onChange={(e) => setStaffQuery(e.target.value)}
                      placeholder={pickBi(isRTL, 'بحث بالاسم أو المعرف…', 'Search by name or ID…')}
                      className={`h-10 ${isRTL ? 'pr-9' : 'pl-9'}`}
                    />
                  </div>
                  <Select value={staffRoleFilter} onValueChange={(v) => setStaffRoleFilter(v as typeof staffRoleFilter)}>
                    <SelectTrigger className="h-10"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">{pickBi(isRTL, 'كل الأدوار', 'All roles')}</SelectItem>
                      {ROLES.map((r) => (
                        <SelectItem key={r.value} value={r.value}>{pickBi(isRTL, r.ar, r.en)}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}

              {filteredStaff.length === 0 ? (
                <div className="text-center py-12">
                  <Users className="w-10 h-10 mx-auto mb-2 opacity-30" />
                  <p className="text-sm text-muted-foreground">
                    {(staff ?? []).length === 0
                      ? pickBi(isRTL, 'لا يوجد أعضاء — أضف عضواً للبدء', 'No members yet — add one to get started')
                      : pickBi(isRTL, 'لا توجد نتائج مطابقة', 'No matching results')}
                  </p>
                </div>
              ) : (
                <div className="space-y-2">
                  {filteredStaff.map((s) => {
                    const prof = profileMap.get(s.user_id);
                    const canTransferTo = canManageStaff && !s.is_primary_manager && s.is_active && (s.role === 'manager' || s.role === 'owner');
                    return (
                      <div key={s.id} className="rounded-xl border border-border/40 p-3 hover-lift transition-all">
                        <div className="flex items-center gap-3 flex-wrap">
                          {prof?.avatar_url ? (
                            <img src={prof.avatar_url} alt="" className="w-9 h-9 rounded-full object-cover" />
                          ) : (
                            <div className="w-9 h-9 rounded-full bg-gradient-to-br from-primary/20 to-primary/5 flex items-center justify-center"><User className="w-4 h-4 text-primary" /></div>
                          )}
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 flex-wrap">
                              <p className="font-medium text-sm truncate">{prof?.full_name ?? '—'}</p>
                              {s.is_primary_manager && <Badge className="text-[9px]"><Crown className="w-2.5 h-2.5 me-1" />{pickBi(isRTL, 'المدير الرئيسي', 'Primary')}</Badge>}
                              {!s.is_active && <Badge variant="outline" className="text-[9px]">{pickBi(isRTL, 'موقوف', 'Inactive')}</Badge>}
                            </div>
                            <p className="text-[11px] text-muted-foreground tech-content truncate">{prof?.ref_id ?? s.ref_id ?? '—'}{prof?.email && ` • ${prof.email}`}</p>
                          </div>
                          {canManageStaff && !s.is_primary_manager ? (
                            <Select value={s.role} onValueChange={(v) => handleChangeRole(s.id, v as StaffRow['role'])}>
                              <SelectTrigger className="h-9 w-32"><SelectValue /></SelectTrigger>
                              <SelectContent>
                                {ROLES.map((r) => (
                                  <SelectItem key={r.value} value={r.value}>{pickBi(isRTL, r.ar, r.en)}</SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          ) : (
                            <Badge variant="secondary" className="text-[10px]">{s.role}</Badge>
                          )}
                          {canManageStaff && !s.is_primary_manager && (
                            <>
                              {canTransferTo && (isOwner || isAdmin) && (
                                <Button
                                  onClick={() => handleTransferOwnership(s.user_id)}
                                  disabled={transferMutation.isPending}
                                  variant="ghost"
                                  size="sm"
                                  title={pickBi(isRTL, 'تعيين كمدير رئيسي', 'Make primary manager')}
                                >
                                  <ArrowRightLeft className="w-4 h-4" />
                                </Button>
                              )}
                              <Button onClick={() => handleToggleActive(s)} variant="ghost" size="sm">
                                {s.is_active ? pickBi(isRTL, 'إيقاف', 'Pause') : pickBi(isRTL, 'تفعيل', 'Enable')}
                              </Button>
                              <Button onClick={() => handleRemove(s.id)} variant="ghost" size="icon" className="text-destructive">
                                <Trash2 className="w-4 h-4" />
                              </Button>
                            </>
                          )}
                        </div>
                        <StaffPermissionsMatrix
                          staffId={s.id}
                          role={s.role}
                          permissionsOverride={s.permissions_override}
                          isPrimaryManager={!!s.is_primary_manager}
                          canEdit={canManageStaff}
                          onSaved={refetchStaff}
                        />
                      </div>
                    );
                  })}
                </div>
              )}

              {!canManageStaff && (
                <p className="text-[11px] text-muted-foreground mt-3">
                  {pickBi(isRTL, 'تظهر لك الشاشات والوظائف بناءً على دورك في هذا الكيان.', 'Screens and actions shown to you depend on your role in this entity.')}
                </p>
              )}
            </Card>
          </TabsContent>

          {/* ===== Permissions (governance) ===== */}
          <TabsContent value="permissions" className="space-y-4 mt-0">
            <TeamPermissionsOverview
              members={(staff ?? []).map((s) => ({
                id: s.id,
                user_id: s.user_id,
                role: s.role,
                is_active: s.is_active,
                is_primary_manager: s.is_primary_manager,
                permissions_override: s.permissions_override,
              }))}
              profiles={profileMap}
            />
            <PermissionInspector
              members={(staff ?? []).map((s) => ({
                id: s.id,
                user_id: s.user_id,
                role: s.role,
                is_active: s.is_active,
                is_primary_manager: s.is_primary_manager,
                permissions_override: s.permissions_override,
              }))}
              profiles={profileMap}
            />
            <Card className="p-5">
              <h2 className="font-semibold mb-2 flex items-center gap-2 text-sm">
                <ShieldCheck className="w-4 h-4 text-primary" />
                {pickBi(isRTL, 'كيف تعمل الصلاحيات؟', 'How permissions work')}
              </h2>
              <ul className="text-[12px] text-muted-foreground space-y-1.5 leading-relaxed">
                <li>
                  • {pickBi(
                    isRTL,
                    'كل عضو يأخذ افتراضيًا صلاحيات دوره. يمكنك تعديل ذلك من تبويب الفريق بفتح بطاقته.',
                    'Each member inherits their role defaults. Override them from the Team tab by expanding the member card.',
                  )}
                </li>
                <li>
                  • {pickBi(
                    isRTL,
                    'الشريط الجانبي وصفحات لوحة التحكم تظهر/تختفي تلقائيًا حسب الصلاحيات الفعالة لكل عضو.',
                    'Sidebar items and dashboard pages auto show/hide based on each member\'s effective permissions.',
                  )}
                </li>
                <li>
                  • {pickBi(
                    isRTL,
                    'علامة كهرمانية تشير إلى صلاحيات مخصصة تختلف عن افتراضي الدور.',
                    'An amber dot indicates custom permissions that differ from role defaults.',
                  )}
                </li>
                <li>
                  • {pickBi(
                    isRTL,
                    'سياسات قاعدة البيانات (RLS) هي المرجع النهائي — هذه المصفوفة لتجربة الواجهة فقط.',
                    'Database RLS policies remain the source of truth — this matrix only governs the UI experience.',
                  )}
                </li>
              </ul>
            </Card>
          </TabsContent>

          {/* ===== Branches ===== */}
          <TabsContent value="branches" className="space-y-4 mt-0">
            <Card className="p-5">
              <div className="flex items-center justify-between mb-4">
                <h2 className="font-semibold flex items-center gap-2">
                  <MapPin className="w-4 h-4 text-primary" />
                  {pickBi(isRTL, 'الفروع', 'Branches')}
                  <Badge variant="outline" className="text-[10px]">{branches?.length ?? 0}</Badge>
                </h2>
                {(isOwner || isAdmin) && (
                  <Button asChild variant="outline" size="sm">
                    <Link to="/dashboard/business-edit">{pickBi(isRTL, 'إدارة الفروع', 'Manage branches')}</Link>
                  </Button>
                )}
              </div>
              {(branches ?? []).length === 0 ? (
                <div className="text-center py-12">
                  <MapPin className="w-10 h-10 mx-auto mb-2 opacity-30" />
                  <p className="text-sm text-muted-foreground">{pickBi(isRTL, 'لا توجد فروع مضافة', 'No branches added')}</p>
                </div>
              ) : (
                <div className="grid gap-3 sm:grid-cols-2">
                  {branches!.map((b) => (
                    <div key={b.id} className="rounded-xl border border-border/40 p-4 hover-lift">
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex items-center gap-2 min-w-0">
                          <div className="w-9 h-9 rounded-lg bg-emerald-500/10 text-emerald-600 flex items-center justify-center shrink-0">
                            <MapPin className="w-4 h-4" />
                          </div>
                          <div className="min-w-0">
                            <p className="font-medium text-sm truncate">{pickBi(isRTL, b.name_ar ?? '', b.name_en ?? '') || '—'}</p>
                            {b.city_id && <p className="text-[10px] text-muted-foreground tech-content truncate">{b.city_id}</p>}
                          </div>
                        </div>
                        <div className="flex gap-1 shrink-0">
                          {b.is_main && <Badge className="text-[9px]">{pickBi(isRTL, 'رئيسي', 'Main')}</Badge>}
                          {!b.is_active && <Badge variant="outline" className="text-[9px]">{pickBi(isRTL, 'موقوف', 'Inactive')}</Badge>}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </Card>

            {category && (
              <Card className="p-5">
                <h2 className="font-semibold mb-3 flex items-center gap-2"><Tag className="w-4 h-4 text-primary" />{pickBi(isRTL, 'التصنيف والقطاع', 'Category & Sector')}</h2>
                <Link to={`/sectors/${category.id}`} className="flex items-center gap-3 p-3 rounded-xl border border-border/40 hover:border-primary/50 hover-lift transition-all">
                  {category.icon && <span className="text-3xl">{category.icon}</span>}
                  <div className="flex-1">
                    <p className="font-medium">{pickBi(isRTL, category.name_ar ?? '', category.name_en ?? '')}</p>
                    <p className="text-xs text-muted-foreground inline-flex items-center gap-1">
                      <Library className="w-3 h-3" />
                      {pickBi(isRTL, 'استعراض القطاع في المكتبة', 'Browse in library')}
                    </p>
                  </div>
                  <ExternalLink className="w-4 h-4 text-muted-foreground" />
                </Link>
              </Card>
            )}
          </TabsContent>

          {/* ===== Settings ===== */}
          <TabsContent value="settings" className="space-y-4 mt-0">
            <Card className="p-5">
              <h2 className="font-semibold mb-4 text-sm">{pickBi(isRTL, 'بيانات النظام', 'System info')}</h2>
              <dl className="grid sm:grid-cols-2 gap-3 text-sm">
                <div>
                  <dt className="text-[10px] uppercase tracking-wide text-muted-foreground">{pickBi(isRTL, 'معرف الكيان', 'Entity ID')}</dt>
                  <dd className="tech-content text-xs mt-0.5 break-all">{biz.id}</dd>
                </div>
                <div>
                  <dt className="text-[10px] uppercase tracking-wide text-muted-foreground">{pickBi(isRTL, 'المعرف المرجعي', 'Ref ID')}</dt>
                  <dd className="tech-content text-xs mt-0.5">{refIdDisplay || '—'}</dd>
                </div>
                <div>
                  <dt className="text-[10px] uppercase tracking-wide text-muted-foreground">{pickBi(isRTL, 'حالة الاعتماد', 'Approval')}</dt>
                  <dd className="text-xs mt-0.5">{biz.approval_status ?? '—'}</dd>
                </div>
                <div>
                  <dt className="text-[10px] uppercase tracking-wide text-muted-foreground">{pickBi(isRTL, 'نوع الكيان', 'Entity type')}</dt>
                  <dd className="text-xs mt-0.5">{biz.entity_type ?? '—'}</dd>
                </div>
              </dl>
              {(isOwner || isAdmin) && (
                <div className="mt-5 pt-4 border-t border-border/40 flex gap-2 flex-wrap">
                  <Button asChild variant="outline" size="sm">
                    <Link to="/dashboard/business-edit">{pickBi(isRTL, 'تحرير البيانات الأساسية', 'Edit core data')}</Link>
                  </Button>
                  {isAdmin && (
                    <Button asChild variant="outline" size="sm">
                      <Link to={`/admin/businesses?focus=${biz.id}`}>{pickBi(isRTL, 'فتح في لوحة الإدارة', 'Open in admin')}</Link>
                    </Button>
                  )}
                </div>
              )}
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </DashboardLayout>
  );
};

export default DashboardEntityDetail;