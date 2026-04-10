import React, { useMemo } from 'react';
import { SidebarProvider, SidebarTrigger } from '@/components/ui/sidebar';
import { DashboardSidebar } from './DashboardSidebar';
import { useLanguage } from '@/i18n/LanguageContext';
import { useAuth } from '@/contexts/AuthContext';
import { Navigate, useLocation } from 'react-router-dom';
import { NotificationBell } from '@/components/notifications/NotificationBell';
import { ThemeToggle } from '@/components/ThemeToggle';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { ShieldAlert, Shield, Crown } from 'lucide-react';

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

function getGreeting(isRTL: boolean): string {
  const hour = new Date().getHours();
  if (hour < 12) return isRTL ? 'صباح الخير' : 'Good morning';
  if (hour < 17) return isRTL ? 'مساء الخير' : 'Good afternoon';
  return isRTL ? 'مساء الخير' : 'Good evening';
}

interface DashboardLayoutProps {
  children: React.ReactNode;
}

export const DashboardLayout: React.FC<DashboardLayoutProps> = ({ children }) => {
  const { isRTL, language } = useLanguage();
  const { user, loading, profile, isAdmin, isSuperAdmin } = useAuth();
  const location = useLocation();

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

  return (
    <SidebarProvider>
      <div className="min-h-screen flex w-full">
        <DashboardSidebar />
        <div className="flex-1 flex flex-col min-w-0">
          {/* Enhanced Header */}
          <header className="sticky top-0 z-10 border-b border-border/40 bg-card/90 backdrop-blur-xl dark:border-border/20 dark:bg-card/70">
            <div className="flex items-center h-14 sm:h-16 px-3 sm:px-5 gap-3">
              <SidebarTrigger />

              {/* Breadcrumb / Page Title */}
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

                {/* User pill */}
                <div className="hidden sm:flex items-center gap-2 rounded-full border border-border/40 bg-muted/30 py-1 pe-3 ps-1 dark:border-border/20">
                  <Avatar className="h-7 w-7">
                    <AvatarImage src={profile?.avatar_url || undefined} />
                    <AvatarFallback className="bg-accent/15 text-accent text-[10px] font-bold">
                      {initial}
                    </AvatarFallback>
                  </Avatar>
                  <div className="min-w-0">
                    <p className="text-xs font-medium text-foreground truncate max-w-[100px]">
                      {profile?.full_name || (isRTL ? 'مستخدم' : 'User')}
                    </p>
                  </div>
                  {isSuperAdmin ? (
                    <ShieldAlert className="w-3.5 h-3.5 text-purple-500 shrink-0" />
                  ) : isAdmin ? (
                    <Shield className="w-3.5 h-3.5 text-red-500 shrink-0" />
                  ) : profile?.account_type === 'provider' ? (
                    <Crown className="w-3.5 h-3.5 text-accent shrink-0" />
                  ) : null}
                </div>
              </div>
            </div>
          </header>

          <main className="flex-1 p-3 sm:p-4 md:p-6 bg-background overflow-auto">
            {children}
          </main>
        </div>
      </div>
    </SidebarProvider>
  );
};
