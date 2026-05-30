import React, { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import {
  User, Mail, Phone, Globe, MapPin, Hash, Save, Loader2, Camera,
  ShieldCheck, ExternalLink, Building2, Crown, AtSign, Languages,
  AlertCircle, ArrowLeft, Settings as SettingsIcon, Copy, Check,
  IdCard, Receipt, MapPinned, Search,
} from 'lucide-react';

import { DashboardLayout } from '@/components/dashboard/DashboardLayout';
import { useAuth } from '@/contexts/AuthContext';
import { useLanguage } from '@/i18n/LanguageContext';
import { usePageMeta } from '@/hooks/usePageMeta';
import { useNoIndex } from '@/hooks/useNoIndex';
import { useDisplayRefId } from '@/hooks/useDisplayRefId';

import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ImageUpload } from '@/components/ui/image-upload';

import { supabase } from '@/integrations/supabase/client';
import { updateProfile } from '@/modules/users';
import { getOwnerBusiness, listBusinessesByIds } from '@/modules/businesses';
import { nationalAddressLookup } from '@/modules/locations';
import { useActiveWorkspace } from '@/hooks/useActiveWorkspace';
import { getDisplayEmail, isSyntheticPhoneEmail } from '@/lib/auth-email';
import { cn } from '@/lib/utils';
import { UsernamePicker } from '@/components/common/UsernamePicker';
import { PhoneField, parsePhoneValue, toE164 } from '@/components/forms/PhoneField';

const t = (isRTL: boolean, ar: string, en: string) => (isRTL ? ar : en);

