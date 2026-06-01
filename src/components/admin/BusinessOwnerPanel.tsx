/**
 * ORG-RBAC-9F — BusinessOwnerPanel
 *
 * Super-admin in-page panel for managing the "account owner / مسؤول الحساب"
 * of a business. Shows owner identity + login info, allows inline editing of
 * profile fields, resets the password, updates the auth login email, and
 * supports re-assigning ownership to another user.
 *
 * UX:
 * - Strictly NO popups/dialogs — inline forms only.
 * - Bilingual (AR/EN) via isRTL.
 * - Calls existing canonical wrappers; no direct supabase reads outside them.
 */
import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import {
  User as UserIcon,
  Mail,
  Phone,
  ShieldAlert,
  KeyRound,
  RefreshCcw,
  Loader2,
  ExternalLink,
  CheckCircle2,
  AlertTriangle,
  Building2,
  ShieldCheck,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Switch } from '@/components/ui/switch';
import { toast } from 'sonner';
import { ReferenceTag } from '@/components/reference/ReferenceTag';
import { getProfileDisplayName } from '@/modules/profiles/utils/displayName';

import { getProfileByUserId } from '@/modules/users/services/getProfileByUserId';
import { getProfileByRefId } from '@/modules/users/services/getProfileByRefId';
import { updateProfileById } from '@/modules/users/services/updateProfileById';
import { listOwnerBusinesses } from '@/modules/businesses/services/listOwnerBusinesses';
import { getUserRoles, type AppRole } from '@/modules/identity/services/roles/reads';
import {
  adminResetPassword,
  adminUpdateUserEmail,
} from '@/modules/identity/services/adminSecurity';
import { adminReassignBusinessOwner } from '@/modules/businesses/services/adminReassignBusinessOwner';

interface OwnerProfile {
  id: string;
  user_id: string;
  ref_id: string | null;
  full_name_ar: string | null;
  full_name_en: string | null;
  username: string | null;
  email: string | null;
  phone: string | null;
  is_banned: boolean | null;
  created_at: string | null;
}

interface Props {
  businessId: string;
  businessRef: string | null;
  ownerUserId: string;
  isRTL: boolean;
  /** Called after a successful ownership reassignment so the parent can refetch. */
  onOwnerReassigned?: (newOwnerUserId: string) => void;
}

const t = (isRTL: boolean, ar: string, en: string) => (isRTL ? ar : en);

