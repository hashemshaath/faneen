import React, { useMemo, useState, useRef } from 'react';
import { SidebarProvider, SidebarTrigger } from '@/components/ui/sidebar';
import { DashboardSidebar } from './DashboardSidebar';
import { useLanguage } from '@/i18n/LanguageContext';
import { useAuth } from '@/contexts/AuthContext';
import { Navigate, useLocation, useNavigate } from 'react-router-dom';
import { NotificationBell } from '@/components/notifications/NotificationBell';
import { ThemeToggle } from '@/components/ThemeToggle';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { ShieldAlert, Shield, Crown, Settings, LogOut, Mail, Lock, Camera, User, ChevronDown } from 'lucide-react';
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
  '/dashboard': { ar: 'نظرة عامة', en: 'Overview' },
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
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [pwLoading, setPwLoading] = useState(false);
  const [avatarUploading, setAvatarUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

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

  const handleLogout = async () => {
    await signOut();
    navigate('/');
  };

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
                        {/* Online indicator */}
                        <span className="absolute -bottom-0.5 -end-0.5 w-2.5 h-2.5 bg-green-500 border-2 border-card rounded-full" />
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

                  <DropdownMenuContent align={isRTL ? 'start' : 'end'} className="w-72 p-0" sideOffset={8}>
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
                          <p className="font-medium text-sm text-foreground truncate">
                            {profile?.full_name || (isRTL ? 'مستخدم' : 'User')}
                          </p>
                          <p className="text-xs text-muted-foreground truncate" dir="ltr">
                            {user.email}
                          </p>
                          <div className={`inline-flex items-center gap-1 mt-1.5 px-2 py-0.5 rounded-full text-[10px] font-medium ${roleBadge.color}`}>
                            <roleBadge.icon className="w-2.5 h-2.5" />
                            {roleBadge.label}
                          </div>
                        </div>
                      </div>
                      {profile?.ref_id && (
                        <div className="mt-2 px-2 py-1 rounded bg-muted/40 dark:bg-muted/20">
                          <span className="text-[10px] text-muted-foreground">{isRTL ? 'رقم العضوية:' : 'Member ID:'} </span>
                          <span className="text-[10px] font-mono font-medium tech-content">{profile.ref_id}</span>
                        </div>
                      )}
                    </div>

                    {/* Menu items */}
                    <div className="p-1.5">
                      <DropdownMenuItem
                        onClick={() => navigate('/dashboard/settings')}
                        className="gap-2.5 py-2.5 rounded-lg cursor-pointer"
                      >
                        <Settings className="w-4 h-4 text-muted-foreground" />
                        <span>{isRTL ? 'الإعدادات' : 'Settings'}</span>
                      </DropdownMenuItem>

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
    </SidebarProvider>
  );
};
