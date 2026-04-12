import React, { useMemo, useRef } from 'react';
import { SidebarProvider, SidebarTrigger } from '@/components/ui/sidebar';
import { DashboardSidebar } from './DashboardSidebar';
import { useLanguage } from '@/i18n/LanguageContext';
import { useAuth } from '@/contexts/AuthContext';
import { Navigate, useLocation, useNavigate } from 'react-router-dom';
import { NotificationBell } from '@/components/notifications/NotificationBell';
import { ThemeToggle } from '@/components/ThemeToggle';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { ShieldAlert, Shield, Crown, Settings, LogOut, Mail, Lock, Camera, User, ChevronDown, Phone, CheckCircle2 } from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

const breadcrumbMap: Record<string, { ar: string; en: string }> = {
  '/dashboard': { ar: 'لوحة التحكم', en: 'Dashboard' },
  '/dashboard/notifications': { ar: 'الإشعارات', en: 'Notifications' },
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
  business: { ar: 'مزود خدمة', en: 'Provider' },
  company: { ar: 'مزود خدمة', en: 'Provider' },
  provider: { ar: 'مزود خدمة', en: 'Provider' },
};

function getRoleBadge(isSuperAdmin: boolean, isAdmin: boolean, isProvider: boolean, isRTL: boolean) {
  if (isSuperAdmin) return { label: isRTL ? 'مدير عام' : 'Super Admin', icon: ShieldAlert, color: 'text-destructive bg-destructive/10' };
  if (isAdmin) return { label: isRTL ? 'مشرف' : 'Admin', icon: Shield, color: 'text-destructive bg-destructive/10' };
  if (isProvider) return { label: isRTL ? 'مزود خدمة' : 'Provider', icon: Crown, color: 'text-accent bg-accent/10' };
  return { label: isRTL ? 'مستخدم' : 'User', icon: User, color: 'text-muted-foreground bg-muted/50' };
}

interface DashboardLayoutProps {
  children: React.ReactNode;
}

