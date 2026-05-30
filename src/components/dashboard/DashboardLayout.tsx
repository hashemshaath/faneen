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
import { updateProfile } from '@/modules/users';
import { uploadAvatar } from '@/modules/files';
import { toast } from 'sonner';
import { BrandLogo } from '@/components/common/BrandLogo';
import { ActiveBusinessSwitcher } from './ActiveBusinessSwitcher';
import { ActiveLocationSwitcher } from './ActiveLocationSwitcher';
import { useDisplayRefId } from '@/hooks/useDisplayRefId';
import { WorkspaceHeader } from '@/components/workspace/shell/WorkspaceHeader';
import { WorkspaceContextBar } from '@/components/workspace/shell/WorkspaceContextBar';
import { WorkspaceSearchLauncher } from '@/components/workspace/shell/WorkspaceSearchLauncher';
import { RecentWorkspaceContext } from '@/components/workspace/shell/RecentWorkspaceContext';
import { CommandPalette } from '@/components/workspace/shell/CommandPalette';
import { RecentWorkspaceFlows } from '@/components/workspace/shell/RecentWorkspaceFlows';
import { MobileWorkspaceActions } from '@/components/workspace/shell/MobileWorkspaceActions';
import { useWorkspaceContext } from '@/hooks/useWorkspaceContext';
import { useWorkspaceState } from '@/hooks/useWorkspaceState';
import { WorkspaceScrollRestoration } from '@/components/workspace/shell/WorkspaceScrollRestoration';
import { useWorkspacePreferences } from '@/hooks/useWorkspacePreferences';
import { useWorkspaceStateSelfHeal } from '@/hooks/useWorkspaceStateSelfHeal';

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
  // Admin
  '/admin': { ar: 'لوحة الإدارة', en: 'Admin' },
  '/admin/operations': { ar: 'العمليات', en: 'Operations' },
  '/admin/operations/console': { ar: 'مركز العمليات', en: 'Operations Console' },
  '/admin/activity-log': { ar: 'سجل النشاط', en: 'Activity Log' },
  '/admin/audit-log': { ar: 'سجل التدقيق الموحّد', en: 'Unified Audit Log' },
  '/admin/cron-runs': { ar: 'تشغيل المهام', en: 'Cron Runs' },
  '/admin/identity': { ar: 'مركز الحسابات', en: 'Account Center' },
  '/admin/users': { ar: 'المستخدمون', en: 'Users' },
  '/admin/businesses': { ar: 'المنشآت والكيانات', en: 'Businesses' },
  '/admin/entity-access-requests': { ar: 'طلبات الانضمام', en: 'Access Requests' },
  '/admin/access-management': { ar: 'إدارة الوصول', en: 'Access Management' },
  '/admin/provider-review': { ar: 'مراجعة المزودين', en: 'Provider Review' },
  '/admin/provider-analytics': { ar: 'تحليلات المزودين', en: 'Provider Analytics' },
  '/admin/provider-landing': { ar: 'صفحة هبوط المزودين', en: 'Provider Landing' },
  '/admin/provider-subscriptions': { ar: 'عضويات المزودين', en: 'Provider Memberships' },
  '/admin/locations': { ar: 'مركز المواقع', en: 'Locations' },
  '/admin/lead-requests': { ar: 'طلبات العملاء', en: 'Customer Requests' },
  '/admin/quote-operations': { ar: 'تشغيل عروض الأسعار', en: 'Quote Operations' },
  '/admin/quote-requests': { ar: 'طلبات الأسعار', en: 'Quote Requests' },
  '/admin/contracts': { ar: 'إدارة العقود', en: 'Contracts Admin' },
  '/admin/contracts/create': { ar: 'إنشاء عقد بالنيابة', en: 'Create on Behalf' },
  '/admin/contracts/analytics': { ar: 'تحليلات العقود', en: 'Contracts Analytics' },
  '/admin/contract-templates': { ar: 'قوالب العقود', en: 'Contract Templates' },
  '/admin/pdf-exports': { ar: 'سجل تصدير العقود', en: 'PDF Export Audit' },
  '/admin/reports': { ar: 'مركز التقارير', en: 'Reports Center' },
  '/admin/kpis': { ar: 'لوحة المؤشرات المتقدمة', en: 'Advanced KPIs' },
  '/admin/memberships': { ar: 'العضويات', en: 'Memberships' },
  '/admin/membership-payments': { ar: 'مدفوعات العضويات', en: 'Membership Payments' },
  '/admin/membership-events': { ar: 'أحداث العضويات', en: 'Membership Events' },
  '/admin/membership-rejections': { ar: 'رفض العضويات', en: 'Membership Rejections' },
  '/admin/contact-messages': { ar: 'مركز التواصل', en: 'Contact Center' },
  '/admin/email-center': { ar: 'مركز البريد', en: 'Email Center' },
  '/admin/email-deliverability': { ar: 'قابلية تسليم البريد', en: 'Email Deliverability' },
  '/admin/categories': { ar: 'التصنيفات', en: 'Categories' },
  '/admin/tags': { ar: 'الوسوم', en: 'Tags' },
  '/admin/private-sectors': { ar: 'القطاعات الخاصة', en: 'Private Sectors' },
  '/admin/sitemap-status': { ar: 'حالة Sitemap', en: 'Sitemap Status' },
  '/admin/site-audit': { ar: 'تدقيق الموقع', en: 'Site Audit' },
  '/admin/sector-seo': { ar: 'SEO القطاعات', en: 'Sector SEO' },
  '/admin/barcode-registry': { ar: 'سجل الباركود', en: 'Barcode Registry' },
  '/admin/client-sites': { ar: 'مواقع العملاء', en: 'Client Sites' },
  '/admin/market-analytics': { ar: 'تحليلات السوق', en: 'Market Analytics' },
  '/admin/ai-center': { ar: 'مركز الذكاء الاصطناعي', en: 'AI Center' },
  '/admin/ab-experiments': { ar: 'تجارب A/B', en: 'A/B Experiments' },
  '/admin/system-settings': { ar: 'إعدادات النظام', en: 'System Settings' },
  '/admin/analytics-settings': { ar: 'إعدادات التحليلات', en: 'Analytics Settings' },
  '/admin/branding': { ar: 'الهوية البصرية', en: 'Branding' },
  '/admin/api-settings': { ar: 'إعدادات API', en: 'API Settings' },
  '/admin/help': { ar: 'مركز المساعدة', en: 'Help Center' },
  '/admin/ref/triage': { ar: 'فحص المراجع المتعدد', en: 'Bulk Reference Triage' },
  '/admin/diagnostics': { ar: 'التشخيص', en: 'Diagnostics' },
  '/admin/showcase': { ar: 'العرض', en: 'Showcase' },
};

