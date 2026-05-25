import React, { useState, useMemo, useCallback, useEffect } from 'react';
import { DashboardLayout } from '@/components/dashboard/DashboardLayout';
import { useLanguage } from '@/i18n/LanguageContext';
import { useAuth } from '@/contexts/AuthContext';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ImageUpload } from '@/components/ui/image-upload';
import { getOwnerBusiness } from '@/modules/businesses';
import { getCurrentSession, signOutCurrentUser, updateUserPassword } from '@/modules/identity';
import { updateProfile } from '@/modules/users';
import { toast } from 'sonner';
import {
  User, Lock, Bell, Palette, Sun, Moon, Monitor, Check, CreditCard,
  Settings2, Shield, Eye, EyeOff, Mail, Phone, Globe, Camera,
  Smartphone, Volume2, VolumeX, BellRing, BellOff, Hash,
  Fingerprint, KeyRound, AlertTriangle, CheckCircle, Info,
  LogOut, Trash2, Download, Upload, AtSign, MapPin, Languages, Copy,
  Sparkles, ExternalLink, Loader2, Crown,
} from 'lucide-react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { BnplProvidersManager } from '@/components/bnpl/BnplProvidersManager';
import { useThemeMode } from '@/components/ThemeToggle';
import { accentPresets, getStoredAccent, applyAccent } from '@/lib/accent-colors';
import { checkPasswordStrength } from '@/lib/password-strength';
import { isSyntheticPhoneEmail, getDisplayEmail } from '@/lib/auth-email';
import { useBrowserNotifications } from '@/hooks/useBrowserNotifications';
import { cn } from '@/lib/utils';
import { formatDistanceToNow } from 'date-fns';
import { ar as arLocale, enUS } from 'date-fns/locale';
import { useSearchParams } from 'react-router-dom';
import { useNoIndex } from "@/hooks/useNoIndex";
import { useDisplayRefId } from '@/hooks/useDisplayRefId';
import { UsernamePicker } from '@/components/common/UsernamePicker';
import { supabase } from '@/integrations/supabase/client';

type RefRow = { id: string; name_ar: string; name_en: string };
type CityRow = RefRow & { country_id: string };

type SettingsTab = 'appearance' | 'account' | 'security' | 'notifications' | 'bnpl';

