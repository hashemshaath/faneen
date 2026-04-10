import React from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarFooter,
  useSidebar,
} from '@/components/ui/sidebar';
import { NavLink } from '@/components/NavLink';
import { Separator } from '@/components/ui/separator';
import { useLanguage } from '@/i18n/LanguageContext';
import { useAuth } from '@/contexts/AuthContext';
import {
  LayoutDashboard, Wrench, Image, Star, FileText, Shield, Settings, LogOut, Home, Globe, CreditCard, Megaphone, Key, Book, FolderOpen, PenSquare, Layers, MessageSquare, Users, Newspaper, Building2, Bell, Activity, Bookmark, ShieldAlert, Crown, FolderTree, Tags,
} from 'lucide-react';

const menuItems = [
  { titleKey: 'dashboard.overview', url: '/dashboard', icon: LayoutDashboard },
  { titleKey: 'dashboard.services', url: '/dashboard/services', icon: Wrench },
  { titleKey: 'dashboard.portfolio', url: '/dashboard/portfolio', icon: Image },
  { titleKey: 'dashboard.reviews', url: '/dashboard/reviews', icon: Star },
  { titleKey: 'dashboard.contracts', url: '/dashboard/contracts', icon: FileText },
  { titleKey: 'dashboard.warranties', url: '/dashboard/warranties', icon: Shield },
  { titleKey: 'dashboard.installments', url: '/dashboard/installments', icon: CreditCard },
  { titleKey: 'dashboard.messages', url: '/dashboard/messages', icon: MessageSquare },
  { titleKey: 'dashboard.promotions', url: '/dashboard/promotions', icon: Megaphone },
  { titleKey: 'dashboard.projects', url: '/dashboard/projects', icon: FolderOpen },
  { titleKey: 'nav.notifications', url: '/notifications', icon: Bell },
  { titleKey: 'dashboard.bookmarks', url: '/dashboard/bookmarks', icon: Bookmark },
  { titleKey: 'dashboard.operations', url: '/dashboard/operations', icon: Activity },
  { titleKey: 'dashboard.membership', url: '/membership', icon: Crown },
  { titleKey: 'nav.projects', url: '/projects', icon: Building2 },
  { titleKey: 'nav.blog', url: '/blog', icon: Newspaper },
  { titleKey: 'dashboard.settings', url: '/dashboard/settings', icon: Settings },
] as const;

const adminItems = [
  { titleKey: 'admin.users', url: '/admin/users', icon: Users, superAdminOnly: true },
  { titleKey: 'admin.system_settings', url: '/admin/system-settings', icon: ShieldAlert, superAdminOnly: true },
  { titleKey: 'admin.businesses', url: '/admin/businesses', icon: Building2, superAdminOnly: false },
  { titleKey: 'admin.categories', url: '/admin/categories', icon: FolderTree, superAdminOnly: false },
  { titleKey: 'admin.tags', url: '/admin/tags', icon: Tags, superAdminOnly: false },
  { titleKey: 'admin.memberships', url: '/admin/memberships', icon: Crown, superAdminOnly: false },
  { titleKey: 'admin.profile_systems', url: '/dashboard/profile-systems', icon: Layers, superAdminOnly: false },
  { titleKey: 'admin.blog', url: '/dashboard/blog', icon: PenSquare, superAdminOnly: false },
  { titleKey: 'admin.api_settings', url: '/admin/api-settings', icon: Key, superAdminOnly: false },
  { titleKey: 'admin.api_docs', url: '/admin/api-docs', icon: Book, superAdminOnly: false },
  { titleKey: 'admin.activity_log', url: '/admin/activity-log', icon: Activity, superAdminOnly: false },
] as const;

const getAdminLabel = (titleKey: string, isRTL: boolean) => {
  const map: Record<string, { ar: string; en: string }> = {
    'admin.api_settings': { ar: 'إعدادات API', en: 'API Settings' },
    'admin.api_docs': { ar: 'توثيق API', en: 'API Docs' },
    'admin.profile_systems': { ar: 'القطاعات', en: 'Profiles' },
    'admin.users': { ar: 'المستخدمين', en: 'Users' },
    'admin.blog': { ar: 'المدونة', en: 'Blog' },
    'admin.activity_log': { ar: 'سجل النشاط', en: 'Activity Log' },
    'admin.system_settings': { ar: 'إعدادات النظام', en: 'System Settings' },
    'admin.businesses': { ar: 'الأعمال', en: 'Businesses' },
    'admin.categories': { ar: 'التصنيفات', en: 'Categories' },
    'admin.tags': { ar: 'الوسوم', en: 'Tags' },
    'admin.memberships': { ar: 'العضويات', en: 'Memberships' },
  };
  const entry = map[titleKey];
  return entry ? (isRTL ? entry.ar : entry.en) : titleKey;
};