const accountTypeLabels: Record<string, { ar: string; en: string }> = {
  individual: { ar: 'مستخدم', en: 'User' },
  business: { ar: 'مزود خدمة', en: 'Provider' },
  company: { ar: 'مزود خدمة', en: 'Provider' },
  provider: { ar: 'مزود خدمة', en: 'Provider' },
  admin: { ar: 'مشرف', en: 'Admin' },
  super_admin: { ar: 'مدير المنصة', en: 'Super Admin' },
};

function getRoleBadge(isSuperAdmin: boolean, isAdmin: boolean, isProvider: boolean, isRTL: boolean) {
  if (isSuperAdmin) return { label: isRTL ? 'مدير المنصة' : 'Super Admin', icon: ShieldAlert, color: 'text-destructive bg-destructive/10' };
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
  const displayRefId = useDisplayRefId();
  const location = useLocation();
  const navigate = useNavigate();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [avatarUploading, setAvatarUploading] = React.useState(false);

  // APP-SHELL-2 — context engine (records last_context/last_module) + recent route trail.
  useWorkspaceContext();
  // CRITICAL-ENTITY-IDENTITY-ACCESS-FIX-1 Phase 1 — reconcile any stale
  // active_entity_id against the user's RLS-scoped accessible entities.
  useWorkspaceStateSelfHeal();
  const ws2 = useWorkspaceState();
  const prefs = useWorkspacePreferences();
  React.useEffect(() => {
    ws2.pushRecentRoute({ path: location.pathname });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [location.pathname]);

  const currentPage = breadcrumbMap[location.pathname];
  const pageTitle = currentPage ? (isRTL ? currentPage.ar : currentPage.en) : '';

  const todayStr = useMemo(() => {
    return new Date().toLocaleDateString(language === 'ar' ? 'ar-SA-u-nu-latn' : 'en-US', {
      weekday: 'long', year: 'numeric', month: 'long', day: 'numeric',
    });
  }, [language]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="animate-pulse">
          <BrandLogo variant="mark" tone="auto" size="loader" alt="قِطاعات" />
        </div>
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/auth" replace />;
  }

  const initial = (profile?.full_name || user.email || '?').charAt(0).toUpperCase();
  const roleBadge = getRoleBadge(isSuperAdmin, isAdmin, isProvider, isRTL);
  const accountLabel = isSuperAdmin
    ? accountTypeLabels.super_admin
    : isAdmin
      ? accountTypeLabels.admin
      : isProvider
        ? accountTypeLabels.provider
        : (accountTypeLabels[profile?.account_type || 'individual'] || accountTypeLabels.individual);

  const handleAvatarUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !profile) return;
    const { validateImageFile, getImageRejectionMessage, ALLOWED_PUBLIC_IMAGE_MIMES } = await import('@/lib/image-validate');
    const { compressImage } = await import('@/lib/image-compress');
    const check = await validateImageFile(file, {
      allowed: [...ALLOWED_PUBLIC_IMAGE_MIMES],
      maxBytes: 2 * 1024 * 1024,
    });
    if (!check.ok) {
      toast.error(getImageRejectionMessage(check.reason ?? 'unsupported_type', isRTL));
      return;
    }
    setAvatarUploading(true);
    try {
      const compressed = await compressImage(file);
      const { publicUrl, error: uploadError } = await uploadAvatar({ userId: user.id, file: compressed });
      if (uploadError) throw uploadError;
      const { error: updateError } = await updateProfile({ userId: user.id, values: { avatar_url: publicUrl } });
      if (updateError) throw updateError;
      await refreshProfile();
      toast.success(isRTL ? 'تم تحديث الصورة الشخصية' : 'Avatar updated');
    } catch (err: unknown) { toast.error(err instanceof Error ? err.message : 'Unknown error'); }
    finally { setAvatarUploading(false); }
  };

  const handleLogout = async () => { await signOut(); navigate('/'); };

  // Admin context: render permanent orange top strip per brand spec §15.
  const isAdminContext = location.pathname.startsWith('/admin');

  // Build a small breadcrumb trail for admin pages so users always see
  // their position within the admin tree, regardless of which page lands them.
  const adminCrumbs = React.useMemo(() => {
    if (!isAdminContext) return [] as Array<{ path: string; label: string }>;
    const parts = location.pathname.split('/').filter(Boolean); // ['admin', 'x', 'y']
    const acc: Array<{ path: string; label: string }> = [];
    let cur = '';
    for (const p of parts) {
      cur += `/${p}`;
      const meta = breadcrumbMap[cur];
      const label = meta
        ? (isRTL ? meta.ar : meta.en)
        : p.replace(/-/g, ' ');
      acc.push({ path: cur, label });
    }
    return acc;
  }, [isAdminContext, location.pathname, isRTL]);

  return (
    <SidebarProvider>
      <div className="min-h-screen flex w-full">
        <DashboardSidebar />
        <div className="flex-1 flex flex-col min-w-0">
          {isAdminContext && (
            <div
              role="presentation"
              aria-hidden="true"
              className="admin-mode-bar"
              title={isRTL ? 'وضع الإدارة' : 'Admin mode'}
            />
          )}
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
                <p className="text-[10px] sm:text-xs text-muted-foreground truncate hidden sm:block">{todayStr}</p>
              </div>

              <div className="flex items-center gap-2 sm:gap-2.5">
                {/* Admins/super-admins must never act as a business owner —
                    hide the active-business switcher to prevent any context
                    leak from the admin identity into a provider scope. */}
                {!isAdmin && !isSuperAdmin && <ActiveBusinessSwitcher />}
                {!isAdmin && !isSuperAdmin && <ActiveLocationSwitcher />}
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
                        <span className="absolute -bottom-0.5 -end-0.5 w-2.5 h-2.5 bg-success border-2 border-card rounded-full" />
                      </div>
                      <div className="hidden sm:flex flex-col items-start min-w-0">
                        <span className="text-xs font-semibold text-foreground truncate max-w-[120px] leading-tight">
                          {profile?.full_name || (isRTL ? 'مستخدم' : 'User')}
                        </span>
                        <span className="text-[10px] text-muted-foreground leading-tight">
                          {isRTL ? accountLabel?.ar : accountLabel?.en}
                        </span>
                      </div>
                      <ChevronDown className="w-3.5 h-3.5 text-muted-foreground hidden sm:block" />
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
                            {profile.phone_verified && <CheckCircle2 className="w-3 h-3 text-success" />}
                          </div>
                        )}
                        {displayRefId && (
                          <div className="flex items-center gap-2 text-[10px] text-muted-foreground">
                            <User className="w-3 h-3 shrink-0" />
                            <span className="tech-content font-mono">{displayRefId}</span>
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
                        <DropdownMenuItem onClick={() => navigate('/dashboard/settings?tab=account')} className="gap-2 py-2.5 rounded-lg cursor-pointer text-warning">
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

          <main
            className={`flex-1 bg-background overflow-auto ${prefs.compact_mode ? 'p-2 sm:p-3 md:p-4' : 'p-3 sm:p-5 md:p-7'}`}
            data-compact-mode={prefs.compact_mode ? 'true' : 'false'}
            data-reduced-motion={prefs.effective_reduced_motion ? 'true' : 'false'}
          >
            <WorkspaceScrollRestoration />
            <WorkspaceHeader rightSlot={<WorkspaceSearchLauncher />} className="-mx-3 sm:-mx-5 md:-mx-7 -mt-3 sm:-mt-5 md:-mt-7 mb-3" />
            {isAdminContext && adminCrumbs.length > 0 && (
              <nav
                aria-label={isRTL ? 'مسار التنقل' : 'Breadcrumb'}
                className="mb-3 text-xs text-muted-foreground flex items-center gap-1.5 flex-wrap"
              >
                {adminCrumbs.map((crumb, idx) => {
                  const isLast = idx === adminCrumbs.length - 1;
                  return (
                    <React.Fragment key={crumb.path}>
                      {isLast ? (
                        <span className="text-foreground font-medium truncate max-w-[180px]" aria-current="page">
                          {crumb.label}
                        </span>
                      ) : (
                        <button
                          type="button"
                          onClick={() => navigate(crumb.path)}
                          className="hover:text-foreground transition-colors truncate max-w-[140px]"
                        >
                          {crumb.label}
                        </button>
                      )}
                      {!isLast && <span className="text-muted-foreground/50">/</span>}
                    </React.Fragment>
                  );
                })}
              </nav>
            )}
            {/* Workspace context bar is provider-oriented (active business/branch
                + recent flows). Admins/super-admins do not operate as a business,
                so the bar would be empty/misleading inside /admin/*. Hide it. */}
            {!isAdminContext && (
              <WorkspaceContextBar>
                <div className="flex items-center gap-3 min-w-0 overflow-hidden">
                  <RecentWorkspaceContext />
                  <RecentWorkspaceFlows />
                </div>
              </WorkspaceContextBar>
            )}
            {children}
            <CommandPalette />
            <MobileWorkspaceActions />
          </main>
        </div>
      </div>
    </SidebarProvider>
  );
};