const DashboardSettings = () => {
  useNoIndex();
  const { isRTL, language } = useLanguage();
  const { user, profile, refreshProfile } = useAuth();
  const displayRefId = useDisplayRefId();
  const { theme, setTheme } = useThemeMode();
  const queryClient = useQueryClient();
  const { isSupported: notifSupported, requestPermission, permission } = useBrowserNotifications();
  const [searchParams, setSearchParams] = useSearchParams();

  const validTabs: SettingsTab[] = ['appearance', 'account', 'security', 'notifications', 'bnpl'];
  const tabFromUrl = searchParams.get('tab') as SettingsTab | null;
  const [activeTab, setActiveTabState] = useState<SettingsTab>(
    tabFromUrl && validTabs.includes(tabFromUrl) ? tabFromUrl : 'appearance'
  );

  const setActiveTab = useCallback((tab: SettingsTab) => {
    setActiveTabState(tab);
    setSearchParams({ tab }, { replace: true });
  }, [setSearchParams]);

  const [accent, setAccentState] = useState(getStoredAccent);
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);

  // Profile edit state
  const [editingProfile, setEditingProfile] = useState(false);
  const [profileForm, setProfileForm] = useState({
    full_name: '',
    username: '',
    phone: '',
    email: '',
    avatar_url: '',
    preferred_language: 'ar' as 'ar' | 'en',
    country_id: null as string | null,
    city_id: null as string | null,
  });
  const [usernameOk, setUsernameOk] = useState(true);
  const [copiedUrl, setCopiedUrl] = useState(false);

  // Sync profile form with latest profile data
  useEffect(() => {
    if (profile && !editingProfile) {
      setProfileForm({
        full_name: profile.full_name || '',
        username: profile.username || '',
        phone: profile.phone || '',
        email: profile.email || '',
        avatar_url: profile.avatar_url || '',
        preferred_language: ((profile.preferred_language as 'ar' | 'en') ?? 'ar'),
        country_id: profile.country_id ?? null,
        city_id: profile.city_id ?? null,
      });
      setUsernameOk(true);
    }
  }, [profile, editingProfile]);

  const { data: business } = useQuery({
    queryKey: ['my-business-for-settings'],
    queryFn: async () => {
      if (!user) return null;
      const { data } = await getOwnerBusiness<{ id: string; name_ar: string; name_en: string }>({
        userId: user.id,
        select: 'id, name_ar, name_en',
      });
      return data;
    },
    enabled: !!user,
  });

  // Reference data — countries & cities (filtered by selected country)
  const { data: countries = [] } = useQuery({
    queryKey: ['settings-ref-countries'],
    queryFn: async () => {
      const { data } = await supabase.from('countries').select('id, name_ar, name_en').order('name_en');
      return (data ?? []) as RefRow[];
    },
    staleTime: 5 * 60_000,
  });
  const { data: cities = [] } = useQuery({
    queryKey: ['settings-ref-cities', profileForm.country_id],
    queryFn: async () => {
      if (!profileForm.country_id) return [] as CityRow[];
      const { data } = await supabase.from('cities')
        .select('id, name_ar, name_en, country_id')
        .eq('country_id', profileForm.country_id)
        .order('name_en');
      return (data ?? []) as CityRow[];
    },
    enabled: !!profileForm.country_id,
    staleTime: 5 * 60_000,
  });

  // Sessions info
  const { data: sessions } = useQuery({
    queryKey: ['user-sessions', user?.id],
    queryFn: async () => {
      // Return basic session info from current auth
      const { data } = await getCurrentSession();
      return data.session ? [{
        created_at: data.session.expires_at ? new Date((data.session.expires_at - 3600) * 1000).toISOString() : new Date().toISOString(),
        expires_at: data.session.expires_at ? new Date(data.session.expires_at * 1000).toISOString() : null,
        current: true,
      }] : [];
    },
    enabled: !!user,
  });

  const passwordStrength = useMemo(() => newPassword ? checkPasswordStrength(newPassword) : null, [newPassword]);
  const passwordsMatch = confirmPassword && newPassword === confirmPassword;

  const handleAccent = useCallback((key: string) => {
    setAccentState(key);
    applyAccent(key);
    toast.success(isRTL ? 'تم تغيير اللون' : 'Accent updated');
  }, [isRTL]);

  const handleUpdatePassword = async () => {
    if (newPassword.length < 8) { toast.error(isRTL ? 'كلمة المرور قصيرة (8 أحرف على الأقل)' : 'Password too short (min 8 chars)'); return; }
    if (newPassword !== confirmPassword) { toast.error(isRTL ? 'كلمتا المرور غير متطابقتين' : 'Passwords do not match'); return; }
    setLoading(true);
    try {
      const { error } = await updateUserPassword(newPassword);
      if (error) throw error;
      toast.success(isRTL ? 'تم تحديث كلمة المرور بنجاح' : 'Password updated successfully');
      setNewPassword(''); setConfirmPassword('');
    } catch (err: unknown) { toast.error(err instanceof Error ? err.message : 'Error'); }
    finally { setLoading(false); }
  };

  const updateProfileMutation = useMutation({
    mutationFn: async () => {
      if (!user) throw new Error('Not authenticated');
      if (profileForm.username && !usernameOk) {
        throw new Error(isRTL ? 'اسم المستخدم غير صالح أو محجوز' : 'Username is invalid or taken');
      }
      const { error } = await updateProfile({
        userId: user.id,
        values: {
          full_name: profileForm.full_name.trim(),
          username: profileForm.username ? profileForm.username : null,
          phone: profileForm.phone.trim(),
          email: profileForm.email.trim(),
          avatar_url: profileForm.avatar_url,
          preferred_language: profileForm.preferred_language,
          country_id: profileForm.country_id,
          city_id: profileForm.city_id,
        },
      });
      if (error) throw error;
    },
    onSuccess: async () => {
      await refreshProfile();
      queryClient.invalidateQueries({ queryKey: ['profile'] });
      setEditingProfile(false);
      toast.success(isRTL ? 'تم تحديث الملف الشخصي بنجاح' : 'Profile updated successfully');
    },
    onError: (e) => toast.error(e.message),
  });

  // Profile completeness (7 checks)
  const completion = useMemo(() => {
    const src = editingProfile ? profileForm : {
      full_name: profile?.full_name || '',
      username: profile?.username || '',
      phone: profile?.phone || '',
      email: profile?.email || '',
      avatar_url: profile?.avatar_url || '',
      country_id: profile?.country_id ?? null,
      city_id: profile?.city_id ?? null,
    };
    const checks = [
      !!src.full_name?.trim(),
      !!src.username,
      !!src.avatar_url,
      !!src.email?.trim(),
      !!src.phone?.trim(),
      !!src.country_id,
      !!src.city_id,
    ];
    const done = checks.filter(Boolean).length;
    return { done, total: checks.length, pct: Math.round((done / checks.length) * 100) };
  }, [editingProfile, profileForm, profile]);

  const publicProfileUrl = useMemo(() => {
    const handle = profileForm.username || profile?.username;
    return handle ? `${window.location.origin}/${handle}` : null;
  }, [profileForm.username, profile?.username]);

  const copyPublicUrl = useCallback(async () => {
    if (!publicProfileUrl) return;
    await navigator.clipboard.writeText(publicProfileUrl);
    setCopiedUrl(true);
    toast.success(isRTL ? 'تم نسخ الرابط' : 'Link copied');
    setTimeout(() => setCopiedUrl(false), 1500);
  }, [publicProfileUrl, isRTL]);

  const handleSignOut = async () => {
    await signOutCurrentUser();
    window.location.href = '/';
  };

  const strengthLabels: Record<string, { ar: string; en: string }> = {
    weak: { ar: 'ضعيفة', en: 'Weak' },
    medium: { ar: 'متوسطة', en: 'Medium' },
    strong: { ar: 'قوية', en: 'Strong' },
    very_strong: { ar: 'قوية جداً', en: 'Very Strong' },
  };

  const themeModes = [
    { value: 'light' as const, icon: Sun, ar: 'فاتح', en: 'Light' },
    { value: 'dark' as const, icon: Moon, ar: 'داكن', en: 'Dark' },
    { value: 'system' as const, icon: Monitor, ar: 'تلقائي', en: 'System' },
  ];

  const tabs: { key: SettingsTab; icon: React.ElementType; ar: string; en: string; show?: boolean }[] = [
    { key: 'appearance', icon: Palette, ar: 'المظهر', en: 'Appearance' },
    { key: 'account', icon: User, ar: 'الحساب', en: 'Account' },
    { key: 'security', icon: Shield, ar: 'الأمان', en: 'Security' },
    { key: 'notifications', icon: Bell, ar: 'الإشعارات', en: 'Notifications' },
    { key: 'bnpl', icon: CreditCard, ar: 'التقسيط', en: 'BNPL', show: !!business },
  ];

  const visibleTabs = tabs.filter(t => t.show !== false);

  return (
    <DashboardLayout>
      <div className="space-y-4 max-w-4xl">
        {/* Header */}
        <div>
          <h1 className="font-heading font-bold text-xl sm:text-2xl flex items-center gap-2">
            <Settings2 className="w-5 h-5 sm:w-6 sm:h-6 text-accent" />
            {isRTL ? 'الإعدادات' : 'Settings'}
          </h1>
          <p className="text-[10px] sm:text-xs text-muted-foreground mt-0.5">
            {isRTL ? 'إدارة حسابك ومظهرك وأمانك' : 'Manage your account, appearance, and security'}
          </p>
        </div>

        {/* Tab Navigation */}
        <div className="overflow-x-auto no-scrollbar -mx-3 px-3 sm:mx-0 sm:px-0">
          <div className="flex gap-1 bg-muted/30 rounded-xl p-0.5 w-fit min-w-full sm:min-w-0">
            {visibleTabs.map(t => (
              <button
                key={t.key}
                onClick={() => setActiveTab(t.key)}
                className={cn(
                  'flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all whitespace-nowrap',
                  activeTab === t.key
                    ? 'bg-accent text-accent-foreground shadow-sm'
                    : 'text-muted-foreground hover:text-foreground hover:bg-muted/50'
                )}
              >
                <t.icon className="w-3.5 h-3.5" />
                {isRTL ? t.ar : t.en}
              </button>
            ))}
          </div>
        </div>

        {/* ═══ APPEARANCE ═══ */}
        {activeTab === 'appearance' && (
          <div className="space-y-3">
            {/* Theme Mode */}
            <Card className="border-border/40">
              <CardContent className="p-3 sm:p-4">
                <div className="flex items-center gap-2 mb-3">
                  <Sun className="w-4 h-4 text-accent" />
                  <h3 className="font-heading font-bold text-sm">{isRTL ? 'وضع العرض' : 'Display Mode'}</h3>
                </div>
                <div className="grid grid-cols-3 gap-2">
                  {themeModes.map(m => (
                    <button key={m.value} onClick={() => setTheme(m.value)}
                      className={cn(
                        'flex flex-col items-center gap-1.5 p-3 rounded-xl border-2 transition-all active:scale-[0.97]',
                        theme === m.value ? 'border-accent bg-accent/10 shadow-sm' : 'border-border/40 hover:border-accent/30'
                      )}>
                      <div className={cn('w-9 h-9 rounded-xl flex items-center justify-center',
                        theme === m.value ? 'bg-accent text-accent-foreground' : 'bg-muted text-muted-foreground')}>
                        <m.icon className="w-4 h-4" />
                      </div>
                      <span className="text-[10px] font-medium">{isRTL ? m.ar : m.en}</span>
                      {theme === m.value && <Check className="w-3 h-3 text-accent" />}
                    </button>
                  ))}
                </div>
              </CardContent>
            </Card>

            {/* Accent Color */}
            <Card className="border-border/40">
              <CardContent className="p-3 sm:p-4">
                <div className="flex items-center gap-2 mb-3">
                  <Palette className="w-4 h-4 text-accent" />
                  <h3 className="font-heading font-bold text-sm">{isRTL ? 'اللون الرئيسي' : 'Accent Color'}</h3>
                </div>
                <div className="grid grid-cols-3 sm:grid-cols-6 gap-2">
                  {accentPresets.map(p => (
                    <button key={p.key} onClick={() => handleAccent(p.key)}
                      className={cn(
                        'flex flex-col items-center gap-1 p-2 rounded-xl border-2 transition-all active:scale-[0.95]',
                        accent === p.key ? 'border-foreground/20 bg-muted/30 shadow-sm' : 'border-border/30 hover:border-foreground/10'
                      )}>
                      <div className={cn('w-8 h-8 rounded-full ring-2 ring-offset-2 ring-offset-background transition-all',
                        accent === p.key ? 'ring-foreground/20 scale-110' : 'ring-transparent')}
                        style={{ backgroundColor: `hsl(${p.hsl})` }}>
                        {accent === p.key && <div className="w-full h-full flex items-center justify-center"><Check className="w-3.5 h-3.5 text-white drop-shadow" /></div>}
                      </div>
                      <span className="text-[9px] font-medium">{isRTL ? p.label.ar : p.label.en}</span>
                    </button>
                  ))}
                </div>
              </CardContent>
            </Card>

            {/* Preview */}
            <Card className="border-border/40">
              <CardContent className="p-3 sm:p-4">
                <div className="flex items-center gap-2 mb-3">
                  <Eye className="w-4 h-4 text-accent" />
                  <h3 className="font-heading font-bold text-sm">{isRTL ? 'معاينة' : 'Preview'}</h3>
                </div>
                <div className="flex flex-wrap gap-2 mb-3">
                  <Button variant="hero" size="sm" className="text-xs">{isRTL ? 'زر رئيسي' : 'Primary'}</Button>
                  <Button variant="outline" size="sm" className="text-xs">{isRTL ? 'ثانوي' : 'Outline'}</Button>
                  <Button variant="ghost" size="sm" className="text-xs">{isRTL ? 'شفاف' : 'Ghost'}</Button>
                </div>
                <div className="flex gap-2 mb-2">
                  {['bg-accent', 'bg-primary', 'bg-muted', 'bg-card border border-border'].map((c, i) => (
                    <div key={i} className={`w-8 h-8 rounded-lg ${c}`} />
                  ))}
                </div>
                <p className="text-[10px] text-muted-foreground">{isRTL ? 'نص تجريبي لمعاينة الخط والألوان.' : 'Preview text for fonts and colors.'}</p>
              </CardContent>
            </Card>
          </div>
        )}

        {/* ═══ ACCOUNT ═══ */}
        {activeTab === 'account' && (
          <div className="space-y-4">
            {/* ── Hero profile header ───────────────────────────── */}
            <Card className="relative overflow-hidden border-border/60">
              <div
                className="h-20 sm:h-24 w-full"
                style={{
                  background:
                    'radial-gradient(120% 100% at 100% 0%, hsl(var(--primary) / 0.18) 0%, transparent 55%), linear-gradient(135deg, hsl(var(--primary) / 0.85), hsl(var(--accent) / 0.55))',
                }}
              />
              <CardContent className="p-3 sm:p-4 -mt-10 sm:-mt-12">
                <div className="flex items-start gap-3 sm:gap-4">
                  {/* Avatar */}
                  <div className="shrink-0">
                    {editingProfile ? (
                      <ImageUpload
                        bucket="business-assets"
                        value={profileForm.avatar_url}
                        onChange={url => setProfileForm(p => ({ ...p, avatar_url: url }))}
                        onRemove={() => setProfileForm(p => ({ ...p, avatar_url: '' }))}
                        folder="avatars"
                        aspectRatio="square"
                        className="w-20 h-20 sm:w-24 sm:h-24 rounded-2xl ring-4 ring-background shadow-lg"
                        placeholder=""
                      />
                    ) : (
                      <div className="w-20 h-20 sm:w-24 sm:h-24 rounded-2xl bg-accent/10 flex items-center justify-center overflow-hidden ring-4 ring-background shadow-lg">
                        {profile?.avatar_url ? (
                          <img src={profile.avatar_url} alt={profile?.full_name || (isRTL ? 'صورة الملف الشخصي' : 'Profile photo')} className="w-full h-full object-cover" />
                        ) : (
                          <User className="w-8 h-8 text-accent" />
                        )}
                      </div>
                    )}
                  </div>

                  <div className="flex-1 min-w-0 pt-10 sm:pt-12">
                    <div className="flex items-start justify-between gap-2 flex-wrap">
                      <div className="min-w-0">
                        <h2 className="font-heading font-bold text-base sm:text-lg truncate">
                          {profile?.full_name || (isRTL ? 'بدون اسم' : 'No name')}
                        </h2>
                        {profile?.username && (
                          <p className="text-[11px] text-muted-foreground tech-content flex items-center gap-1">
                            <AtSign className="w-3 h-3" />{profile.username}
                          </p>
                        )}
                      </div>
                      <Button
                        variant={editingProfile ? 'default' : 'outline'}
                        size="sm"
                        className="text-xs gap-1 h-8"
                        onClick={() => editingProfile ? updateProfileMutation.mutate() : setEditingProfile(true)}
                        disabled={updateProfileMutation.isPending}
                      >
                        {updateProfileMutation.isPending
                          ? <Loader2 className="w-3 h-3 animate-spin" />
                          : editingProfile
                            ? <><Check className="w-3 h-3" />{isRTL ? 'حفظ التعديلات' : 'Save changes'}</>
                            : <><Camera className="w-3 h-3" />{isRTL ? 'تعديل الملف' : 'Edit profile'}</>}
                      </Button>
                    </div>

                    {/* Badges row */}
                    <div className="flex items-center gap-1.5 flex-wrap mt-2">
                      <Badge variant="outline" className="text-[9px] px-1.5 py-0 h-[16px] tech-content">
                        <Hash className="w-2.5 h-2.5 me-0.5" />{displayRefId || profile?.ref_id}
                      </Badge>
                      <Badge variant="outline" className="text-[9px] px-1.5 py-0 h-[16px]">
                        {profile?.account_type === 'provider' ? (isRTL ? 'مزود خدمة' : 'Provider') : (isRTL ? 'عميل' : 'Client')}
                      </Badge>
                      <Badge className="bg-accent/10 text-accent text-[9px] px-1.5 py-0 h-[16px] gap-0.5">
                        <Crown className="w-2.5 h-2.5" />{profile?.membership_tier || 'free'}
                      </Badge>
                      {profile?.phone_verified && (
                        <Badge className="bg-success/10 text-success text-[9px] px-1.5 py-0 h-[16px] gap-0.5">
                          <CheckCircle className="w-2.5 h-2.5" />{isRTL ? 'موثق' : 'Verified'}
                        </Badge>
                      )}
                    </div>
                  </div>
                </div>

                {/* Completeness + Public URL */}
                <div className="grid sm:grid-cols-2 gap-2 mt-4">
                  <div className="p-2.5 rounded-xl bg-muted/30 border border-border/40">
                    <div className="flex items-center justify-between mb-1.5">
                      <span className="text-[10px] font-medium flex items-center gap-1">
                        <Sparkles className="w-3 h-3 text-accent" />
                        {isRTL ? 'اكتمال الملف' : 'Profile completeness'}
                      </span>
                      <span className="text-[10px] font-bold tech-content">{completion.pct}%</span>
                    </div>
                    <Progress value={completion.pct} className="h-1.5" />
                    <p className="text-[9px] text-muted-foreground mt-1">
                      {completion.done}/{completion.total} {isRTL ? 'حقول مكتملة' : 'fields complete'}
                    </p>
                  </div>
                  <div className="p-2.5 rounded-xl bg-muted/30 border border-border/40">
                    <span className="text-[10px] font-medium flex items-center gap-1 mb-1.5">
                      <Globe className="w-3 h-3 text-accent" />
                      {isRTL ? 'رابط الملف العام' : 'Public profile link'}
                    </span>
                    {publicProfileUrl ? (
                      <div className="flex items-center gap-1">
                        <code className="flex-1 min-w-0 text-[10px] tech-content truncate bg-background/60 px-1.5 py-1 rounded border border-border/40" dir="ltr">
                          {publicProfileUrl.replace(/^https?:\/\//, '')}
                        </code>
                        <Button size="icon" variant="ghost" className="h-6 w-6 shrink-0" onClick={copyPublicUrl}>
                          {copiedUrl ? <Check className="w-3 h-3 text-success" /> : <Copy className="w-3 h-3" />}
                        </Button>
                        <Button size="icon" variant="ghost" className="h-6 w-6 shrink-0" asChild>
                          <a href={publicProfileUrl} target="_blank" rel="noreferrer"><ExternalLink className="w-3 h-3" /></a>
                        </Button>
                      </div>
                    ) : (
                      <p className="text-[10px] text-muted-foreground">
                        {isRTL ? 'أضف اسم مستخدم لإنشاء رابط عام' : 'Add a username to get a public link'}
                      </p>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* ── Editable fields ──────────────────────────────── */}
            {editingProfile ? (
              <Card className="border-accent/40 ring-1 ring-accent/20">
                <CardContent className="p-3 sm:p-4 space-y-4">
                  <div className="flex items-center gap-2">
                    <User className="w-4 h-4 text-accent" />
                    <h3 className="font-heading font-bold text-sm">{isRTL ? 'البيانات الشخصية' : 'Personal information'}</h3>
                  </div>

                  <div className="grid sm:grid-cols-2 gap-3">
                    <div>
                      <Label className="text-[10px]">{isRTL ? 'الاسم الكامل' : 'Full name'}</Label>
                      <Input value={profileForm.full_name}
                        onChange={e => setProfileForm(p => ({ ...p, full_name: e.target.value }))}
                        className="h-9 text-sm mt-1" />
                    </div>
                    <div>
                      <Label className="text-[10px]">{isRTL ? 'البريد الإلكتروني للملف' : 'Profile email'}</Label>
                      <Input value={profileForm.email}
                        onChange={e => setProfileForm(p => ({ ...p, email: e.target.value }))}
                        className="h-9 text-sm mt-1 tech-content" dir="ltr" type="email" />
                      <p className="text-[9px] text-muted-foreground mt-0.5">
                        {isSyntheticPhoneEmail(user?.email)
                          ? (isRTL ? 'تسجيل الدخول عبر الجوال.' : 'You sign in with your phone.')
                          : (<>{isRTL ? 'دخول: ' : 'Login: '}<span className="tech-content font-medium">{user?.email}</span></>)}
                      </p>
                    </div>
                    <div>
                      <Label className="text-[10px]">{isRTL ? 'رقم الجوال' : 'Phone'}</Label>
                      <Input value={profileForm.phone}
                        onChange={e => setProfileForm(p => ({ ...p, phone: e.target.value }))}
                        className="h-9 text-sm mt-1 tech-content" dir="ltr" />
                    </div>
                    <div>
                      <Label className="text-[10px] flex items-center gap-1">
                        <Languages className="w-3 h-3" />
                        {isRTL ? 'لغة المراسلات' : 'Preferred language'}
                      </Label>
                      <Select value={profileForm.preferred_language}
                        onValueChange={(v: 'ar' | 'en') => setProfileForm(p => ({ ...p, preferred_language: v }))}>
                        <SelectTrigger className="h-9 text-sm mt-1"><SelectValue /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="ar">العربية</SelectItem>
                          <SelectItem value="en">English</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>

                  {/* Username picker */}
                  <div className="pt-2 border-t border-border/40">
                    <UsernamePicker
                      value={profileForm.username}
                      onChange={(v) => setProfileForm(p => ({ ...p, username: v }))}
                      onValidChange={({ isValid, isAvailable }) => setUsernameOk(isValid && isAvailable)}
                      excludeUserId={user?.id}
                      isRTL={isRTL}
                      label={isRTL ? 'اسم المستخدم (Handle)' : 'Username (handle)'}
                    />
                  </div>

                  {/* Location */}
                  <div className="pt-2 border-t border-border/40">
                    <div className="flex items-center gap-2 mb-2">
                      <MapPin className="w-3.5 h-3.5 text-accent" />
                      <p className="text-xs font-medium">{isRTL ? 'الموقع' : 'Location'}</p>
                    </div>
                    <div className="grid sm:grid-cols-2 gap-3">
                      <div>
                        <Label className="text-[10px]">{isRTL ? 'الدولة' : 'Country'}</Label>
                        <Select value={profileForm.country_id ?? ''}
                          onValueChange={(v) => setProfileForm(p => ({ ...p, country_id: v || null, city_id: null }))}>
                          <SelectTrigger className="h-9 text-sm mt-1">
                            <SelectValue placeholder={isRTL ? 'اختر دولة' : 'Select country'} />
                          </SelectTrigger>
                          <SelectContent>
                            {countries.map(c => (
                              <SelectItem key={c.id} value={c.id}>{isRTL ? c.name_ar : c.name_en}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                      <div>
                        <Label className="text-[10px]">{isRTL ? 'المدينة' : 'City'}</Label>
                        <Select value={profileForm.city_id ?? ''} disabled={!profileForm.country_id}
                          onValueChange={(v) => setProfileForm(p => ({ ...p, city_id: v || null }))}>
                          <SelectTrigger className="h-9 text-sm mt-1">
                            <SelectValue placeholder={profileForm.country_id ? (isRTL ? 'اختر مدينة' : 'Select city') : (isRTL ? 'اختر الدولة أولاً' : 'Pick country first')} />
                          </SelectTrigger>
                          <SelectContent>
                            {cities.map(c => (
                              <SelectItem key={c.id} value={c.id}>{isRTL ? c.name_ar : c.name_en}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 pt-2 border-t border-border/40">
                    <Button size="sm" className="text-xs gap-1.5" onClick={() => updateProfileMutation.mutate()}
                      disabled={updateProfileMutation.isPending || (!!profileForm.username && !usernameOk)}>
                      {updateProfileMutation.isPending
                        ? <Loader2 className="w-3 h-3 animate-spin" />
                        : <Check className="w-3 h-3" />}
                      {isRTL ? 'حفظ التعديلات' : 'Save changes'}
                    </Button>
                    <Button variant="ghost" size="sm" className="text-xs"
                      onClick={() => setEditingProfile(false)} disabled={updateProfileMutation.isPending}>
                      {isRTL ? 'إلغاء' : 'Cancel'}
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ) : (
              /* Read-only quick view of editable fields */
              <Card className="border-border/40">
                <CardContent className="p-3 sm:p-4">
                  <div className="flex items-center gap-2 mb-3">
                    <User className="w-4 h-4 text-accent" />
                    <h3 className="font-heading font-bold text-sm">{isRTL ? 'البيانات الشخصية' : 'Personal information'}</h3>
                  </div>
                  <div className="grid sm:grid-cols-2 gap-2">
                    {[
                      { icon: User, label: isRTL ? 'الاسم' : 'Name', value: profile?.full_name },
                      { icon: AtSign, label: isRTL ? 'اسم المستخدم' : 'Username', value: profile?.username ? `@${profile.username}` : null, tech: true },
                      { icon: Mail, label: isRTL ? 'البريد' : 'Email', value: getDisplayEmail({ authEmail: user?.email, profileEmail: profile?.email }), tech: true },
                      { icon: Phone, label: isRTL ? 'الجوال' : 'Phone', value: profile?.phone, tech: true },
                      { icon: Languages, label: isRTL ? 'لغة المراسلات' : 'Language', value: profile?.preferred_language === 'ar' ? 'العربية' : 'English' },
                      { icon: MapPin, label: isRTL ? 'الموقع' : 'Location',
                        value: [
                          countries.find(c => c.id === profile?.country_id),
                          cities.find(c => c.id === profile?.city_id),
                        ].filter(Boolean).map(r => isRTL ? r!.name_ar : r!.name_en).join(' — ') || null },
                    ].map((item, i) => (
                      <div key={i} className="flex items-center justify-between p-2 rounded-lg bg-muted/20 hover:bg-muted/30 transition-colors gap-2">
                        <div className="flex items-center gap-1.5 text-[11px] text-muted-foreground shrink-0">
                          <item.icon className="w-3 h-3" />{item.label}
                        </div>
                        <span className={cn('text-[11px] font-medium text-end truncate', item.tech && 'tech-content')}>
                          {item.value || <span className="text-muted-foreground italic">{isRTL ? 'غير مضاف' : 'Not set'}</span>}
                        </span>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}

            {/* ── Account details (read-only system info) ──────── */}
            <Card className="border-border/40">
              <CardContent className="p-3 sm:p-4 space-y-2">
                <div className="flex items-center gap-2 mb-2">
                  <Info className="w-4 h-4 text-accent" />
                  <h3 className="font-heading font-bold text-sm">{isRTL ? 'البيانات النظامية' : 'System details'}</h3>
                </div>
                <div className="grid sm:grid-cols-2 gap-2">
                  {[
                    { icon: Fingerprint, label: isRTL ? 'المعرف' : 'Reference ID', value: displayRefId || profile?.ref_id, tech: true },
                    isSyntheticPhoneEmail(user?.email)
                      ? { icon: Phone, label: isRTL ? 'رقم الدخول' : 'Login phone', value: user?.phone ? `+${user.phone}` : (profile?.phone || '-'), tech: true }
                      : { icon: Mail, label: isRTL ? 'بريد الدخول' : 'Login email', value: user?.email, tech: true },
                    { icon: Globe, label: isRTL ? 'لغة الواجهة' : 'Interface', value: language === 'ar' ? 'العربية' : 'English' },
                    { icon: Crown, label: isRTL ? 'الباقة' : 'Membership', value: profile?.membership_tier || 'free' },
                  ].map((item, i) => (
                    <div key={i} className="flex items-center justify-between p-2 rounded-lg bg-muted/20 hover:bg-muted/30 transition-colors gap-2">
                      <div className="flex items-center gap-1.5 text-[11px] text-muted-foreground shrink-0">
                        <item.icon className="w-3 h-3" />{item.label}
                      </div>
                      <span className={cn('text-[11px] font-medium truncate', item.tech && 'tech-content')}>{item.value || '-'}</span>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            {/* ── Danger Zone ───────────────────────────────────── */}
            <Card className="border-destructive/20">
              <CardContent className="p-3 sm:p-4">
                <div className="flex items-center gap-2 mb-3">
                  <AlertTriangle className="w-4 h-4 text-destructive" />
                  <h3 className="font-heading font-bold text-sm text-destructive">{isRTL ? 'منطقة الخطر' : 'Danger zone'}</h3>
                </div>
                <div className="flex flex-wrap gap-2">
                  <Button variant="outline" size="sm" className="text-xs gap-1.5 border-destructive/30 text-destructive hover:bg-destructive/10" onClick={handleSignOut}>
                    <LogOut className="w-3 h-3" />{isRTL ? 'تسجيل الخروج' : 'Sign out'}
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>
        )}

        {/* ═══ SECURITY ═══ */}
        {activeTab === 'security' && (
          <div className="space-y-3">
            {/* Password */}
            <Card className="border-border/40">
              <CardContent className="p-3 sm:p-4">
                <div className="flex items-center gap-2 mb-3">
                  <KeyRound className="w-4 h-4 text-accent" />
                  <h3 className="font-heading font-bold text-sm">{isRTL ? 'تغيير كلمة المرور' : 'Change Password'}</h3>
                </div>
                <div className="space-y-3 max-w-sm">
                  <div>
                    <Label className="text-[10px]">{isRTL ? 'كلمة المرور الجديدة' : 'New Password'}</Label>
                    <div className="relative mt-0.5">
                      <Input
                        type={showPassword ? 'text' : 'password'}
                        value={newPassword}
                        onChange={e => setNewPassword(e.target.value)}
                        className="h-8 text-xs pe-8"
                        placeholder={isRTL ? '8 أحرف على الأقل' : 'At least 8 characters'}
                      />
                      <button className="absolute end-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground" onClick={() => setShowPassword(!showPassword)}>
                        {showPassword ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                      </button>
                    </div>
                    {passwordStrength && (
                      <div className="mt-1.5 space-y-1">
                        <Progress value={passwordStrength.percentage} className="h-1" />
                        <p className="text-[9px] font-medium" style={{ color: passwordStrength.score >= 3 ? 'hsl(142 76% 36%)' : passwordStrength.score >= 2 ? 'hsl(42 85% 55%)' : undefined }}>
                          {isRTL ? strengthLabels[passwordStrength.label]?.ar : strengthLabels[passwordStrength.label]?.en}
                        </p>
                      </div>
                    )}
                  </div>
                  <div>
                    <Label className="text-[10px]">{isRTL ? 'تأكيد كلمة المرور' : 'Confirm Password'}</Label>
                    <Input
                      type={showPassword ? 'text' : 'password'}
                      value={confirmPassword}
                      onChange={e => setConfirmPassword(e.target.value)}
                      className={cn('h-8 text-xs mt-0.5', confirmPassword && (passwordsMatch ? 'border-success/50' : 'border-destructive/50'))}
                    />
                    {confirmPassword && !passwordsMatch && (
                      <p className="text-[9px] text-destructive mt-0.5">{isRTL ? 'كلمتا المرور غير متطابقتين' : 'Passwords do not match'}</p>
                    )}
                  </div>
                  <Button size="sm" className="gap-1.5 text-xs" onClick={handleUpdatePassword}
                    disabled={loading || !newPassword || !passwordsMatch}>
                    {loading ? <span className="animate-spin">⏳</span> : <Lock className="w-3 h-3" />}
                    {isRTL ? 'تحديث كلمة المرور' : 'Update Password'}
                  </Button>
                </div>
              </CardContent>
            </Card>

            {/* Active Sessions */}
            <Card className="border-border/40">
              <CardContent className="p-3 sm:p-4">
                <div className="flex items-center gap-2 mb-3">
                  <Smartphone className="w-4 h-4 text-accent" />
                  <h3 className="font-heading font-bold text-sm">{isRTL ? 'الجلسات النشطة' : 'Active Sessions'}</h3>
                </div>
                {sessions?.map((s, i: number) => (
                  <div key={i} className="flex items-center gap-3 p-2.5 rounded-lg bg-muted/20">
                    <div className="w-8 h-8 rounded-lg bg-accent/10 flex items-center justify-center shrink-0">
                      <Monitor className="w-3.5 h-3.5 text-accent" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-1.5">
                        <p className="text-xs font-medium">{isRTL ? 'الجلسة الحالية' : 'Current Session'}</p>
                        <Badge className="bg-success/10 text-success text-[7px] px-1 py-0 h-3">{isRTL ? 'نشط' : 'Active'}</Badge>
                      </div>
                      <p className="text-[9px] text-muted-foreground mt-0.5">
                        {isRTL ? 'بدأت' : 'Started'}: {formatDistanceToNow(new Date(s.created_at), { addSuffix: true, locale: language === 'ar' ? arLocale : enUS })}
                      </p>
                    </div>
                  </div>
                ))}
              </CardContent>
            </Card>

            {/* Security Tips */}
            <Card className="border-border/40">
              <CardContent className="p-3 sm:p-4">
                <div className="flex items-center gap-2 mb-3">
                  <Shield className="w-4 h-4 text-accent" />
                  <h3 className="font-heading font-bold text-sm">{isRTL ? 'نصائح أمنية' : 'Security Tips'}</h3>
                </div>
                <div className="space-y-1.5">
                  {[
                    { ar: 'استخدم كلمة مرور قوية تحتوي على أحرف وأرقام ورموز', en: 'Use a strong password with letters, numbers, and symbols' },
                    { ar: 'لا تشارك معلومات حسابك مع أي شخص', en: 'Never share your account credentials' },
                    { ar: 'تحقق من البريد الإلكتروني بانتظام للتنبيهات الأمنية', en: 'Check email regularly for security alerts' },
                    { ar: 'قم بتسجيل الخروج من الأجهزة غير المستخدمة', en: 'Sign out from unused devices' },
                  ].map((tip, i) => (
                    <div key={i} className="flex items-start gap-2 p-1.5 text-[10px] text-muted-foreground">
                      <CheckCircle className="w-3 h-3 text-success mt-0.5 shrink-0" />
                      <span>{isRTL ? tip.ar : tip.en}</span>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>
        )}

        {/* ═══ NOTIFICATIONS ═══ */}
        {activeTab === 'notifications' && (
          <div className="space-y-3">
            {/* Browser Notifications */}
            <Card className="border-border/40">
              <CardContent className="p-3 sm:p-4">
                <div className="flex items-center gap-2 mb-3">
                  <BellRing className="w-4 h-4 text-accent" />
                  <h3 className="font-heading font-bold text-sm">{isRTL ? 'إشعارات المتصفح' : 'Browser Notifications'}</h3>
                </div>
                {notifSupported ? (
                  <div className="space-y-3">
                    <div className="flex items-center justify-between p-2.5 rounded-lg bg-muted/20">
                      <div className="flex items-center gap-2">
                        <Smartphone className="w-3.5 h-3.5 text-muted-foreground" />
                        <div>
                          <p className="text-xs font-medium">{isRTL ? 'إشعارات سطح المكتب' : 'Desktop Notifications'}</p>
                          <p className="text-[9px] text-muted-foreground">{isRTL ? 'تلقي إشعارات حتى عند عدم تصفح الموقع' : 'Get notified even when not browsing'}</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <Badge className={cn('text-[8px] px-1.5 py-0 h-[14px]',
                          permission.current === 'granted' ? 'bg-success/10 text-success' :
                          permission.current === 'denied' ? 'bg-destructive/10 text-destructive' : 'bg-muted text-muted-foreground')}>
                          {permission.current === 'granted' ? (isRTL ? 'مفعّل' : 'Enabled') :
                           permission.current === 'denied' ? (isRTL ? 'محظور' : 'Blocked') :
                           (isRTL ? 'غير مفعّل' : 'Not set')}
                        </Badge>
                        {permission.current !== 'granted' && permission.current !== 'denied' && (
                          <Button size="sm" variant="outline" className="h-6 text-[10px] gap-1" onClick={requestPermission}>
                            <BellRing className="w-2.5 h-2.5" />{isRTL ? 'تفعيل' : 'Enable'}
                          </Button>
                        )}
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="text-center py-4">
                    <BellOff className="w-8 h-8 text-muted-foreground/30 mx-auto mb-2" />
                    <p className="text-xs text-muted-foreground">{isRTL ? 'متصفحك لا يدعم الإشعارات' : 'Your browser does not support notifications'}</p>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Notification Preferences */}
            <Card className="border-border/40">
              <CardContent className="p-3 sm:p-4">
                <div className="flex items-center gap-2 mb-3">
                  <Bell className="w-4 h-4 text-accent" />
                  <h3 className="font-heading font-bold text-sm">{isRTL ? 'تفضيلات الإشعارات' : 'Notification Preferences'}</h3>
                </div>
                <div className="space-y-2">
                  {[
                    { icon: CreditCard, ar: 'إشعارات العقود والأقساط', en: 'Contract & installment alerts', defaultOn: true },
                    { icon: Mail, ar: 'إشعارات الرسائل الجديدة', en: 'New message alerts', defaultOn: true },
                    { icon: AlertTriangle, ar: 'تنبيهات الدفعات المتأخرة', en: 'Overdue payment alerts', defaultOn: true },
                    { icon: Globe, ar: 'تحديثات العروض والترويج', en: 'Promotion updates', defaultOn: false },
                    { icon: Shield, ar: 'تنبيهات أمنية', en: 'Security alerts', defaultOn: true },
                  ].map((pref, i) => (
                    <div key={i} className="flex items-center justify-between p-2 rounded-lg bg-muted/20 hover:bg-muted/30 transition-colors">
                      <div className="flex items-center gap-2">
                        <pref.icon className="w-3.5 h-3.5 text-muted-foreground" />
                        <span className="text-xs">{isRTL ? pref.ar : pref.en}</span>
                      </div>
                      <Switch defaultChecked={pref.defaultOn} />
                    </div>
                  ))}
                </div>
                <p className="text-[9px] text-muted-foreground mt-3 flex items-center gap-1">
                  <Info className="w-3 h-3" />
                  {isRTL ? 'سيتم تطبيق هذه الإعدادات على جميع أجهزتك' : 'These settings apply across all your devices'}
                </p>
              </CardContent>
            </Card>
          </div>
        )}

        {/* ═══ BNPL ═══ */}
        {activeTab === 'bnpl' && business && (
          <Card className="border-border/40">
            <CardContent className="p-3 sm:p-4">
              <BnplProvidersManager businessId={business.id} />
            </CardContent>
          </Card>
        )}
      </div>
    </DashboardLayout>
  );
};

export default DashboardSettings;
