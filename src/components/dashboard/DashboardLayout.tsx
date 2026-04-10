import React, { useMemo, useState, useRef } from 'react';
import { SidebarProvider, SidebarTrigger } from '@/components/ui/sidebar';
import { DashboardSidebar } from './DashboardSidebar';
import { useLanguage } from '@/i18n/LanguageContext';
import { useAuth } from '@/contexts/AuthContext';
import { Navigate, useLocation, useNavigate } from 'react-router-dom';
import { NotificationBell } from '@/components/notifications/NotificationBell';
import { ThemeToggle } from '@/components/ThemeToggle';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { ShieldAlert, Shield, Crown, Settings, LogOut, Mail, Lock, Camera, User, ChevronDown, Pencil, Phone, CheckCircle2, XCircle, Loader2 } from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

const breadcrumbMap: Record<string, { ar: string; en: string }> = {
  '/dashboard': { ar: 'لوحة التحكم', en: 'Dashboard' },
  '/dashboard/services': { ar: 'الخدمات', en: 'Services' },
  '/dashboard/portfolio': { ar: 'معرض الأعمال', en: 'Portfolio' },
  '/dashboard/projects': { ar: 'المشاريع', en: 'Projects' },
  '/dashboard/promotions': { ar: 'العروض', en: 'Promotions' },
  '/dashboard/contracts': { ar: 'العقود', en: 'Contracts' },
  '/dashboard/warranties': { ar: 'الضمانات', en: 'Warranties' },
  '/dashboard/installments': { ar: 'الأقساط', en: 'Installments' },
  '/dashboard/messages': { ar: 'الرسائل', en: 'Messages' },
  '/dashboard/reviews': { ar: 'التقييمات', en: 'Reviews' },
  '/dashboard/operations': { ar: 'العمليات', en: 'Operations' },
  '/dashboard/settings': { ar: 'الإعدادات', en: 'Settings' },
  '/dashboard/bookmarks': { ar: 'المفضلة', en: 'Bookmarks' },
  '/dashboard/blog': { ar: 'المدونة', en: 'Blog' },
  '/dashboard/profile-systems': { ar: 'القطاعات', en: 'Profiles' },
};

const accountTypeLabels: Record<string, { ar: string; en: string }> = {
  individual: { ar: 'مستخدم', en: 'User' },
  provider: { ar: 'مزود خدمة', en: 'Provider' },
};

function getGreeting(isRTL: boolean): string {
  const hour = new Date().getHours();
  if (hour < 12) return isRTL ? 'صباح الخير' : 'Good morning';
  if (hour < 17) return isRTL ? 'مساء الخير' : 'Good afternoon';
  return isRTL ? 'مساء الخير' : 'Good evening';
}

function getRoleBadge(isSuperAdmin: boolean, isAdmin: boolean, isProvider: boolean, isRTL: boolean) {
  if (isSuperAdmin) return { label: isRTL ? 'مدير عام' : 'Super Admin', icon: ShieldAlert, color: 'text-purple-500 bg-purple-500/10' };
  if (isAdmin) return { label: isRTL ? 'مشرف' : 'Admin', icon: Shield, color: 'text-red-500 bg-red-500/10' };
  if (isProvider) return { label: isRTL ? 'مزود خدمة' : 'Provider', icon: Crown, color: 'text-accent bg-accent/10' };
  return { label: isRTL ? 'مستخدم' : 'User', icon: User, color: 'text-muted-foreground bg-muted/50' };
}

interface DashboardLayoutProps {
  children: React.ReactNode;
}