export const BusinessOwnerPanel: React.FC<Props> = ({
  businessId,
  businessRef,
  ownerUserId,
  isRTL,
  onOwnerReassigned,
}) => {
  const qc = useQueryClient();

  // Owner profile (full)
  const ownerQuery = useQuery({
    queryKey: ['admin-business-owner-full', ownerUserId],
    queryFn: async () => {
      const { data } = await getProfileByUserId<OwnerProfile>({
        userId: ownerUserId,
        select:
          'id, user_id, ref_id, full_name_ar, full_name_en, username, email, phone, is_banned, created_at',
      });
      return data;
    },
    enabled: !!ownerUserId,
  });
  const owner = ownerQuery.data ?? null;

  // Roles
  const rolesQuery = useQuery({
    queryKey: ['admin-business-owner-roles', ownerUserId],
    queryFn: () => getUserRoles(ownerUserId),
    enabled: !!ownerUserId,
  });
  const roles: AppRole[] = rolesQuery.data ?? [];

  // Other businesses owned
  const otherBizQuery = useQuery({
    queryKey: ['admin-business-owner-other-bizs', ownerUserId],
    queryFn: async () => {
      const { data } = await listOwnerBusinesses<{ id: string; ref_id: string | null; name_ar: string; name_en: string | null; is_active: boolean }>({
        userId: ownerUserId,
        select: 'id, ref_id, name_ar, name_en, is_active',
        orderBy: { column: 'created_at', ascending: false },
        limit: 20,
      });
      return data ?? [];
    },
    enabled: !!ownerUserId,
  });
  const otherBizs = (otherBizQuery.data ?? []).filter((b) => b.id !== businessId);

  // ── Inline profile editor ──
  const [profileForm, setProfileForm] = useState<Partial<OwnerProfile>>({});
  const [profileDirty, setProfileDirty] = useState(false);

  React.useEffect(() => {
    if (owner) {
      setProfileForm({
        full_name_ar: owner.full_name_ar,
        full_name_en: owner.full_name_en,
        username: owner.username,
        phone: owner.phone,
        is_banned: owner.is_banned,
      });
      setProfileDirty(false);
    }
  }, [owner?.id]); // eslint-disable-line react-hooks/exhaustive-deps

  const setPF = <K extends keyof OwnerProfile>(k: K, v: OwnerProfile[K]) => {
    setProfileForm((p) => ({ ...p, [k]: v }));
    setProfileDirty(true);
  };

  const saveProfileMut = useMutation({
    mutationFn: async () => {
      if (!owner) throw new Error('Owner not loaded');
      const { error } = await updateProfileById({
        id: owner.id,
        values: {
          full_name_ar: profileForm.full_name_ar ?? null,
          full_name_en: profileForm.full_name_en ?? null,
          username: profileForm.username ?? null,
          phone: profileForm.phone ?? null,
          is_banned: profileForm.is_banned ?? false,
        },
      });
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success(t(isRTL, 'تم تحديث بيانات المسؤول', 'Owner profile updated'));
      setProfileDirty(false);
      qc.invalidateQueries({ queryKey: ['admin-business-owner-full', ownerUserId] });
      qc.invalidateQueries({ queryKey: ['admin-business-owner-ref', ownerUserId] });
    },
    onError: (err: unknown) => {
      const msg = err instanceof Error ? err.message : String(err);
      toast.error(t(isRTL, 'تعذر التحديث', 'Update failed') + ': ' + msg);
    },
  });

  // ── Auth email change ──
  const [newEmail, setNewEmail] = useState('');
  const [autoConfirm, setAutoConfirm] = useState(true);
  const updateEmailMut = useMutation({
    mutationFn: async () => {
      const email = newEmail.trim().toLowerCase();
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
        throw new Error(t(isRTL, 'صيغة البريد غير صحيحة', 'Invalid email format'));
      }
      const { data, error } = await adminUpdateUserEmail({
        target_user_id: ownerUserId,
        new_email: email,
        auto_confirm: autoConfirm,
      });
      if (error) throw error;
      const payload = data as { success?: boolean; error?: string; code?: string } | null;
      if (!payload?.success) throw new Error(payload?.error ?? 'Update failed');
      return payload;
    },
    onSuccess: () => {
      toast.success(t(isRTL, 'تم تحديث بريد تسجيل الدخول', 'Login email updated'));
      setNewEmail('');
      qc.invalidateQueries({ queryKey: ['admin-business-owner-full', ownerUserId] });
    },
    onError: (err: unknown) => {
      const msg = err instanceof Error ? err.message : String(err);
      toast.error(msg);
    },
  });

  // ── Password reset ──
  const sendResetMut = useMutation({
    mutationFn: async () => {
      const { data, error } = await adminResetPassword({
        target_user_id: ownerUserId,
        action: 'send_reset_link',
      });
      if (error) throw error;
      const payload = data as { success?: boolean; error?: string } | null;
      if (!payload?.success) throw new Error(payload?.error ?? 'Failed');
    },
    onSuccess: () => toast.success(t(isRTL, 'تم إرسال رابط إعادة التعيين', 'Reset link sent')),
    onError: (err: unknown) => {
      const msg = err instanceof Error ? err.message : String(err);
      toast.error(msg);
    },
  });

  const [newPwd, setNewPwd] = useState('');
  const setPwdMut = useMutation({
    mutationFn: async () => {
      if (newPwd.length < 8) {
        throw new Error(t(isRTL, 'كلمة المرور قصيرة جداً', 'Password too short'));
      }
      const { data, error } = await adminResetPassword({
        target_user_id: ownerUserId,
        action: 'change_password',
        new_password: newPwd,
      });
      if (error) throw error;
      const payload = data as { success?: boolean; error?: string } | null;
      if (!payload?.success) throw new Error(payload?.error ?? 'Failed');
    },
    onSuccess: () => {
      toast.success(t(isRTL, 'تم تغيير كلمة المرور', 'Password changed'));
      setNewPwd('');
    },
    onError: (err: unknown) => {
      const msg = err instanceof Error ? err.message : String(err);
      toast.error(msg);
    },
  });

  // ── Reassign ownership ──
  const [reassignRef, setReassignRef] = useState('');
  const [reassignReason, setReassignReason] = useState('');
  const [resolvedNewOwner, setResolvedNewOwner] = useState<{ user_id: string; full_name_ar: string | null; ref_id: string | null } | null>(null);
  const [resolving, setResolving] = useState(false);

  const resolveNewOwner = async () => {
    const ref = reassignRef.trim().toUpperCase();
    if (!ref.startsWith('USR-')) {
      toast.error(t(isRTL, 'المعرف يجب أن يبدأ بـ USR-', 'Ref must start with USR-'));
      return;
    }
    setResolving(true);
    try {
      const { data, error } = await getProfileByRefId<{ user_id: string; full_name_ar: string | null; ref_id: string | null }>({
        refId: ref,
        select: 'user_id, full_name_ar, ref_id',
      });
      if (error) throw error;
      if (!data) {
        toast.error(t(isRTL, 'لا يوجد مستخدم بهذا المعرف', 'No user found with that ref'));
        setResolvedNewOwner(null);
        return;
      }
      if (data.user_id === ownerUserId) {
        toast.error(t(isRTL, 'هذا هو المالك الحالي', 'Already the current owner'));
        setResolvedNewOwner(null);
        return;
      }
      setResolvedNewOwner(data);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      toast.error(msg);
    } finally {
      setResolving(false);
    }
  };

  const reassignMut = useMutation({
    mutationFn: async () => {
      if (!resolvedNewOwner) throw new Error(t(isRTL, 'تحقق من المالك الجديد أولاً', 'Resolve new owner first'));
      const res = await adminReassignBusinessOwner({
        businessId,
        newOwnerUserId: resolvedNewOwner.user_id,
        reason: reassignReason.trim() || null,
      });
      if (!res.success) {
        throw new Error(res.error ?? `Reassignment failed (${res.code})`);
      }
      return res;
    },
    onSuccess: (res) => {
      toast.success(t(isRTL, 'تم نقل ملكية الكيان', 'Business ownership transferred'));
      setReassignRef('');
      setReassignReason('');
      setResolvedNewOwner(null);
      qc.invalidateQueries({ queryKey: ['admin-businesses'] });
      if (res.new_owner) onOwnerReassigned?.(res.new_owner);
    },
    onError: (err: unknown) => {
      const msg = err instanceof Error ? err.message : String(err);
      toast.error(msg);
    },
  });

  if (ownerQuery.isLoading) {
    return (
      <div className="p-6 rounded-xl bg-muted/30 border border-border/30 flex items-center gap-2 text-sm text-muted-foreground">
        <Loader2 className="w-4 h-4 animate-spin" />
        {t(isRTL, 'جاري تحميل بيانات المسؤول…', 'Loading owner data…')}
      </div>
    );
  }

  if (!owner) {
    return (
      <div className="p-4 rounded-xl bg-destructive/10 border border-destructive/30 text-xs text-destructive flex items-center gap-2">
        <AlertTriangle className="w-4 h-4" />
        {t(isRTL, 'لم يتم العثور على ملف المسؤول', 'Owner profile not found')}
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* ── Identity card ── */}
      <div className="p-4 rounded-xl border border-border/40 bg-card space-y-3">
        <div className="flex items-center justify-between gap-2 flex-wrap">
          <div className="flex items-center gap-2 min-w-0">
            <div className="w-10 h-10 rounded-xl bg-primary/10 text-primary flex items-center justify-center shrink-0">
              <UserIcon className="w-5 h-5" />
            </div>
            <div className="min-w-0">
              <div className="text-sm font-semibold truncate" dir="auto">
                {getProfileDisplayName(owner, {
                  locale: isRTL ? 'ar' : 'en',
                  emptyFallback: t(isRTL, 'بدون اسم', 'No name'),
                })}
              </div>
              <div className="text-[10px] text-muted-foreground flex items-center gap-1">
                <ReferenceTag refId={owner.ref_id} isRTL={isRTL} />
                {owner.is_banned && (
                  <Badge variant="destructive" className="text-[9px] h-4 px-1">
                    {t(isRTL, 'محظور', 'Banned')}
                  </Badge>
                )}
              </div>
            </div>
          </div>
          <Button variant="outline" size="sm" asChild className="h-8 text-[11px] rounded-lg">
            <Link to={`/admin/users?focus=${owner.user_id}`}>
              <ExternalLink className="w-3 h-3 me-1" />
              {t(isRTL, 'فتح ملف المسؤول كاملاً', 'Open full user profile')}
            </Link>
          </Button>
        </div>

        {/* Roles + other businesses summary */}
        <div className="flex items-center gap-2 flex-wrap text-[10px]">
          {roles.length === 0 ? (
            <Badge variant="secondary" className="text-[9px]">{t(isRTL, 'بدون أدوار', 'No roles')}</Badge>
          ) : (
            roles.map((r) => (
              <Badge key={r} variant="outline" className="text-[9px] gap-1">
                <ShieldCheck className="w-2.5 h-2.5" /> {r}
              </Badge>
            ))
          )}
          {otherBizs.length > 0 && (
            <Badge variant="secondary" className="text-[9px] gap-1">
              <Building2 className="w-2.5 h-2.5" />
              {t(isRTL, `يدير ${otherBizs.length} كيان آخر`, `Owns ${otherBizs.length} other`)}
            </Badge>
          )}
        </div>
      </div>

      {/* ── Profile editor ── */}
      <div className="p-4 rounded-xl border border-border/40 bg-card space-y-3">
        <div className="text-xs font-semibold flex items-center gap-1">
          <UserIcon className="w-3.5 h-3.5" />
          {t(isRTL, 'بيانات الملف الشخصي', 'Profile details')}
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          <div>
            <Label className="text-[10px]">{t(isRTL, 'الاسم (عربي)', 'Name (AR)')}</Label>
            <Input
              className="h-9 text-xs mt-1"
              dir="auto"
              value={profileForm.full_name_ar ?? ''}
              onChange={(e) => setPF('full_name_ar', e.target.value)}
            />
          </div>
          <div>
            <Label className="text-[10px]">{t(isRTL, 'الاسم (إنجليزي)', 'Name (EN)')}</Label>
            <Input
              className="h-9 text-xs mt-1"
              dir="ltr"
              value={profileForm.full_name_en ?? ''}
              onChange={(e) => setPF('full_name_en', e.target.value)}
            />
          </div>
          <div>
            <Label className="text-[10px]">{t(isRTL, 'اسم المستخدم', 'Username')}</Label>
            <Input
              className="h-9 text-xs mt-1 tech-content"
              dir="ltr"
              value={profileForm.username ?? ''}
              onChange={(e) => setPF('username', e.target.value)}
              placeholder="username"
            />
          </div>
          <div>
            <Label className="text-[10px] flex items-center gap-1"><Phone className="w-3 h-3" /> {t(isRTL, 'الجوال', 'Phone')}</Label>
            <Input
              className="h-9 text-xs mt-1 tech-content"
              dir="ltr"
              value={profileForm.phone ?? ''}
              onChange={(e) => setPF('phone', e.target.value)}
              placeholder="+9665…"
            />
          </div>
        </div>
        <div className="flex items-center justify-between gap-2 pt-1">
          <div className="flex items-center gap-2">
            <Switch
              checked={!!profileForm.is_banned}
              onCheckedChange={(v) => setPF('is_banned', v)}
              id="owner-banned"
            />
            <Label htmlFor="owner-banned" className="text-[11px] cursor-pointer">
              {t(isRTL, 'حظر هذا المستخدم', 'Ban this user')}
            </Label>
          </div>
          <Button
            size="sm"
            disabled={!profileDirty || saveProfileMut.isPending}
            onClick={() => saveProfileMut.mutate()}
            className="h-8 text-[11px] rounded-lg"
          >
            {saveProfileMut.isPending ? <Loader2 className="w-3 h-3 me-1 animate-spin" /> : <CheckCircle2 className="w-3 h-3 me-1" />}
            {t(isRTL, 'حفظ', 'Save')}
          </Button>
        </div>
      </div>

      {/* ── Login credentials ── */}
      <div className="p-4 rounded-xl border border-border/40 bg-card space-y-3">
        <div className="text-xs font-semibold flex items-center gap-1">
          <KeyRound className="w-3.5 h-3.5" />
          {t(isRTL, 'بيانات تسجيل الدخول', 'Login credentials')}
        </div>

        <div className="space-y-2">
          <Label className="text-[10px] flex items-center gap-1">
            <Mail className="w-3 h-3" /> {t(isRTL, 'البريد الحالي', 'Current email')}
          </Label>
          <div className="px-3 py-2 rounded-lg bg-muted/40 text-xs font-mono break-all" dir="ltr">
            {owner.email || <span className="text-muted-foreground">{t(isRTL, 'غير معرّف', 'unknown')}</span>}
          </div>
        </div>

        <div className="space-y-2">
          <Label className="text-[10px]">{t(isRTL, 'تغيير بريد تسجيل الدخول', 'Change login email')}</Label>
          <div className="flex items-center gap-2">
            <Input
              type="email"
              dir="ltr"
              className="h-9 text-xs tech-content"
              placeholder="new@example.com"
              value={newEmail}
              onChange={(e) => setNewEmail(e.target.value)}
            />
            <Button
              size="sm"
              variant="outline"
              disabled={!newEmail || updateEmailMut.isPending}
              onClick={() => updateEmailMut.mutate()}
              className="h-9 text-[11px] rounded-lg shrink-0"
            >
              {updateEmailMut.isPending ? <Loader2 className="w-3 h-3 me-1 animate-spin" /> : <Mail className="w-3 h-3 me-1" />}
              {t(isRTL, 'تحديث', 'Update')}
            </Button>
          </div>
          <div className="flex items-center gap-2">
            <Switch checked={autoConfirm} onCheckedChange={setAutoConfirm} id="auto-confirm" />
            <Label htmlFor="auto-confirm" className="text-[10px] cursor-pointer text-muted-foreground">
              {t(isRTL, 'تأكيد البريد تلقائياً بدون رسالة', 'Auto-confirm without verification email')}
            </Label>
          </div>
        </div>

        <Separator />

        <div className="space-y-2">
          <Label className="text-[10px]">{t(isRTL, 'كلمة المرور', 'Password')}</Label>
          <div className="flex items-center gap-2">
            <Input
              type="text"
              dir="ltr"
              className="h-9 text-xs tech-content"
              placeholder={t(isRTL, '٨ أحرف على الأقل', 'min 8 chars')}
              value={newPwd}
              onChange={(e) => setNewPwd(e.target.value)}
            />
            <Button
              size="sm"
              variant="outline"
              disabled={newPwd.length < 8 || setPwdMut.isPending}
              onClick={() => setPwdMut.mutate()}
              className="h-9 text-[11px] rounded-lg shrink-0"
            >
              {setPwdMut.isPending ? <Loader2 className="w-3 h-3 me-1 animate-spin" /> : <KeyRound className="w-3 h-3 me-1" />}
              {t(isRTL, 'تعيين', 'Set')}
            </Button>
          </div>
          <Button
            size="sm"
            variant="ghost"
            disabled={sendResetMut.isPending}
            onClick={() => sendResetMut.mutate()}
            className="h-8 text-[10px] text-muted-foreground hover:text-foreground"
          >
            {sendResetMut.isPending ? <Loader2 className="w-3 h-3 me-1 animate-spin" /> : <RefreshCcw className="w-3 h-3 me-1" />}
            {t(isRTL, 'إرسال رابط إعادة التعيين للبريد', 'Send reset link by email')}
          </Button>
        </div>
      </div>

      {/* ── Other businesses ── */}
      {otherBizs.length > 0 && (
        <div className="p-4 rounded-xl border border-border/40 bg-card space-y-2">
          <div className="text-xs font-semibold flex items-center gap-1">
            <Building2 className="w-3.5 h-3.5" />
            {t(isRTL, 'كيانات أخرى يديرها', 'Other businesses owned')}
          </div>
          <div className="space-y-1">
            {otherBizs.map((b) => (
              <div key={b.id} className="flex items-center justify-between gap-2 text-[11px] px-2 py-1 rounded-lg hover:bg-muted/30">
                <span className="truncate" dir="auto">
                  {isRTL ? b.name_ar : (b.name_en || b.name_ar)}
                </span>
                <div className="flex items-center gap-1 shrink-0">
                  {!b.is_active && <Badge variant="secondary" className="text-[8px] h-4 px-1">{t(isRTL, 'غير نشط', 'inactive')}</Badge>}
                  <ReferenceTag refId={b.ref_id} isRTL={isRTL} />
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ── Reassign ownership ── */}
      <div className="p-4 rounded-xl border border-amber-300/40 bg-amber-50/40 dark:bg-amber-950/20 space-y-3">
        <div className="text-xs font-semibold flex items-center gap-1 text-amber-900 dark:text-amber-200">
          <ShieldAlert className="w-3.5 h-3.5" />
          {t(isRTL, 'إعادة إسناد ملكية الكيان', 'Reassign business ownership')}
        </div>
        <p className="text-[10px] text-muted-foreground">
          {t(
            isRTL,
            'سيتم نقل ملكية الكيان لمستخدم آخر باستخدام معرف USR-. هذه العملية تُسجَّل في سجل العمليات الإدارية.',
            'Transfers business ownership to another user via their USR- ref. Action is recorded in the admin operation log.',
          )}
        </p>
        <div className="flex items-center gap-2">
          <Input
            dir="ltr"
            className="h-9 text-xs tech-content uppercase"
            placeholder="USR-1000001"
            value={reassignRef}
            onChange={(e) => { setReassignRef(e.target.value); setResolvedNewOwner(null); }}
          />
          <Button
            size="sm"
            variant="outline"
            disabled={!reassignRef || resolving}
            onClick={resolveNewOwner}
            className="h-9 text-[11px] rounded-lg shrink-0"
          >
            {resolving ? <Loader2 className="w-3 h-3 me-1 animate-spin" /> : null}
            {t(isRTL, 'تحقق', 'Resolve')}
          </Button>
        </div>
        {resolvedNewOwner && (
          <div className="p-2 rounded-lg bg-card border border-border/40 text-[11px] flex items-center justify-between gap-2">
            <span dir="auto">{resolvedNewOwner.full_name_ar || resolvedNewOwner.ref_id}</span>
            <ReferenceTag refId={resolvedNewOwner.ref_id} isRTL={isRTL} />
          </div>
        )}
        <div>
          <Label className="text-[10px]">{t(isRTL, 'سبب النقل (اختياري)', 'Reason (optional)')}</Label>
          <Input
            className="h-9 text-xs mt-1"
            dir="auto"
            value={reassignReason}
            onChange={(e) => setReassignReason(e.target.value)}
            placeholder={t(isRTL, 'مثال: تغيير المالك القانوني', 'e.g. legal ownership change')}
          />
        </div>
        <Button
          size="sm"
          variant="destructive"
          disabled={!resolvedNewOwner || reassignMut.isPending}
          onClick={() => reassignMut.mutate()}
          className="h-9 text-[11px] rounded-lg w-full"
        >
          {reassignMut.isPending ? <Loader2 className="w-3 h-3 me-1 animate-spin" /> : <ShieldAlert className="w-3 h-3 me-1" />}
          {t(isRTL, 'نقل الملكية الآن', 'Transfer ownership now')}
        </Button>
        {businessRef && (
          <div className="text-[9px] text-muted-foreground text-center font-mono">
            {t(isRTL, 'كيان', 'Business')}: {businessRef}
          </div>
        )}
      </div>
    </div>
  );
};

export default BusinessOwnerPanel;