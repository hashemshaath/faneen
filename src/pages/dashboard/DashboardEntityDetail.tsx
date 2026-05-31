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
import { updateBusinessStaffById } from '@/modules/businesses/services/updateBusinessStaffById';
import { insertBusinessStaff } from '@/modules/businesses/services/insertBusinessStaff';
import { deleteBusinessStaffById } from '@/modules/businesses/services/deleteBusinessStaffById';
import { getProfileByUserId } from '@/modules/users/services/getProfileByUserId';
import { listBranchesByBusiness } from '@/modules/catalog';
import { supabase } from '@/integrations/supabase/client';
import { StaffPermissionsMatrix } from '@/components/dashboard/entities/StaffPermissionsMatrix';
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
  const { id = '' } = useParams<{ id: string }>();
  const { user, isAdmin } = useAuth();
  const { language } = useLanguage();
  const isRTL = language === 'ar';
  const queryClient = useQueryClient();

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
      const { data } = await supabase
        .from('profiles')
        .select('user_id, ref_id, full_name, email, phone, avatar_url')
        .in('user_id', staffUserIds);
      return (data ?? []) as OwnerProfile[];
    },
    enabled: staffUserIds.length > 0,
  });
  const profileMap = new Map((staffProfiles ?? []).map((p) => [p.user_id, p]));

  // Add staff state
  const [addRefId, setAddRefId] = useState('');
  const [addRole, setAddRole] = useState<StaffRow['role']>('viewer');
  const [submitting, setSubmitting] = useState(false);

  const handleAddStaff = async () => {
    const ref = addRefId.trim().toUpperCase();
    if (!ref.startsWith('USR-')) {
      toast({ title: pickBi(isRTL, 'معرّف غير صحيح', 'Invalid ID'), description: pickBi(isRTL, 'استخدم معرف USR-XXXXXXX', 'Use a USR-XXXXXXX reference'), variant: 'destructive' });
      return;
    }
    setSubmitting(true);
    try {
      const { data: prof } = await supabase.from('profiles').select('user_id').eq('ref_id', ref).maybeSingle();
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
    const res = await updateBusinessStaffById({ id: staffId, values: { role } });
    if (res.error) {
      toast({ title: pickBi(isRTL, 'تعذّر التحديث', 'Update failed'), variant: 'destructive' });
    } else {
      toast({ title: pickBi(isRTL, 'تم تحديث الدور', 'Role updated') });
      refetchStaff();
    }
  };

  const handleToggleActive = async (s: StaffRow) => {
    const res = await updateBusinessStaffById({ id: s.id, values: { is_active: !s.is_active } });
    if (res.error) {
      toast({ title: pickBi(isRTL, 'تعذّر التحديث', 'Update failed'), variant: 'destructive' });
    } else {
      toast({ title: pickBi(isRTL, s.is_active ? 'تم الإيقاف' : 'تم التفعيل', s.is_active ? 'Deactivated' : 'Activated') });
      refetchStaff();
    }
  };

  const handleRemove = async (staffId: string) => {
    const res = await deleteBusinessStaffById({ id: staffId });
    if (res.error) {
      toast({ title: pickBi(isRTL, 'تعذّر الحذف', 'Delete failed'), variant: 'destructive' });
    } else {
      toast({ title: pickBi(isRTL, 'تم الحذف', 'Removed') });
      refetchStaff();
    }
  };

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

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <Link to="/dashboard/entities" className="text-sm text-muted-foreground inline-flex items-center gap-1 hover:text-primary">
          <ArrowLeft className={`w-4 h-4 ${isRTL ? 'rotate-180' : ''}`} />
          {pickBi(isRTL, 'كل الكيانات', 'All entities')}
        </Link>

        {/* Header */}
        <Card className="p-6">
          <div className="flex items-start justify-between gap-4 flex-wrap">
            <div className="flex items-center gap-4 min-w-0">
              <div className="w-16 h-16 rounded-2xl bg-primary/10 text-primary flex items-center justify-center shrink-0">
                <Building2 className="w-8 h-8" />
              </div>
              <div className="min-w-0">
                <h1 className="text-2xl font-bold truncate">{bizName}</h1>
                <p className="text-xs text-muted-foreground tech-content mt-1">
                  {biz.ref_id ?? biz.legacy_ref_id ?? '—'}
                  {biz.username && <span className="ms-2 opacity-70">@{biz.username}</span>}
                </p>
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
        </Card>

        {/* Owner */}
        <Card className="p-5">
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
                <p className="text-xs text-muted-foreground tech-content">{owner.ref_id ?? '—'}{owner.email && ` • ${owner.email}`}</p>
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
        </Card>

        {/* Category + Branches */}
        <div className="grid gap-4 md:grid-cols-2">
          <Card className="p-5">
            <h2 className="font-semibold mb-3 flex items-center gap-2"><Tag className="w-4 h-4 text-primary" />{pickBi(isRTL, 'التصنيف', 'Category')}</h2>
            {category ? (
              <div className="flex items-center gap-2">
                {category.icon && <span className="text-2xl">{category.icon}</span>}
                <div>
                  <p className="font-medium">{pickBi(isRTL, category.name_ar ?? '', category.name_en ?? '')}</p>
                  <Link to={`/sectors/${category.id}`} className="text-xs text-primary hover:underline inline-flex items-center gap-1">
                    <Library className="w-3 h-3" />
                    {pickBi(isRTL, 'استعراض القطاع', 'Browse sector')}
                  </Link>
                </div>
              </div>
            ) : (
              <p className="text-sm text-muted-foreground">{pickBi(isRTL, 'لم يُحدد تصنيف', 'No category')}</p>
            )}
            {biz.entity_type && (
              <Badge variant="outline" className="mt-3 text-[10px]">{biz.entity_type}</Badge>
            )}
          </Card>

          <Card className="p-5">
            <h2 className="font-semibold mb-3 flex items-center gap-2"><MapPin className="w-4 h-4 text-primary" />{pickBi(isRTL, 'الفروع', 'Branches')} <Badge variant="outline" className="ms-auto text-[10px]">{branches?.length ?? 0}</Badge></h2>
            {(branches ?? []).length === 0 ? (
              <p className="text-sm text-muted-foreground">{pickBi(isRTL, 'لا توجد فروع', 'No branches')}</p>
            ) : (
              <ul className="space-y-2">
                {branches!.map((b) => (
                  <li key={b.id} className="flex items-center justify-between text-sm border-b border-border/40 pb-2 last:border-0">
                    <span className="truncate">{pickBi(isRTL, b.name_ar ?? '', b.name_en ?? '') || '—'}</span>
                    <div className="flex gap-1 shrink-0">
                      {b.is_main && <Badge className="text-[9px]">{pickBi(isRTL, 'رئيسي', 'Main')}</Badge>}
                      {!b.is_active && <Badge variant="outline" className="text-[9px]">{pickBi(isRTL, 'موقوف', 'Inactive')}</Badge>}
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </Card>
        </div>

        {/* Staff */}
        <Card className="p-5">
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-semibold flex items-center gap-2"><Users className="w-4 h-4 text-primary" />{pickBi(isRTL, 'فريق العمل', 'Team')} <Badge variant="outline" className="text-[10px]">{(staff ?? []).length}</Badge></h2>
          </div>

          {canManageStaff && (
            <div className="grid gap-2 md:grid-cols-[1fr_180px_auto] mb-4 p-3 rounded-xl bg-muted/40">
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

          {(staff ?? []).length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-4">{pickBi(isRTL, 'لا يوجد أعضاء', 'No members')}</p>
          ) : (
            <div className="space-y-2">
              {staff!.map((s) => {
                const prof = profileMap.get(s.user_id);
                return (
                  <div key={s.id} className="rounded-xl border border-border/40 p-3">
                    <div className="flex items-center gap-3">
                    {prof?.avatar_url ? (
                      <img src={prof.avatar_url} alt="" className="w-9 h-9 rounded-full object-cover" />
                    ) : (
                      <div className="w-9 h-9 rounded-full bg-muted flex items-center justify-center"><User className="w-4 h-4 text-muted-foreground" /></div>
                    )}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <p className="font-medium text-sm truncate">{prof?.full_name ?? '—'}</p>
                        {s.is_primary_manager && <Badge className="text-[9px]">{pickBi(isRTL, 'المدير الرئيسي', 'Primary')}</Badge>}
                        {!s.is_active && <Badge variant="outline" className="text-[9px]">{pickBi(isRTL, 'موقوف', 'Inactive')}</Badge>}
                      </div>
                      <p className="text-[11px] text-muted-foreground tech-content">{prof?.ref_id ?? s.ref_id ?? '—'}</p>
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
      </div>
    </DashboardLayout>
  );
};

export default DashboardEntityDetail;