export const DashboardLayout: React.FC<DashboardLayoutProps> = ({ children }) => {
  const { isRTL, language } = useLanguage();
  const { user, loading, profile, isAdmin, isSuperAdmin, signOut, refreshProfile } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();

  const [passwordDialog, setPasswordDialog] = useState(false);
  const [nameDialog, setNameDialog] = useState(false);
  const [phoneDialog, setPhoneDialog] = useState(false);
  const [editName, setEditName] = useState('');
  const [nameLoading, setNameLoading] = useState(false);
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [pwLoading, setPwLoading] = useState(false);
  const [avatarUploading, setAvatarUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Phone OTP state
  const [phoneNumber, setPhoneNumber] = useState('');
  const [phoneCountryCode, setPhoneCountryCode] = useState('+966');
  const [otpSent, setOtpSent] = useState(false);
  const [otpCode, setOtpCode] = useState('');
  const [otpLoading, setOtpLoading] = useState(false);
  const [demoOtp, setDemoOtp] = useState<string | null>(null);
  const [cooldown, setCooldown] = useState(0);

  const greeting = useMemo(() => getGreeting(isRTL), [isRTL]);
  const currentPage = breadcrumbMap[location.pathname];
  const pageTitle = currentPage ? (isRTL ? currentPage.ar : currentPage.en) : '';

  const todayStr = useMemo(() => {
    return new Date().toLocaleDateString(language === 'ar' ? 'ar-SA' : 'en-US', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
  }, [language]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="w-10 h-10 rounded-xl bg-gradient-gold flex items-center justify-center animate-pulse">
          <span className="font-heading font-black text-lg text-secondary-foreground">ف</span>
        </div>
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/auth" replace />;
  }

  const initial = (profile?.full_name || user.email || '?').charAt(0).toUpperCase();
  const isProvider = profile?.account_type === 'provider';
  const roleBadge = getRoleBadge(isSuperAdmin, isAdmin, isProvider, isRTL);
  const accountLabel = accountTypeLabels[profile?.account_type || 'individual'];

  const handlePasswordChange = async () => {
    if (newPassword.length < 8) {
      toast.error(isRTL ? 'كلمة المرور يجب أن تكون 8 أحرف على الأقل' : 'Password must be at least 8 characters');
      return;
    }
    if (newPassword !== confirmPassword) {
      toast.error(isRTL ? 'كلمات المرور غير متطابقة' : 'Passwords do not match');
      return;
    }
    setPwLoading(true);
    try {
      const { error } = await supabase.auth.updateUser({ password: newPassword });
      if (error) throw error;
      toast.success(isRTL ? 'تم تحديث كلمة المرور بنجاح' : 'Password updated successfully');
      setPasswordDialog(false);
      setNewPassword('');
      setConfirmPassword('');
    } catch (err: any) {
      toast.error(err.message);
    } finally {
      setPwLoading(false);
    }
  };

  const handleAvatarUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !profile) return;

    if (!file.type.startsWith('image/')) {
      toast.error(isRTL ? 'يرجى اختيار صورة' : 'Please select an image');
      return;
    }
    if (file.size > 2 * 1024 * 1024) {
      toast.error(isRTL ? 'حجم الصورة يجب أن لا يتجاوز 2 ميجا' : 'Image must be under 2MB');
      return;
    }

    setAvatarUploading(true);
    try {
      const ext = file.name.split('.').pop();
      const path = `${user.id}/avatar.${ext}`;

      const { error: uploadError } = await supabase.storage
        .from('business-assets')
        .upload(path, file, { upsert: true });
      if (uploadError) throw uploadError;

      const { data: urlData } = supabase.storage.from('business-assets').getPublicUrl(path);

      const { error: updateError } = await supabase
        .from('profiles')
        .update({ avatar_url: urlData.publicUrl })
        .eq('user_id', user.id);
      if (updateError) throw updateError;

      await refreshProfile();
      toast.success(isRTL ? 'تم تحديث الصورة الشخصية' : 'Avatar updated');
    } catch (err: any) {
      toast.error(err.message);
    } finally {
      setAvatarUploading(false);
    }
  };

  const handleNameUpdate = async () => {
    if (!editName.trim()) {
      toast.error(isRTL ? 'الاسم مطلوب' : 'Name is required');
      return;
    }
    setNameLoading(true);
    try {
      const { error } = await supabase
        .from('profiles')
        .update({ full_name: editName.trim() })
        .eq('user_id', user.id);
      if (error) throw error;
      await refreshProfile();
      toast.success(isRTL ? 'تم تحديث الاسم بنجاح' : 'Name updated successfully');
      setNameDialog(false);
    } catch (err: any) {
      toast.error(err.message);
    } finally {
      setNameLoading(false);
    }
  };

  const handleSendOtp = async () => {
    if (!phoneNumber || phoneNumber.length < 7) {
      toast.error(isRTL ? 'أدخل رقم جوال صحيح' : 'Enter a valid phone number');
      return;
    }
    setOtpLoading(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const res = await supabase.functions.invoke('send-otp', {
        body: { phone: phoneNumber, country_code: phoneCountryCode },
        headers: { Authorization: `Bearer ${session?.access_token}` },
      });
      if (res.error) throw new Error(res.error.message);
      const result = res.data;
      if (result.demo_otp) {
        setDemoOtp(result.demo_otp);
      }
      setOtpSent(true);
      setCooldown(60);
      const timer = setInterval(() => {
        setCooldown(prev => {
          if (prev <= 1) { clearInterval(timer); return 0; }
          return prev - 1;
        });
      }, 1000);
      toast.success(isRTL ? 'تم إرسال رمز التحقق' : 'OTP sent');
    } catch (err: any) {
      toast.error(err.message);
    } finally {
      setOtpLoading(false);
    }
  };

  const handleVerifyOtp = async () => {
    if (otpCode.length !== 6) {
      toast.error(isRTL ? 'أدخل رمز التحقق المكون من 6 أرقام' : 'Enter 6-digit OTP');
      return;
    }
    setOtpLoading(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const res = await supabase.functions.invoke('verify-otp', {
        body: { phone: phoneNumber, country_code: phoneCountryCode, otp_code: otpCode },
        headers: { Authorization: `Bearer ${session?.access_token}` },
      });
      if (res.error) throw new Error(res.error.message);
      if (res.data?.error) throw new Error(res.data.error);
      await refreshProfile();
      toast.success(isRTL ? 'تم التحقق من رقم الجوال بنجاح' : 'Phone verified successfully');
      setPhoneDialog(false);
      setOtpSent(false);
      setOtpCode('');
      setDemoOtp(null);
    } catch (err: any) {
      toast.error(err.message);
    } finally {
      setOtpLoading(false);
    }
  };

  const handleLogout = async () => {
    await signOut();
    navigate('/');
  };

  const countryCodes = [
    { code: '+966', flag: '🇸🇦' },
    { code: '+971', flag: '🇦🇪' },
    { code: '+965', flag: '🇰🇼' },
    { code: '+973', flag: '🇧🇭' },
    { code: '+968', flag: '🇴🇲' },
    { code: '+974', flag: '🇶🇦' },
    { code: '+962', flag: '🇯🇴' },
    { code: '+20', flag: '🇪🇬' },
  ];

  return (
    <SidebarProvider>
      <div className="min-h-screen flex w-full">
        <DashboardSidebar />
        <div className="flex-1 flex flex-col min-w-0">
          {/* Header */}
          <header className="sticky top-0 z-10 border-b border-border/40 bg-card/90 backdrop-blur-xl dark:border-border/20 dark:bg-card/70">
            <div className="flex items-center h-14 sm:h-16 px-3 sm:px-5 gap-3">
              <SidebarTrigger />

              {/* Page Title */}
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  {pageTitle && (
                    <h2 className="font-heading font-bold text-sm sm:text-base text-foreground truncate">
                      {pageTitle}
                    </h2>
                  )}
                </div>
                <p className="text-[10px] sm:text-xs text-muted-foreground truncate hidden sm:block">
                  {todayStr}
                </p>
              </div>

              {/* Right actions */}
              <div className="flex items-center gap-1.5 sm:gap-2">
                <ThemeToggle />
                <NotificationBell />

                {/* Profile Dropdown */}
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <button className="flex items-center gap-2 rounded-full border border-border/40 bg-muted/30 py-1 pe-2 sm:pe-3 ps-1 dark:border-border/20 hover:bg-muted/50 transition-colors focus:outline-none focus:ring-2 focus:ring-accent/30">
                      <div className="relative">
                        <Avatar className="h-7 w-7 sm:h-8 sm:w-8">
                          <AvatarImage src={profile?.avatar_url || undefined} />
                          <AvatarFallback className="bg-accent/15 text-accent text-[10px] sm:text-xs font-bold">
                            {initial}
                          </AvatarFallback>
                        </Avatar>
                        <span className="absolute -bottom-0.5 -end-0.5 w-2.5 h-2.5 bg-emerald-500 border-2 border-card rounded-full" />
                      </div>
                      <div className="hidden sm:flex flex-col items-start min-w-0">
                        <span className="text-xs font-medium text-foreground truncate max-w-[120px] leading-tight">
                          {profile?.full_name || (isRTL ? 'مستخدم' : 'User')}
                        </span>
                        <span className="text-[10px] text-muted-foreground leading-tight">
                          {isRTL ? accountLabel?.ar : accountLabel?.en}
                        </span>
                      </div>
                      <ChevronDown className="w-3 h-3 text-muted-foreground hidden sm:block" />
                    </button>
                  </DropdownMenuTrigger>

                  <DropdownMenuContent align={isRTL ? 'start' : 'end'} className="w-80 p-0" sideOffset={8}>
                    {/* Profile header */}
                    <div className="p-4 border-b border-border/40">
                      <div className="flex items-center gap-3">
                        <div className="relative group">
                          <Avatar className="h-14 w-14">
                            <AvatarImage src={profile?.avatar_url || undefined} />
                            <AvatarFallback className="bg-accent/15 text-accent text-lg font-bold">
                              {initial}
                            </AvatarFallback>
                          </Avatar>
                          <button
                            onClick={() => fileInputRef.current?.click()}
                            disabled={avatarUploading}
                            className="absolute inset-0 flex items-center justify-center bg-black/50 rounded-full opacity-0 group-hover:opacity-100 transition-opacity"
                          >
                            <Camera className="w-4 h-4 text-white" />
                          </button>
                          <input
                            ref={fileInputRef}
                            type="file"
                            accept="image/*"
                            className="hidden"
                            onChange={handleAvatarUpload}
                          />
                        </div>
                        <div className="min-w-0 flex-1">
                          {/* Name with inline edit */}
                          <div className="flex items-center gap-1.5">
                            <p className="font-medium text-sm text-foreground truncate">
                              {profile?.full_name || (isRTL ? 'مستخدم' : 'User')}
                            </p>
                            <button
                              onClick={() => { setEditName(profile?.full_name || ''); setNameDialog(true); }}
                              className="p-0.5 rounded hover:bg-muted/60 transition-colors shrink-0"
                              title={isRTL ? 'تعديل الاسم' : 'Edit Name'}
                            >
                              <Pencil className="w-3 h-3 text-muted-foreground hover:text-accent" />
                            </button>
                          </div>
                          <div className={`inline-flex items-center gap-1 mt-1 px-2 py-0.5 rounded-full text-[10px] font-medium ${roleBadge.color}`}>
                            <roleBadge.icon className="w-2.5 h-2.5" />
                            {roleBadge.label}
                          </div>
                        </div>
                      </div>

                      {/* User details */}
                      <div className="mt-3 space-y-1.5">
                        {/* Email */}
                        <div className="flex items-center gap-2 text-xs text-muted-foreground">
                          <Mail className="w-3.5 h-3.5 shrink-0" />
                          <span className="truncate tech-content" dir="ltr">{user.email}</span>
                        </div>
                        {/* Phone */}
                        <div className="flex items-center gap-2 text-xs text-muted-foreground">
                          <Phone className="w-3.5 h-3.5 shrink-0" />
                          {profile?.phone ? (
                            <div className="flex items-center gap-1.5">
                              <span className="tech-content" dir="ltr">{profile.phone}</span>
                              {profile.phone_verified ? (
                                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500 shrink-0" />
                              ) : (
                                <XCircle className="w-3.5 h-3.5 text-destructive shrink-0" />
                              )}
                            </div>
                          ) : (
                            <button
                              onClick={() => { setPhoneDialog(true); setOtpSent(false); setPhoneNumber(''); setOtpCode(''); setDemoOtp(null); }}
                              className="text-accent hover:underline text-xs"
                            >
                              {isRTL ? 'إضافة رقم الجوال' : 'Add phone number'}
                            </button>
                          )}
                        </div>
                        {/* Member ID */}
                        {profile?.ref_id && (
                          <div className="flex items-center gap-2 text-xs text-muted-foreground">
                            <User className="w-3.5 h-3.5 shrink-0" />
                            <span className="text-[10px]">{isRTL ? 'رقم العضوية:' : 'ID:'} </span>
                            <span className="text-[10px] font-mono font-medium tech-content">{profile.ref_id}</span>
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Menu items */}
                    <div className="p-1.5">
                      {!profile?.phone_verified && profile?.phone && (
                        <DropdownMenuItem
                          onClick={() => { setPhoneDialog(true); setOtpSent(false); setPhoneNumber(profile.phone?.replace(profile.country_code, '') || ''); setPhoneCountryCode(profile.country_code || '+966'); setOtpCode(''); setDemoOtp(null); }}
                          className="gap-2.5 py-2.5 rounded-lg cursor-pointer text-amber-600"
                        >
                          <Phone className="w-4 h-4" />
                          <span>{isRTL ? 'تأكيد رقم الجوال' : 'Verify Phone'}</span>
                        </DropdownMenuItem>
                      )}

                      <DropdownMenuItem
                        onClick={() => setPasswordDialog(true)}
                        className="gap-2.5 py-2.5 rounded-lg cursor-pointer"
                      >
                        <Lock className="w-4 h-4 text-muted-foreground" />
                        <span>{isRTL ? 'تغيير كلمة المرور' : 'Change Password'}</span>
                      </DropdownMenuItem>

                      <DropdownMenuItem
                        onClick={() => fileInputRef.current?.click()}
                        className="gap-2.5 py-2.5 rounded-lg cursor-pointer"
                      >
                        <Camera className="w-4 h-4 text-muted-foreground" />
                        <span>{isRTL ? 'تغيير الصورة الشخصية' : 'Change Avatar'}</span>
                      </DropdownMenuItem>
                    </div>

                    <DropdownMenuSeparator className="my-0" />

                    <div className="p-1.5">
                      <DropdownMenuItem
                        onClick={() => navigate('/dashboard/settings')}
                        className="gap-2.5 py-2.5 rounded-lg cursor-pointer"
                      >
                        <Settings className="w-4 h-4 text-muted-foreground" />
                        <span>{isRTL ? 'الإعدادات' : 'Settings'}</span>
                      </DropdownMenuItem>
                    </div>

                    <DropdownMenuSeparator className="my-0" />

                    <div className="p-1.5">
                      <DropdownMenuItem
                        onClick={handleLogout}
                        className="gap-2.5 py-2.5 rounded-lg cursor-pointer text-destructive focus:text-destructive focus:bg-destructive/10"
                      >
                        <LogOut className="w-4 h-4" />
                        <span>{isRTL ? 'تسجيل الخروج' : 'Sign Out'}</span>
                      </DropdownMenuItem>
                    </div>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
            </div>
          </header>

          <main className="flex-1 p-3 sm:p-4 md:p-6 bg-background overflow-auto">
            {children}
          </main>
        </div>
      </div>

      {/* Password Change Dialog */}
      <Dialog open={passwordDialog} onOpenChange={setPasswordDialog}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>{isRTL ? 'تغيير كلمة المرور' : 'Change Password'}</DialogTitle>
            <DialogDescription>
              {isRTL ? 'أدخل كلمة المرور الجديدة (8 أحرف على الأقل)' : 'Enter your new password (minimum 8 characters)'}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 pt-2">
            <div className="space-y-1.5">
              <Label className="text-sm">{isRTL ? 'كلمة المرور الجديدة' : 'New Password'}</Label>
              <Input
                type="password"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                placeholder="••••••••"
              />
            </div>
            <div className="space-y-1.5">
              <Label className="text-sm">{isRTL ? 'تأكيد كلمة المرور' : 'Confirm Password'}</Label>
              <Input
                type="password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="••••••••"
              />
            </div>
            <div className="flex gap-2 justify-end">
              <Button variant="outline" onClick={() => setPasswordDialog(false)}>
                {isRTL ? 'إلغاء' : 'Cancel'}
              </Button>
              <Button onClick={handlePasswordChange} disabled={pwLoading}>
                {pwLoading ? (isRTL ? 'جاري التحديث...' : 'Updating...') : (isRTL ? 'تحديث' : 'Update')}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Name Edit Dialog */}
      <Dialog open={nameDialog} onOpenChange={setNameDialog}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>{isRTL ? 'تعديل الاسم' : 'Edit Name'}</DialogTitle>
            <DialogDescription>
              {isRTL ? 'أدخل الاسم الجديد' : 'Enter your new name'}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 pt-2">
            <div className="space-y-1.5">
              <Label className="text-sm">{isRTL ? 'الاسم الكامل' : 'Full Name'}</Label>
              <Input
                value={editName}
                onChange={(e) => setEditName(e.target.value)}
                placeholder={isRTL ? 'أدخل اسمك' : 'Enter your name'}
              />
            </div>
            <div className="flex gap-2 justify-end">
              <Button variant="outline" onClick={() => setNameDialog(false)}>
                {isRTL ? 'إلغاء' : 'Cancel'}
              </Button>
              <Button onClick={handleNameUpdate} disabled={nameLoading}>
                {nameLoading ? (isRTL ? 'جاري الحفظ...' : 'Saving...') : (isRTL ? 'حفظ' : 'Save')}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Phone Verification Dialog */}
      <Dialog open={phoneDialog} onOpenChange={setPhoneDialog}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>{isRTL ? 'تحقق من رقم الجوال' : 'Verify Phone Number'}</DialogTitle>
            <DialogDescription>
              {isRTL ? 'أدخل رقم الجوال وسنرسل لك رمز التحقق' : 'Enter your phone number and we will send a verification code'}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 pt-2">
            {!otpSent ? (
              <>
                <div className="space-y-1.5">
                  <Label className="text-sm">{isRTL ? 'رقم الجوال' : 'Phone Number'}</Label>
                  <div className="flex gap-2" dir="ltr">
                    <select
                      value={phoneCountryCode}
                      onChange={(e) => setPhoneCountryCode(e.target.value)}
                      className="w-24 rounded-md border border-input bg-background px-2 py-2 text-sm"
                    >
                      {countryCodes.map(c => (
                        <option key={c.code} value={c.code}>{c.flag} {c.code}</option>
                      ))}
                    </select>
                    <Input
                      value={phoneNumber}
                      onChange={(e) => setPhoneNumber(e.target.value.replace(/\D/g, ''))}
                      placeholder="5XXXXXXXX"
                      dir="ltr"
                      className="flex-1"
                    />
                  </div>
                </div>
                <Button onClick={handleSendOtp} disabled={otpLoading} className="w-full">
                  {otpLoading ? <Loader2 className="w-4 h-4 animate-spin me-2" /> : null}
                  {isRTL ? 'إرسال رمز التحقق' : 'Send OTP'}
                </Button>
              </>
            ) : (
              <>
                <div className="space-y-1.5">
                  <Label className="text-sm">{isRTL ? 'رمز التحقق' : 'Verification Code'}</Label>
                  <Input
                    value={otpCode}
                    onChange={(e) => setOtpCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
                    placeholder="000000"
                    dir="ltr"
                    className="text-center text-lg tracking-[0.5em] font-mono"
                    maxLength={6}
                  />
                </div>

                {/* Demo OTP display (temp until SMS is activated) */}
                {demoOtp && (
                  <div className="p-3 rounded-lg bg-amber-500/10 border border-amber-500/30">
                    <p className="text-xs text-amber-700 dark:text-amber-400 mb-1">
                      {isRTL ? '⚠️ الكود المؤقت (لحين تفعيل الرسائل النصية):' : '⚠️ Temp code (until SMS is activated):'}
                    </p>
                    <p className="text-center text-2xl font-mono font-bold text-amber-600 dark:text-amber-300 tracking-[0.3em]">
                      {demoOtp}
                    </p>
                  </div>
                )}

                <Button onClick={handleVerifyOtp} disabled={otpLoading || otpCode.length !== 6} className="w-full">
                  {otpLoading ? <Loader2 className="w-4 h-4 animate-spin me-2" /> : null}
                  {isRTL ? 'تحقق' : 'Verify'}
                </Button>

                <div className="flex items-center justify-between">
                  <button
                    onClick={() => setOtpSent(false)}
                    className="text-xs text-muted-foreground hover:text-foreground"
                  >
                    {isRTL ? '← تغيير الرقم' : '← Change number'}
                  </button>
                  <button
                    onClick={handleSendOtp}
                    disabled={cooldown > 0 || otpLoading}
                    className="text-xs text-accent hover:underline disabled:opacity-50 disabled:no-underline"
                  >
                    {cooldown > 0
                      ? (isRTL ? `إعادة الإرسال (${cooldown}ث)` : `Resend (${cooldown}s)`)
                      : (isRTL ? 'إعادة إرسال الرمز' : 'Resend code')
                    }
                  </button>
                </div>
              </>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </SidebarProvider>
  );
};