export const DashboardSidebar: React.FC = () => {
  const { state, setOpenMobile, isMobile } = useSidebar();
  const collapsed = state === 'collapsed';
  const { t, language, setLanguage, isRTL } = useLanguage();
  const { signOut, isAdmin, isSuperAdmin } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const closeMobile = () => { if (isMobile) setOpenMobile(false); };

  const handleLogout = async () => {
    await signOut();
    navigate('/');
  };

  return (
    <Sidebar collapsible="icon" side={isRTL ? 'right' : 'left'}>
      <SidebarContent>
        {/* Logo */}
        <div className="p-4 flex items-center gap-2.5 border-b border-sidebar-border">
          <div className="w-9 h-9 rounded-xl bg-accent flex items-center justify-center text-accent-foreground font-bold text-lg shrink-0 shadow-sm">
            ف
          </div>
          {!collapsed && (
            <div className="min-w-0">
              <h1 className="font-heading font-bold text-lg leading-none text-sidebar-foreground">فنيين</h1>
              <span className="text-[10px] text-accent font-medium">Faneen</span>
            </div>
          )}
        </div>

        <SidebarGroup>
          <SidebarGroupLabel>{!collapsed ? (isRTL ? 'القائمة الرئيسية' : 'Main Menu') : ''}</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {menuItems.map((item) => (
                <SidebarMenuItem key={item.url}>
                  <SidebarMenuButton asChild>
                    <NavLink
                      to={item.url}
                      end={item.url === '/dashboard'}
                      className="hover:bg-sidebar-accent/60 rounded-lg transition-colors"
                      activeClassName="bg-accent/15 text-accent font-medium dark:bg-accent/20"
                      onClick={closeMobile}
                    >
                      <item.icon className="h-4 w-4 shrink-0" />
                      {!collapsed && <span className="ms-2 truncate">{t(item.titleKey as any)}</span>}
                    </NavLink>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        {/* Admin section - only visible to admins */}
        {isAdmin && (
          <SidebarGroup>
            <SidebarGroupLabel>
              {!collapsed ? (isRTL 
                ? (isSuperAdmin ? '🛡️ الإدارة العليا' : 'الإدارة') 
                : (isSuperAdmin ? '🛡️ Super Admin' : 'Admin')
              ) : ''}
            </SidebarGroupLabel>
            <SidebarGroupContent>
              <SidebarMenu>
                {adminItems.filter(item => !item.superAdminOnly || isSuperAdmin).map((item) => (
                  <SidebarMenuItem key={item.url}>
                    <SidebarMenuButton asChild>
                      <NavLink
                        to={item.url}
                        className="hover:bg-sidebar-accent/60 rounded-lg transition-colors"
                        activeClassName="bg-accent/15 text-accent font-medium dark:bg-accent/20"
                        onClick={closeMobile}
                      >
                        <item.icon className="h-4 w-4 shrink-0" />
                        {!collapsed && <span className="ms-2 truncate">{getAdminLabel(item.titleKey, isRTL)}</span>}
                      </NavLink>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                ))}
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
        )}
      </SidebarContent>

      <SidebarFooter className="border-t border-sidebar-border p-3 space-y-1">
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton asChild>
              <NavLink to="/" className="hover:bg-sidebar-accent/60 rounded-lg" activeClassName="" onClick={closeMobile}>
                <Home className="h-4 w-4 shrink-0" />
                {!collapsed && <span className="ms-2">{isRTL ? 'الرئيسية' : 'Home'}</span>}
              </NavLink>
            </SidebarMenuButton>
          </SidebarMenuItem>
          <SidebarMenuItem>
            <SidebarMenuButton onClick={() => setLanguage(language === 'ar' ? 'en' : 'ar')} className="hover:bg-sidebar-accent/60 rounded-lg">
              <Globe className="h-4 w-4 shrink-0" />
              {!collapsed && <span className="ms-2">{language === 'ar' ? 'EN' : 'عربي'}</span>}
            </SidebarMenuButton>
          </SidebarMenuItem>
          <SidebarMenuItem>
            <SidebarMenuButton onClick={handleLogout} className="text-destructive hover:text-destructive hover:bg-destructive/10 dark:hover:bg-destructive/20 rounded-lg">
              <LogOut className="h-4 w-4 shrink-0" />
              {!collapsed && <span className="ms-2">{t('auth.logout')}</span>}
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarFooter>
    </Sidebar>
  );
};