export const DashboardLayout: React.FC<DashboardLayoutProps> = ({ children }) => {
  const { isRTL, language } = useLanguage();
  const { user, loading, profile, isAdmin, isSuperAdmin, isProvider, signOut, refreshProfile } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [avatarUploading, setAvatarUploading] = React.useState(false);

  const currentPage = breadcrumbMap[location.pathname];
  const pageTitle = currentPage ? (isRTL ? currentPage.ar : currentPage.en) : '';

  const todayStr = useMemo(() => {
    return new Date().toLocaleDateString(language === 'ar' ? 'ar-SA' : 'en-US', {
      weekday: 'long', year: 'numeric', month: 'long', day: 'numeric',
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
  const roleBadge = getRoleBadge(isSuperAdmin, isAdmin, isProvider, isRTL);
  const accountLabel = isProvider
    ? accountTypeLabels.provider
    : (accountTypeLabels[profile?.account_type || 'individual'] || accountTypeLabels.individual);

  const handleAvatarUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !profile) return;
    if (!file.type.startsWith('image/')) { toast.error(isRTL ? 'يرجى اختيار صورة' : 'Please select an image'); return; }
    if (file.size > 2 * 1024 * 1024) { toast.error(isRTL ? 'حجم الصورة يجب أن لا يتجاوز 2 ميجا' : 'Image must be under 2MB'); return; }
    setAvatarUploading(true);
    try {
      const ext = file.name.split('.').pop();
      const path = `${user.id}/avatar.${ext}`;
      const { error: uploadError } = await supabase.storage.from('business-assets').upload(path, file, { upsert: true });
      if (uploadError) throw uploadError;
      const { data: urlData } = supabase.storage.from('business-assets').getPublicUrl(path);
      const { error: updateError } = await supabase.from('profiles').update({ avatar_url: urlData.publicUrl }).eq('user_id', user.id);
      if (updateError) throw updateError;
      await refreshProfile();
      toast.success(isRTL ? 'تم تحديث الصورة الشخصية' : 'Avatar updated');
    } catch (err: any) { toast.error(err.message); }
    finally { setAvatarUploading(false); }
  };

  const handleLogout = async () => { await signOut(); navigate('/'); };

  return (
    <SidebarProvider>
      <div className="min-h-screen flex w-full">
        <DashboardSidebar />
        <div className="flex-1 flex flex-col min-w-0">
          {/* Header */}
          <header className="sticky top-0 z-10 border-b border-border/30 bg-card/95 backdrop-blur-2xl dark:border-border/15 dark:bg-card/80 shadow-sm shadow-black/[0.02]">
            <div className="flex items-center h-14 sm:h-[4.25rem] px-3 sm:px-6 gap-3">
              <SidebarTrigger />

              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  {pageTitle && (
                    <h2 className="font-heading font-bold text-sm sm:text-lg text-foreground truncate">{pageTitle}</h2>
                  )}
                </div>
                <p className="text-[10px] sm:text-xs text-muted-foreground/70 truncate hidden sm:block">{todayStr}</p>
              </div>

              <div className="flex items-center gap-2 sm:gap-2.5">
                <ThemeToggle />
                <NotificationBell />

                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <button className="flex items-center gap-2.5 rounded-full border border-border/30 bg-muted/20 py-1 pe-2.5 sm:pe-3.5 ps-1 dark:border-border/15 hover:bg-muted/40 transition-colors focus:outline-none focus:ring-2 focus:ring-accent/30">
                      <div className="relative">
                        <Avatar className="h-8 w-8 sm:h-9 sm:w-9">
                          <AvatarImage src={profile?.avatar_url || undefined} />
                          <AvatarFallback className="bg-accent/15 text-accent text-xs sm:text-sm font-bold">{initial}</AvatarFallback>
                        </Avatar>
                        <span className="absolute -bottom-0.5 -end-0.5 w-2.5 h-2.5 bg-emerald-500 border-2 border-card rounded-full" />
                      </div>
                      <div className="hidden sm:flex flex-col items-start min-w-0">
                        <span className="text-xs font-semibold text-foreground truncate max-w-[120px] leading-tight">
                          {profile?.full_name || (isRTL ? 'مستخدم' : 'User')}
                        </span>
                        <span className="text-[10px] text-muted-foreground/70 leading-tight">
                          {isRTL ? accountLabel?.ar : accountLabel?.en}
                        </span>
                      </div>
                      <ChevronDown className="w-3.5 h-3.5 text-muted-foreground/50 hidden sm:block" />
                    </button>
                  </DropdownMenuTrigger>

                  <DropdownMenuContent align={isRTL ? 'start' : 'end'} className="w-72 p-0" sideOffset={8}>
                    {/* Profile header */}
                    <div className="p-4 border-b border-border/30 bg-muted/10">
                      <div className="flex items-center gap-3">
                        <div className="relative group">
                          <Avatar className="h-13 w-13">
                            <AvatarImage src={profile?.avatar_url || undefined} />
                            <AvatarFallback className="bg-accent/15 text-accent text-lg font-bold">{initial}</AvatarFallback>
                          </Avatar>
                          <button onClick={() => fileInputRef.current?.click()} disabled={avatarUploading}
                            className="absolute inset-0 flex items-center justify-center bg-foreground/50 rounded-full opacity-0 group-hover:opacity-100 transition-opacity">
                            <Camera className="w-4 h-4 text-background" />
                          </button>
                          <input ref={fileInputRef} type="file" accept="image/*" className="hidden" onChange={handleAvatarUpload} />
                        </div>
                        <div className="min-w-0 flex-1">
                          <p className="font-semibold text-sm text-foreground truncate">{profile?.full_name || (isRTL ? 'مستخدم' : 'User')}</p>
                          <div className={`inline-flex items-center gap-1 mt-1 px-2 py-0.5 rounded-full text-[10px] font-medium ${roleBadge.color}`}>
                            <roleBadge.icon className="w-2.5 h-2.5" />{roleBadge.label}
                          </div>
                        </div>
                      </div>
                      <div className="mt-3 space-y-1.5">
                        <div className="flex items-center gap-2 text-[10px] text-muted-foreground">
                          <Mail className="w-3 h-3 shrink-0" /><span className="truncate tech-content" dir="ltr">{user.email}</span>
                        </div>
                        {profile?.phone && (
                          <div className="flex items-center gap-2 text-[10px] text-muted-foreground">
                            <Phone className="w-3 h-3 shrink-0" />
                            <span className="tech-content" dir="ltr">{profile.phone}</span>
                            {profile.phone_verified && <CheckCircle2 className="w-3 h-3 text-emerald-500" />}
                          </div>
                        )}
                        {profile?.ref_id && (
                          <div className="flex items-center gap-2 text-[10px] text-muted-foreground">
                            <User className="w-3 h-3 shrink-0" />
                            <span className="tech-content font-mono">{profile.ref_id}</span>
                          </div>
                        )}
                      </div>
                    </div>

                    <div className="p-1.5">
                      <DropdownMenuItem onClick={() => navigate('/dashboard/settings')} className="gap-2 py-2.5 rounded-lg cursor-pointer">
                        <Settings className="w-4 h-4 text-muted-foreground" />
                        <span className="text-xs">{isRTL ? 'الإعدادات' : 'Settings'}</span>
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={() => navigate('/dashboard/settings?tab=security')} className="gap-2 py-2.5 rounded-lg cursor-pointer">
                        <Lock className="w-4 h-4 text-muted-foreground" />
                        <span className="text-xs">{isRTL ? 'الأمان وكلمة المرور' : 'Security & Password'}</span>
                      </DropdownMenuItem>
                      {!profile?.phone_verified && (
                        <DropdownMenuItem onClick={() => navigate('/dashboard/settings?tab=account')} className="gap-2 py-2.5 rounded-lg cursor-pointer text-amber-600">
                          <Phone className="w-4 h-4" />
                          <span className="text-xs">{isRTL ? 'تأكيد رقم الجوال' : 'Verify Phone'}</span>
                        </DropdownMenuItem>
                      )}
                    </div>

                    <DropdownMenuSeparator className="my-0" />

                    <div className="p-1.5">
                      <DropdownMenuItem onClick={handleLogout}
                        className="gap-2 py-2.5 rounded-lg cursor-pointer text-destructive focus:text-destructive focus:bg-destructive/10">
                        <LogOut className="w-4 h-4" />
                        <span className="text-xs">{isRTL ? 'تسجيل الخروج' : 'Sign Out'}</span>
                      </DropdownMenuItem>
                    </div>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
            </div>
          </header>

          <main className="flex-1 p-3 sm:p-5 md:p-7 bg-background overflow-auto">
            {children}
          </main>
        </div>
      </div>
    </SidebarProvider>
  );
};