const DashboardProfile: React.FC = () => {
  useNoIndex();
  const navigate = useNavigate();
  const { isRTL } = useLanguage();
  const { user, profile, refreshProfile } = useAuth();
  const displayRefId = useDisplayRefId();
  const qc = useQueryClient();
  // WORKSPACE-CONTEXT-4A: source the active entity id from the unified
  // workspace hook so multi-business owners see the picked business in
  // the "view as provider" link instead of always the first owned one.
  // Falls back to getOwnerBusiness when no entity is selected (preserves
  // pre-migration behavior for single-business users).
  const { active_entity_id, entities } = useActiveWorkspace();
  const activeOwnerEntityId = useMemo(() => {
    if (!active_entity_id) return null;
    const e = entities.find((x) => x.entity_id === active_entity_id);
    return e && e.source === 'owner' ? e.entity_id : null;
  }, [active_entity_id, entities]);
  usePageMeta({
    title: t(isRTL, 'الملف الشخصي | قِطاعات', 'My Profile | Qitaat'),
    noindex: true,
  });

  // ───────────────────────── Form state
  const [form, setForm] = useState({
    full_name: '',
    full_name_ar: '',
    full_name_en: '',
    username: '',
    email: '',
    phone: '',
    avatar_url: '',
    preferred_language: 'ar' as 'ar' | 'en',
    national_id: '',
    national_id_type: '' as '' | 'saudi' | 'iqama',
    vat_number: '',
    short_national_address: '',
    region_name: '',
    district: '',
    street: '',
    building_number: '',
    additional_number: '',
    postal_code: '',
    address_line: '',
  });
  const [usernameOk, setUsernameOk] = useState(true); // empty username is acceptable for individuals
  const [saving, setSaving] = useState(false);
  const [copied, setCopied] = useState(false);
  const [splLoading, setSplLoading] = useState(false);

  // Seed form from profile
  useEffect(() => {
    if (!profile) return;
    setForm({
      full_name: profile.full_name ?? '',
      full_name_ar: profile.full_name_ar ?? '',
      full_name_en: profile.full_name_en ?? '',
      username: profile.username ?? '',
      // Unified email — prefer the authenticated login email so that
      // "profile email" and "login email" are always one and the same.
      // Fall back to the stored profile email (e.g. synthetic phone signup).
      email: (isSyntheticPhoneEmail(user?.email) ? (profile.email ?? '') : (user?.email ?? profile.email ?? '')),
      phone: profile.phone ?? '',
      avatar_url: profile.avatar_url ?? '',
      preferred_language: (profile.preferred_language as 'ar' | 'en') ?? 'ar',
      national_id: profile.national_id ?? '',
      national_id_type: (profile.national_id_type as 'saudi' | 'iqama' | null) ?? '',
      vat_number: profile.vat_number ?? '',
      short_national_address: profile.short_national_address ?? '',
      region_name: profile.region_name ?? '',
      district: profile.district ?? '',
      street: profile.street ?? '',
      building_number: profile.building_number ?? '',
      additional_number: profile.additional_number ?? '',
      postal_code: profile.postal_code ?? '',
      address_line: profile.address_line ?? '',
    });
    setUsernameOk(true);
  }, [profile, user?.email]);

  // Owner business (for "view as provider" link)
  const { data: business } = useQuery({
    queryKey: ['profile-page-owner-business', user?.id, activeOwnerEntityId],
    queryFn: async () => {
      if (!user) return null;
      // Prefer the active owner entity when one is selected via the
      // workspace switcher; otherwise fall back to the legacy single-row
      // owner lookup. RLS is authoritative either way.
      if (activeOwnerEntityId) {
        const { data } = await listBusinessesByIds<{
          id: string; username: string; name_ar: string; name_en: string;
        }>({ ids: [activeOwnerEntityId], select: 'id, username, name_ar, name_en' });
        return data?.[0] ?? null;
      }
      const { data } = await getOwnerBusiness<{ id: string; username: string; name_ar: string; name_en: string }>({
        userId: user.id, select: 'id, username, name_ar, name_en',
      });
      return data;
    },
    enabled: !!user,
    staleTime: 60_000,
  });

  // Dirty + completeness
  const dirty = useMemo(() => {
    if (!profile) return false;
    const cmp: Array<[unknown, unknown]> = [
      [form.full_name, profile.full_name ?? ''],
      [form.full_name_ar, profile.full_name_ar ?? ''],
      [form.full_name_en, profile.full_name_en ?? ''],
      [form.username, profile.username ?? ''],
      [form.email, profile.email ?? ''],
      [form.phone, profile.phone ?? ''],
      [form.avatar_url, profile.avatar_url ?? ''],
      [form.preferred_language, (profile.preferred_language as 'ar' | 'en') ?? 'ar'],
      [form.national_id, profile.national_id ?? ''],
      [form.national_id_type, (profile.national_id_type ?? '')],
      [form.vat_number, profile.vat_number ?? ''],
      [form.short_national_address, profile.short_national_address ?? ''],
      [form.region_name, profile.region_name ?? ''],
      [form.district, profile.district ?? ''],
      [form.street, profile.street ?? ''],
      [form.building_number, profile.building_number ?? ''],
      [form.additional_number, profile.additional_number ?? ''],
      [form.postal_code, profile.postal_code ?? ''],
      [form.address_line, profile.address_line ?? ''],
    ];
    return cmp.some(([a, b]) => a !== b);
  }, [form, profile]);

  const completion = useMemo(() => {
    const checks = [
      !!(form.full_name_ar.trim() || form.full_name_en.trim()),
      !!form.avatar_url,
      !!form.username,
      !!form.email.trim(),
      !!form.phone.trim(),
      !!form.national_id.trim(),
      !!(form.district.trim() || form.address_line.trim() || form.short_national_address.trim()),
    ];
    const done = checks.filter(Boolean).length;
    return Math.round((done / checks.length) * 100);
  }, [form]);

  // ───────────────────────── Save
  const mut = useMutation({
    mutationFn: async () => {
      if (!user) throw new Error('Not authenticated');
      if (form.username && !usernameOk) {
        throw new Error(t(isRTL, 'اسم المستخدم غير صالح أو محجوز', 'Username is invalid or taken'));
      }
      // Client-side Saudi format validation
      const nid = form.national_id.replace(/\D/g, '');
      if (nid && !/^[12]\d{9}$/.test(nid)) {
        throw new Error(t(isRTL,
          'رقم الهوية يجب أن يكون 10 أرقام ويبدأ بـ 1 (سعودي) أو 2 (مقيم)',
          'National ID must be 10 digits and start with 1 (Saudi) or 2 (Resident)'));
      }
      const vat = form.vat_number.replace(/\D/g, '');
      if (vat && (vat.length !== 15 || vat[0] !== '3' || vat[10] !== '3' || vat[14] !== '3')) {
        throw new Error(t(isRTL,
          'الرقم الضريبي يجب أن يكون 15 رقمًا ويبدأ بـ 3 وينتهي بـ 3 والرقم 11 = 3',
          'VAT must be 15 digits, start with 3, end with 3, and 11th digit = 3'));
      }
      const sna = form.short_national_address.trim().toUpperCase().replace(/\s+/g, '');
      if (sna && !/^[A-Z]{4}\d{4}$/.test(sna)) {
        throw new Error(t(isRTL,
          'العنوان الوطني المختصر يجب أن يكون 4 أحرف ثم 4 أرقام (مثل RRRD2402)',
          'Short national address must be 4 letters + 4 digits (e.g. RRRD2402)'));
      }
      const { error } = await updateProfile({
        userId: user.id,
        values: {
          full_name_ar: form.full_name_ar.trim() || null,
          full_name_en: form.full_name_en.trim() || null,
          username: form.username ? form.username : null,
          email: form.email.trim() || null,
          phone: form.phone.trim() || '',
          avatar_url: form.avatar_url || null,
          preferred_language: form.preferred_language,
          national_id: nid || null,
          national_id_type: nid ? (nid[0] === '1' ? 'saudi' : 'iqama') : null,
          vat_number: vat || null,
          short_national_address: sna || null,
          region_name: form.region_name.trim() || null,
          district: form.district.trim() || null,
          street: form.street.trim() || null,
          building_number: form.building_number.trim() || null,
          additional_number: form.additional_number.trim() || null,
          postal_code: form.postal_code.trim() || null,
          address_line: form.address_line.trim() || null,
        },
      });
      if (error) throw error;
      // Unified email: when the user changes the visible email and it
      // differs from the auth/login email, push the update to auth.users
      // as well so "profile email" and "login email" stay one and the
      // same. Skip for synthetic phone-signup accounts.
      const newEmail = form.email.trim();
      if (
        newEmail
        && !isSyntheticPhoneEmail(user.email)
        && newEmail.toLowerCase() !== (user.email ?? '').toLowerCase()
      ) {
        const { error: authErr } = await supabase.auth.updateUser({ email: newEmail });
        if (authErr) throw authErr;
      }
    },
    onMutate: () => setSaving(true),
    onSettled: () => setSaving(false),
    onSuccess: async () => {
      await refreshProfile();
      qc.invalidateQueries({ queryKey: ['profile'] });
      qc.invalidateQueries({ queryKey: ['profile-page-owner-business'] });
      toast.success(t(isRTL, 'تم حفظ الملف الشخصي', 'Profile saved'));
    },
    onError: (e) => {
      // Robust extraction — Supabase PostgrestError is a plain object
      // and `String(obj)` returns "[object Object]". Pull `.message` / `.details`
      // / `.hint` / `.code` before falling back to JSON.
      const extract = (err: unknown): string => {
        if (!err) return '';
        if (err instanceof Error) return err.message;
        if (typeof err === 'string') return err;
        if (typeof err === 'object') {
          const o = err as Record<string, unknown>;
          return (
            (typeof o.message === 'string' && o.message) ||
            (typeof o.error_description === 'string' && o.error_description) ||
            (typeof o.details === 'string' && o.details) ||
            (typeof o.hint === 'string' && o.hint) ||
            (typeof o.code === 'string' && o.code) ||
            ''
          ) as string;
        }
        return '';
      };
      const raw = extract(e) || t(isRTL, 'حدث خطأ أثناء الحفظ. حاول مرة أخرى.', 'An error occurred while saving. Please try again.');
      // Log full object for debugging
      // eslint-disable-next-line no-console
      console.error('[DashboardProfile] save failed:', e);
      const map: Record<string, { ar: string; en: string }> = {
        INVALID_NATIONAL_ID: {
          ar: 'رقم الهوية غير صحيح. يجب أن يكون 10 أرقام ويبدأ بـ 1 (سعودي) أو 2 (مقيم).',
          en: 'Invalid National ID. Must be 10 digits starting with 1 (Saudi) or 2 (Resident).',
        },
        INVALID_VAT_NUMBER: {
          ar: 'الرقم الضريبي غير صحيح. يجب أن يكون 15 رقمًا ويبدأ بـ 3 وينتهي بـ 3 والرقم 11 = 3.',
          en: 'Invalid VAT number. 15 digits, starts with 3, ends with 3, 11th digit = 3.',
        },
        INVALID_SHORT_NATIONAL_ADDRESS: {
          ar: 'العنوان الوطني المختصر غير صحيح. يجب أن يكون 4 أحرف ثم 4 أرقام.',
          en: 'Invalid short national address. Must be 4 letters + 4 digits.',
        },
      };
      const key = Object.keys(map).find((k) => raw.includes(k));
      if (key) {
        toast.error(isRTL ? map[key].ar : map[key].en);
        return;
      }
      // Postgres unique-constraint friendly mapping
      if (raw.includes('idx_profiles_username_unique') || raw.includes('username')) {
        toast.error(t(isRTL, 'اسم المستخدم محجوز لشخص آخر', 'Username is already taken'));
        return;
      }
      if (raw.includes('idx_profiles_email_unique')) {
        toast.error(t(isRTL, 'هذا البريد مستخدم في حساب آخر', 'This email is used by another account'));
        return;
      }
      if (raw.includes('idx_profiles_phone_unique')) {
        toast.error(t(isRTL, 'رقم الجوال مستخدم في حساب آخر', 'This phone is used by another account'));
        return;
      }
      if (raw.includes('idx_profiles_national_id_unique')) {
        toast.error(t(isRTL, 'رقم الهوية مستخدم في حساب آخر', 'National ID is used by another account'));
        return;
      }
      if (raw.includes('idx_profiles_vat_number_unique')) {
        toast.error(t(isRTL, 'الرقم الضريبي مستخدم في حساب آخر', 'VAT number is used by another account'));
        return;
      }
      toast.error(raw, { duration: 6000 });
    },
  });

  const publicUrl = form.username ? `${window.location.origin}/${form.username}` : null;
  const copyPublic = async () => {
    if (!publicUrl) return;
    await navigator.clipboard.writeText(publicUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  };

  // ───────────────────────── National Address SPL lookup
  const lookupShortAddress = async () => {
    const code = form.short_national_address.trim().toUpperCase().replace(/\s+/g, '');
    if (!/^[A-Z]{4}\d{4}$/.test(code)) {
      toast.error(t(isRTL,
        'أدخل رقم العنوان الوطني (4 أحرف + 4 أرقام)',
        'Enter a short national address (4 letters + 4 digits)'));
      return;
    }
    setSplLoading(true);
    try {
      const { data, error } = await nationalAddressLookup({ shortAddress: code });
      if (error) throw error;
      const res = data as {
        ok: boolean; message_ar?: string; message_en?: string;
        address?: {
          region_ar?: string | null; region_en?: string | null;
          city_ar?: string | null; city_en?: string | null;
          district_ar?: string | null; district_en?: string | null;
          street_ar?: string | null; street_en?: string | null;
          address_ar?: string | null; address_en?: string | null;
          building_number?: string | null; additional_number?: string | null;
          post_code?: string | null;
        };
      };
      if (!res?.ok || !res.address) {
        toast.error(isRTL ? (res?.message_ar ?? 'تعذّر العثور على العنوان') : (res?.message_en ?? 'Address not found'));
        return;
      }
      const a = res.address;
      setForm((f) => ({
        ...f,
        short_national_address: code,
        region_name: (isRTL ? a.region_ar : a.region_en) ?? a.region_ar ?? a.region_en ?? f.region_name,
        district: (isRTL ? a.district_ar : a.district_en) ?? a.district_ar ?? a.district_en ?? f.district,
        street: (isRTL ? a.street_ar : a.street_en) ?? a.street_ar ?? a.street_en ?? f.street,
        building_number: a.building_number ?? f.building_number,
        additional_number: a.additional_number ?? f.additional_number,
        postal_code: a.post_code ?? f.postal_code,
        address_line: (isRTL ? a.address_ar : a.address_en) ?? a.address_ar ?? a.address_en ?? f.address_line,
      }));
      toast.success(t(isRTL, 'تم تعبئة العنوان', 'Address filled in'));
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Error');
    } finally {
      setSplLoading(false);
    }
  };

  // ───────────────────────── Render
  return (
    <DashboardLayout>
      <div className="max-w-5xl mx-auto space-y-5 pb-24">
        {/* Hero header */}
        <Card className="relative overflow-hidden border-border/60">
          {/* Decorative banner */}
          <div
            className="h-24 sm:h-28 w-full"
            style={{
              background:
                'radial-gradient(120% 100% at 100% 0%, hsl(var(--primary) / 0.18) 0%, transparent 55%), linear-gradient(135deg, hsl(var(--primary) / 0.85), hsl(var(--primary) / 0.55))',
            }}
            aria-hidden
          />
          <CardContent className="p-4 sm:p-6 -mt-12 sm:-mt-14">
            <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4">
              <div className="flex items-end gap-4 min-w-0">
                {/* Avatar */}
                <div className="shrink-0">
                  <ImageUpload
                    bucket="business-assets"
                    folder={`avatars/${user?.id}`}
                    value={form.avatar_url || undefined}
                    onChange={(url) => setForm((f) => ({ ...f, avatar_url: url }))}
                    onRemove={() => setForm((f) => ({ ...f, avatar_url: '' }))}
                    aspectRatio="square"
                    className="w-20 h-20 sm:w-24 sm:h-24 rounded-2xl border-4 border-background shadow-md"
                    placeholder=""
                  />
                </div>
                <div className="min-w-0 pb-1">
                  <h1 className="text-xl sm:text-2xl font-bold leading-tight truncate">
                    {form.full_name || t(isRTL, 'حسابي', 'My account')}
                  </h1>
                  <div className="flex flex-wrap items-center gap-1.5 mt-1.5">
                    {displayRefId && (
                      <Badge variant="outline" className="tech-content text-[10px] h-5">
                        <Hash className="w-2.5 h-2.5 me-1" />{displayRefId}
                      </Badge>
                    )}
                    <Badge variant="outline" className="text-[10px] h-5">
                      {profile?.account_type === 'business'
                        ? <><Building2 className="w-2.5 h-2.5 me-1" />{t(isRTL, 'مزود خدمة', 'Provider')}</>
                        : <><User className="w-2.5 h-2.5 me-1" />{t(isRTL, 'فرد', 'Individual')}</>}
                    </Badge>
                    <Badge className="bg-primary/10 text-primary border-primary/20 text-[10px] h-5">
                      <Crown className="w-2.5 h-2.5 me-1" />{profile?.membership_tier ?? 'free'}
                    </Badge>
                    {profile?.phone_verified && (
                      <Badge className="bg-success/10 text-success border-success/30 text-[10px] h-5">
                        <ShieldCheck className="w-2.5 h-2.5 me-1" />{t(isRTL, 'موثق', 'Verified')}
                      </Badge>
                    )}
                  </div>
                </div>
              </div>
              <div className="flex items-center gap-2 self-start sm:self-auto">
                <Button
                  onClick={() => mut.mutate()}
                  disabled={!dirty || saving || (form.username !== '' && !usernameOk)}
                  className="gap-1.5"
                >
                  {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                  {t(isRTL, 'حفظ التغييرات', 'Save changes')}
                </Button>
              </div>
            </div>

            {/* Completion */}
            <div className="mt-5 grid sm:grid-cols-[1fr_auto] gap-3 items-center">
              <div className="space-y-1">
                <div className="flex items-center justify-between text-xs text-muted-foreground">
                  <span>{t(isRTL, 'اكتمال الملف الشخصي', 'Profile completion')}</span>
                  <span className="tech-content font-bold text-foreground">{completion}%</span>
                </div>
                <Progress value={completion} className="h-1.5" />
              </div>
              {publicUrl && (
                <div className="flex items-center gap-1">
                  <Link
                    to={`/${form.username}`}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex items-center gap-1.5 text-xs text-primary hover:underline px-2 py-1 rounded-md hover:bg-primary/5"
                  >
                    {t(isRTL, 'عرض الصفحة العامة', 'View public page')}
                    <ExternalLink className="w-3 h-3" />
                  </Link>
                  <Button variant="ghost" size="icon" className="h-7 w-7" onClick={copyPublic}
                    aria-label={t(isRTL, 'نسخ الرابط', 'Copy link')}>
                    {copied ? <Check className="w-3.5 h-3.5 text-success" /> : <Copy className="w-3.5 h-3.5" />}
                  </Button>
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Two-column layout */}
        <div className="grid gap-5 lg:grid-cols-3">
          {/* MAIN — Identity + Contact + Location */}
          <div className="lg:col-span-2 space-y-5">
            {/* Identity */}
            <Card>
              <CardContent className="p-4 sm:p-5 space-y-4">
                <header className="flex items-center gap-2">
                  <User className="w-4 h-4 text-primary" />
                  <h2 className="text-sm font-bold">{t(isRTL, 'البيانات الشخصية', 'Personal data')}</h2>
                </header>

                <div className="grid sm:grid-cols-2 gap-4">
                  <div>
                    <Label className="text-xs font-medium text-muted-foreground">
                      {t(isRTL, 'الاسم الكامل بالعربية', 'Full name (Arabic)')} <span className="text-destructive">*</span>
                    </Label>
                    <Input
                      value={form.full_name_ar}
                      onChange={(e) => setForm((f) => ({ ...f, full_name_ar: e.target.value, full_name: e.target.value }))}
                      dir="rtl"
                      lang="ar"
                      className="mt-1 h-11 rounded-xl"
                      placeholder="أحمد بن محمد"
                      maxLength={120}
                    />
                  </div>
                  <div>
                    <Label className="text-xs font-medium text-muted-foreground">
                      {t(isRTL, 'الاسم الكامل بالإنجليزية', 'Full name (English)')}
                    </Label>
                    <Input
                      value={form.full_name_en}
                      onChange={(e) => setForm((f) => ({ ...f, full_name_en: e.target.value }))}
                      dir="ltr"
                      lang="en"
                      className="mt-1 h-11 rounded-xl tech-content"
                      placeholder="Ahmad Mohammad"
                      maxLength={120}
                    />
                  </div>
                </div>

                <UsernamePicker
                  isRTL={isRTL}
                  label={t(isRTL, 'اسم المستخدم (اختياري)', 'Username (optional)')}
                  value={form.username}
                  onChange={(v) => setForm((f) => ({ ...f, username: v }))}
                  onValidChange={(s) => setUsernameOk(form.username === '' ? true : s.isValid && s.isAvailable)}
                  excludeUserId={user?.id ?? null}
                  placeholder={t(isRTL, 'مثال: ahmad-aluminum', 'e.g. ahmad-aluminum')}
                />
              </CardContent>
            </Card>

            {/* Contact */}
            <Card>
              <CardContent className="p-4 sm:p-5 space-y-4">
                <header className="flex items-center gap-2">
                  <AtSign className="w-4 h-4 text-primary" />
                  <h2 className="text-sm font-bold">{t(isRTL, 'وسائل التواصل', 'Contact')}</h2>
                </header>

                <div className="grid sm:grid-cols-2 gap-4">
                  <div>
                    <Label className="text-xs font-medium text-muted-foreground">
                      {t(isRTL, 'البريد الإلكتروني', 'Email address')}
                    </Label>
                    <div className="relative mt-1">
                      <Mail className="absolute top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground/60"
                        style={{ insetInlineStart: '12px' } as React.CSSProperties} aria-hidden />
                      <Input
                        type="email" dir="ltr" autoComplete="email"
                        value={form.email}
                        onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))}
                        className="h-11 rounded-xl tech-content"
                        style={{ paddingInlineStart: '38px' }}
                        placeholder="name@example.com"
                        maxLength={255}
                        disabled={isSyntheticPhoneEmail(user?.email)}
                      />
                    </div>
                    <p className="text-[10px] text-muted-foreground mt-1 flex items-start gap-1">
                      <AlertCircle className="w-3 h-3 mt-0.5 shrink-0" />
                      {isSyntheticPhoneEmail(user?.email)
                        ? t(isRTL,
                            'هذا البريد للعرض فقط. تسجيل الدخول يتم عبر رقم الجوال.',
                            'This email is for display only. You sign in with your phone number.')
                        : t(isRTL,
                            'بريد موحّد للملف الشخصي وتسجيل الدخول. أي تغيير يتطلب تأكيدًا عبر بريدك الحالي.',
                            'Unified email for profile and login. Any change requires confirmation via your current email.')}
                    </p>
                  </div>
                  <div>
                    <PhoneField
                      value={parsePhoneValue(form.phone)}
                      onChange={(v) => setForm((f) => ({ ...f, phone: toE164(v) }))}
                      label={t(isRTL, 'رقم الجوال', 'Phone number')}
                      optional
                    />
                    {profile?.phone_verified
                      ? (
                        <p className="text-[10px] text-success mt-1 flex items-center gap-1">
                          <ShieldCheck className="w-3 h-3" />
                          {t(isRTL, 'الرقم موثق', 'Phone is verified')}
                        </p>
                      )
                      : (
                        <p className="text-[10px] text-warning mt-1 flex items-center gap-1">
                          <AlertCircle className="w-3 h-3" />
                          {t(isRTL, 'الرقم غير موثق', 'Phone is not verified')}
                        </p>
                      )}
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Identity documents */}
            <Card>
              <CardContent className="p-4 sm:p-5 space-y-4">
                <header className="flex items-center gap-2">
                  <IdCard className="w-4 h-4 text-primary" />
                  <h2 className="text-sm font-bold">{t(isRTL, 'الوثائق الرسمية', 'Official documents')}</h2>
                </header>
                <div className="grid sm:grid-cols-2 gap-4">
                  <div>
                    <Label className="text-xs font-medium text-muted-foreground">
                      {t(isRTL, 'رقم الهوية / الإقامة', 'National ID / Iqama')}
                    </Label>
                    <Input
                      value={form.national_id}
                      onChange={(e) => setForm((f) => ({ ...f, national_id: e.target.value.replace(/\D/g, '').slice(0, 10) }))}
                      dir="ltr"
                      inputMode="numeric"
                      className="mt-1 h-11 rounded-xl tech-content"
                      placeholder="1xxxxxxxxx / 2xxxxxxxxx"
                      maxLength={10}
                    />
                    {form.national_id && (
                      <p className="text-[10px] mt-1 flex items-center gap-1">
                        {/^[12]\d{9}$/.test(form.national_id) ? (
                          <span className="text-success inline-flex items-center gap-1">
                            <ShieldCheck className="w-3 h-3" />
                            {form.national_id[0] === '1'
                              ? t(isRTL, 'هوية سعودية', 'Saudi National ID')
                              : t(isRTL, 'إقامة', 'Iqama')}
                          </span>
                        ) : (
                          <span className="text-warning inline-flex items-center gap-1">
                            <AlertCircle className="w-3 h-3" />
                            {t(isRTL, '10 أرقام تبدأ بـ 1 أو 2', '10 digits starting with 1 or 2')}
                          </span>
                        )}
                      </p>
                    )}
                  </div>
                  <div>
                    <Label className="text-xs font-medium text-muted-foreground inline-flex items-center gap-1">
                      <Receipt className="w-3 h-3" />
                      {t(isRTL, 'الرقم الضريبي (اختياري)', 'VAT number (optional)')}
                    </Label>
                    <Input
                      value={form.vat_number}
                      onChange={(e) => setForm((f) => ({ ...f, vat_number: e.target.value.replace(/\D/g, '').slice(0, 15) }))}
                      dir="ltr"
                      inputMode="numeric"
                      className="mt-1 h-11 rounded-xl tech-content"
                      placeholder="3xxxxxxxxx3xxxx"
                      maxLength={15}
                    />
                    {form.vat_number && form.vat_number.length === 15 && (
                      <p className="text-[10px] mt-1 text-muted-foreground">
                        {t(isRTL, 'سيتم التحقق عند الحفظ', 'Will be validated on save')}
                      </p>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* National Address (SPL) */}
            <Card>
              <CardContent className="p-4 sm:p-5 space-y-4">
                <header className="flex items-center gap-2">
                  <MapPinned className="w-4 h-4 text-primary" />
                  <h2 className="text-sm font-bold">{t(isRTL, 'العنوان الوطني', 'National address')}</h2>
                </header>

                <div>
                  <Label className="text-xs font-medium text-muted-foreground">
                    {t(isRTL, 'رقم العنوان الوطني المختصر', 'Short national address')}
                  </Label>
                  <div className="mt-1 flex gap-2">
                    <Input
                      value={form.short_national_address}
                      onChange={(e) =>
                        setForm((f) => ({
                          ...f,
                          short_national_address: e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 8),
                        }))
                      }
                      dir="ltr"
                      className="h-11 rounded-xl tech-content uppercase"
                      placeholder="RRRD2402"
                      maxLength={8}
                    />
                    <Button
                      type="button"
                      variant="outline"
                      onClick={lookupShortAddress}
                      disabled={splLoading || form.short_national_address.length !== 8}
                      className="h-11 rounded-xl gap-1.5 shrink-0"
                    >
                      {splLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Search className="w-4 h-4" />}
                      {t(isRTL, 'استدعاء', 'Lookup')}
                    </Button>
                  </div>
                  <p className="text-[10px] text-muted-foreground mt-1">
                    {t(isRTL,
                      '4 أحرف ثم 4 أرقام. سنقوم بتعبئة المنطقة والحي والشارع تلقائيًا.',
                      '4 letters + 4 digits. We will auto-fill region, district and street.')}
                  </p>
                </div>

                <div className="grid sm:grid-cols-2 gap-4">
                  <div>
                    <Label className="text-xs font-medium text-muted-foreground">{t(isRTL, 'المنطقة', 'Region')}</Label>
                    <Input
                      value={form.region_name}
                      onChange={(e) => setForm((f) => ({ ...f, region_name: e.target.value }))}
                      dir="auto"
                      className="mt-1 h-11 rounded-xl"
                      maxLength={120}
                    />
                  </div>
                  <div>
                    <Label className="text-xs font-medium text-muted-foreground">{t(isRTL, 'الحي', 'District')}</Label>
                    <Input
                      value={form.district}
                      onChange={(e) => setForm((f) => ({ ...f, district: e.target.value }))}
                      dir="auto"
                      className="mt-1 h-11 rounded-xl"
                      maxLength={120}
                    />
                  </div>
                  <div>
                    <Label className="text-xs font-medium text-muted-foreground">{t(isRTL, 'الشارع', 'Street')}</Label>
                    <Input
                      value={form.street}
                      onChange={(e) => setForm((f) => ({ ...f, street: e.target.value }))}
                      dir="auto"
                      className="mt-1 h-11 rounded-xl"
                      maxLength={160}
                    />
                  </div>
                  <div>
                    <Label className="text-xs font-medium text-muted-foreground">{t(isRTL, 'رقم المبنى', 'Building number')}</Label>
                    <Input
                      value={form.building_number}
                      onChange={(e) => setForm((f) => ({ ...f, building_number: e.target.value.replace(/\D/g, '').slice(0, 6) }))}
                      dir="ltr"
                      inputMode="numeric"
                      className="mt-1 h-11 rounded-xl tech-content"
                      maxLength={6}
                    />
                  </div>
                  <div>
                    <Label className="text-xs font-medium text-muted-foreground">{t(isRTL, 'الرقم الإضافي', 'Additional number')}</Label>
                    <Input
                      value={form.additional_number}
                      onChange={(e) => setForm((f) => ({ ...f, additional_number: e.target.value.replace(/\D/g, '').slice(0, 4) }))}
                      dir="ltr"
                      inputMode="numeric"
                      className="mt-1 h-11 rounded-xl tech-content"
                      maxLength={4}
                    />
                  </div>
                  <div>
                    <Label className="text-xs font-medium text-muted-foreground">{t(isRTL, 'الرمز البريدي', 'Postal code')}</Label>
                    <Input
                      value={form.postal_code}
                      onChange={(e) => setForm((f) => ({ ...f, postal_code: e.target.value.replace(/\D/g, '').slice(0, 5) }))}
                      dir="ltr"
                      inputMode="numeric"
                      className="mt-1 h-11 rounded-xl tech-content"
                      maxLength={5}
                    />
                  </div>
                </div>

                <div>
                  <Label className="text-xs font-medium text-muted-foreground">
                    {t(isRTL, 'العنوان التفصيلي', 'Detailed address line')}
                  </Label>
                  <Input
                    value={form.address_line}
                    onChange={(e) => setForm((f) => ({ ...f, address_line: e.target.value }))}
                    dir="auto"
                    className="mt-1 h-11 rounded-xl"
                    placeholder={t(isRTL, 'مثال: حي الياسمين، شارع الأمير سلطان', 'e.g. Al Yasmin, Prince Sultan St.')}
                    maxLength={250}
                  />
                </div>
              </CardContent>
            </Card>

            {/* Preferences — country/city removed (already captured by the
                National Address card above). Only the UI language remains. */}
            <Card>
              <CardContent className="p-4 sm:p-5 space-y-4">
                <header className="flex items-center gap-2">
                  <Languages className="w-4 h-4 text-primary" />
                  <h2 className="text-sm font-bold">{t(isRTL, 'التفضيلات', 'Preferences')}</h2>
                </header>
                <div className="grid sm:grid-cols-2 gap-4">
                  <div>
                    <Label className="text-xs font-medium text-muted-foreground">
                      {t(isRTL, 'اللغة المفضلة', 'Preferred language')}
                    </Label>
                    <Select
                      value={form.preferred_language}
                      onValueChange={(v) => setForm((f) => ({ ...f, preferred_language: v as 'ar' | 'en' }))}
                    >
                      <SelectTrigger className="mt-1 h-11 rounded-xl"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="ar">العربية</SelectItem>
                        <SelectItem value="en">English</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* SIDE — quick info + jump-offs */}
          <div className="space-y-5">
            <Card>
              <CardContent className="p-4 sm:p-5 space-y-3">
                <header className="flex items-center gap-2">
                  <Hash className="w-4 h-4 text-primary" />
                  <h2 className="text-sm font-bold">{t(isRTL, 'معلومات الحساب', 'Account information')}</h2>
                </header>
                <Row
                  icon={<Hash className="w-3.5 h-3.5" />}
                  label={t(isRTL, 'المعرّف', 'Reference ID')}
                  value={<span className="tech-content">{displayRefId ?? profile?.ref_id ?? '—'}</span>}
                />
                <Row
                  icon={isSyntheticPhoneEmail(user?.email) ? <Phone className="w-3.5 h-3.5" /> : <Mail className="w-3.5 h-3.5" />}
                  label={isSyntheticPhoneEmail(user?.email) ? t(isRTL, 'رقم الدخول', 'Login phone') : t(isRTL, 'البريد الإلكتروني', 'Email')}
                  value={
                    <span className="tech-content truncate max-w-[180px] inline-block align-middle">
                      {isSyntheticPhoneEmail(user?.email)
                        ? (user?.phone ? `+${user.phone}` : (profile?.phone || '—'))
                        : (user?.email ?? '—')}
                    </span>
                  }
                />
                <Row
                  icon={<Globe className="w-3.5 h-3.5" />}
                  label={t(isRTL, 'اللغة', 'Language')}
                  value={form.preferred_language === 'ar' ? 'العربية' : 'English'}
                />
              </CardContent>
            </Card>

            {/* Quick jump-offs */}
            <Card>
              <CardContent className="p-4 sm:p-5 space-y-2">
                <header className="flex items-center gap-2 mb-1">
                  <SettingsIcon className="w-4 h-4 text-primary" />
                  <h2 className="text-sm font-bold">{t(isRTL, 'روابط سريعة', 'Quick links')}</h2>
                </header>
                <JumpLink to="/dashboard/settings?tab=security"
                  label={t(isRTL, 'الأمان وكلمة المرور', 'Security & password')} />
                <JumpLink to="/dashboard/settings?tab=notifications"
                  label={t(isRTL, 'تفضيلات الإشعارات', 'Notification preferences')} />
                <JumpLink to="/dashboard/communication-preferences"
                  label={t(isRTL, 'تفضيلات التواصل', 'Communication preferences')} />
                <JumpLink to="/membership"
                  label={t(isRTL, 'العضوية والاشتراك', 'Membership & subscription')} />
                {business && (
                  <JumpLink to="/dashboard/business-edit"
                    label={t(isRTL, 'تعديل بيانات المنشأة', 'Edit business profile')} />
                )}
              </CardContent>
            </Card>
          </div>
        </div>

        {/* Footer back link */}
        <div className="flex items-center gap-1.5 text-xs text-muted-foreground pt-2">
          <button onClick={() => navigate('/dashboard')} className="hover:text-foreground inline-flex items-center gap-1">
            <ArrowLeft className={cn('w-3.5 h-3.5', isRTL && 'rotate-180')} />
            {t(isRTL, 'العودة إلى لوحة التحكم', 'Back to dashboard')}
          </button>
        </div>
      </div>
    </DashboardLayout>
  );
};

// ───────────────────────── tiny presentational helpers
const Row: React.FC<{ icon: React.ReactNode; label: string; value: React.ReactNode }> = ({ icon, label, value }) => (
  <div className="flex items-center justify-between gap-3 p-2 rounded-lg bg-muted/30">
    <span className="inline-flex items-center gap-2 text-xs text-muted-foreground">{icon}{label}</span>
    <span className="text-xs font-medium text-foreground">{value}</span>
  </div>
);

const JumpLink: React.FC<{ to: string; label: string }> = ({ to, label }) => (
  <Link
    to={to}
    className="flex items-center justify-between gap-3 px-3 py-2 rounded-lg border border-border/60 hover:border-primary/40 hover:bg-primary/5 transition-colors text-xs"
  >
    <span className="font-medium text-foreground">{label}</span>
    <ExternalLink className="w-3.5 h-3.5 text-muted-foreground" />
  </Link>
);

export default DashboardProfile;