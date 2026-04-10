import React from 'react';
import { useNavigate } from 'react-router-dom';
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
import { useLanguage } from '@/i18n/LanguageContext';
import { useAuth } from '@/contexts/AuthContext';
import { Separator } from '@/components/ui/separator';
import {
  LayoutDashboard, Wrench, Image, Star, FileText, Shield, Settings, LogOut,
  Home, Globe, CreditCard, Megaphone, Key, Book, FolderOpen, PenSquare,
  Layers, MessageSquare, Users, Newspaper, Building2, Bell, Activity,
  Bookmark, ShieldAlert, Crown, FolderTree, Tags, UserCog, Database,
  BarChart3, Cog, Eye, TrendingUp, AlertTriangle, Server,
} from 'lucide-react';

interface MenuItem {
  label: { ar: string; en: string };
  url: string;
  icon: React.ElementType;
  end?: boolean;
  superAdminOnly?: boolean;
}

interface MenuGroup {
  groupLabel: { ar: string; en: string };
  icon: React.ElementType;
  items: MenuItem[];
}

// ══════════════════════════════════════════
//  مزود الخدمة — Provider Menu
// ══════════════════════════════════════════
const providerGroups: MenuGroup[] = [
  {
    groupLabel: { ar: 'الرئيسية', en: 'Main' },
    icon: LayoutDashboard,
    items: [
      { label: { ar: 'نظرة عامة', en: 'Overview' }, url: '/dashboard', icon: LayoutDashboard, end: true },
    ],
  },
  {
    groupLabel: { ar: 'إدارة الأعمال', en: 'Business' },
    icon: Wrench,
    items: [
      { label: { ar: 'الخدمات', en: 'Services' }, url: '/dashboard/services', icon: Wrench },
      { label: { ar: 'معرض الأعمال', en: 'Portfolio' }, url: '/dashboard/portfolio', icon: Image },
      { label: { ar: 'المشاريع', en: 'Projects' }, url: '/dashboard/projects', icon: FolderOpen },
      { label: { ar: 'العروض', en: 'Promotions' }, url: '/dashboard/promotions', icon: Megaphone },
    ],
  },
  {
    groupLabel: { ar: 'العقود والمالية', en: 'Contracts & Finance' },
    icon: FileText,
    items: [
      { label: { ar: 'العقود', en: 'Contracts' }, url: '/dashboard/contracts', icon: FileText },
      { label: { ar: 'الضمانات', en: 'Warranties' }, url: '/dashboard/warranties', icon: Shield },
      { label: { ar: 'الأقساط', en: 'Installments' }, url: '/dashboard/installments', icon: CreditCard },
    ],
  },
  {
    groupLabel: { ar: 'التواصل', en: 'Communication' },
    icon: MessageSquare,
    items: [
      { label: { ar: 'الرسائل', en: 'Messages' }, url: '/dashboard/messages', icon: MessageSquare },
      { label: { ar: 'التقييمات', en: 'Reviews' }, url: '/dashboard/reviews', icon: Star },
      { label: { ar: 'العمليات', en: 'Operations' }, url: '/dashboard/operations', icon: Activity },
    ],
  },
  {
    groupLabel: { ar: 'الحساب', en: 'Account' },
    icon: Settings,
    items: [
      { label: { ar: 'العضوية', en: 'Membership' }, url: '/membership', icon: Crown },
      { label: { ar: 'الإشعارات', en: 'Notifications' }, url: '/notifications', icon: Bell },
      { label: { ar: 'الإعدادات', en: 'Settings' }, url: '/dashboard/settings', icon: Settings },
    ],
  },
];

// ══════════════════════════════════════════
//  المستخدم العادي — User Menu
// ══════════════════════════════════════════
const userGroups: MenuGroup[] = [
  {
    groupLabel: { ar: 'الرئيسية', en: 'Main' },
    icon: LayoutDashboard,
    items: [
      { label: { ar: 'نظرة عامة', en: 'Overview' }, url: '/dashboard', icon: LayoutDashboard, end: true },
    ],
  },
  {
    groupLabel: { ar: 'نشاطي', en: 'My Activity' },
    icon: FileText,
    items: [
      { label: { ar: 'العقود', en: 'Contracts' }, url: '/dashboard/contracts', icon: FileText },
      { label: { ar: 'الرسائل', en: 'Messages' }, url: '/dashboard/messages', icon: MessageSquare },
      { label: { ar: 'المفضلة', en: 'Bookmarks' }, url: '/dashboard/bookmarks', icon: Bookmark },
    ],
  },
  {
    groupLabel: { ar: 'استكشاف', en: 'Explore' },
    icon: Building2,
    items: [
      { label: { ar: 'المشاريع', en: 'Projects' }, url: '/projects', icon: Building2 },
      { label: { ar: 'المدونة', en: 'Blog' }, url: '/blog', icon: Newspaper },
    ],
  },
  {
    groupLabel: { ar: 'الحساب', en: 'Account' },
    icon: Settings,
    items: [
      { label: { ar: 'الإشعارات', en: 'Notifications' }, url: '/notifications', icon: Bell },
      { label: { ar: 'الإعدادات', en: 'Settings' }, url: '/dashboard/settings', icon: Settings },
    ],
  },
];

// ══════════════════════════════════════════
//  المشرف — Admin-Only Base Menu
//  (replaces user/provider base when admin)
// ══════════════════════════════════════════
const adminBaseGroups: MenuGroup[] = [
  {
    groupLabel: { ar: 'لوحة المراقبة', en: 'Dashboard' },
    icon: LayoutDashboard,
    items: [
      { label: { ar: 'نظرة عامة', en: 'Overview' }, url: '/dashboard', icon: LayoutDashboard, end: true },
      { label: { ar: 'سجل النشاط', en: 'Activity Log' }, url: '/admin/activity-log', icon: BarChart3 },
    ],
  },
  {
    groupLabel: { ar: 'إدارة المستخدمين', en: 'User Management' },
    icon: UserCog,
    items: [
      { label: { ar: 'المستخدمين', en: 'Users' }, url: '/admin/users', icon: Users, superAdminOnly: true },
      { label: { ar: 'المنشآت', en: 'Businesses' }, url: '/admin/businesses', icon: Building2 },
      { label: { ar: 'كل المحادثات', en: 'All Conversations' }, url: '/dashboard/messages', icon: MessageSquare, superAdminOnly: true },
    ],
  },
  {
    groupLabel: { ar: 'إدارة المحتوى', en: 'Content Management' },
    icon: Database,
    items: [
      { label: { ar: 'التصنيفات', en: 'Categories' }, url: '/admin/categories', icon: FolderTree },
      { label: { ar: 'الوسوم', en: 'Tags' }, url: '/admin/tags', icon: Tags },
      { label: { ar: 'المدونة', en: 'Blog Editor' }, url: '/dashboard/blog', icon: PenSquare },
      { label: { ar: 'القطاعات', en: 'Profile Systems' }, url: '/dashboard/profile-systems', icon: Layers },
    ],
  },
  {
    groupLabel: { ar: 'المالية والاشتراكات', en: 'Finance & Subscriptions' },
    icon: Crown,
    items: [
      { label: { ar: 'العضويات', en: 'Memberships' }, url: '/admin/memberships', icon: Crown },
      { label: { ar: 'العقود', en: 'Contracts' }, url: '/dashboard/contracts', icon: FileText },
    ],
  },
  {
    groupLabel: { ar: 'النظام والأمان', en: 'System & Security' },
    icon: Cog,
    items: [
      { label: { ar: 'إعدادات النظام', en: 'System Settings' }, url: '/admin/system-settings', icon: ShieldAlert, superAdminOnly: true },
      { label: { ar: 'إعدادات API', en: 'API Settings' }, url: '/admin/api-settings', icon: Key },
      { label: { ar: 'توثيق API', en: 'API Docs' }, url: '/admin/api-docs', icon: Book },
    ],
  },
  {
    groupLabel: { ar: 'الحساب', en: 'Account' },
    icon: Settings,
    items: [
      { label: { ar: 'الإشعارات', en: 'Notifications' }, url: '/notifications', icon: Bell },
      { label: { ar: 'الإعدادات', en: 'Settings' }, url: '/dashboard/settings', icon: Settings },
    ],
  },
];

// ══════════════════════════════════════════
//  Render helpers
// ══════════════════════════════════════════
const RenderMenu: React.FC<{
  items: MenuItem[];
  collapsed: boolean;
  isRTL: boolean;
  closeMobile: () => void;
}> = ({ items, collapsed, isRTL, closeMobile }) => (
  <SidebarMenu>
    {items.map((item) => (
      <SidebarMenuItem key={item.url + item.label.en}>
        <SidebarMenuButton asChild>
          <NavLink
            to={item.url}
            end={item.end}
            className="hover:bg-sidebar-accent/60 rounded-lg transition-colors"
            activeClassName="bg-accent/15 text-accent font-medium dark:bg-accent/20"
            onClick={closeMobile}
          >
            <item.icon className="h-4 w-4 shrink-0" />
            {!collapsed && <span className="ms-2 truncate">{isRTL ? item.label.ar : item.label.en}</span>}
          </NavLink>
        </SidebarMenuButton>
      </SidebarMenuItem>
    ))}
  </SidebarMenu>
);

const RenderGroups: React.FC<{
  groups: MenuGroup[];
  collapsed: boolean;
  isRTL: boolean;
  closeMobile: () => void;
  isSuperAdmin?: boolean;
}> = ({ groups, collapsed, isRTL, closeMobile, isSuperAdmin = false }) => (
  <>
    {groups.map((group) => {
      const visibleItems = group.items.filter(item => !item.superAdminOnly || isSuperAdmin);
      if (visibleItems.length === 0) return null;
      return (
        <SidebarGroup key={group.groupLabel.en}>
          <SidebarGroupLabel>
            {!collapsed ? (
              <span className="flex items-center gap-1.5">
                <group.icon className="w-3 h-3 opacity-60" />
                {isRTL ? group.groupLabel.ar : group.groupLabel.en}
              </span>
            ) : ''}
          </SidebarGroupLabel>
          <SidebarGroupContent>
            <RenderMenu items={visibleItems} collapsed={collapsed} isRTL={isRTL} closeMobile={closeMobile} />
          </SidebarGroupContent>
        </SidebarGroup>
      );
    })}
  </>
);

export const DashboardSidebar: React.FC = () => {
  const { state, setOpenMobile, isMobile } = useSidebar();
  const collapsed = state === 'collapsed';
  const { language, setLanguage, isRTL } = useLanguage();
  const { signOut, isAdmin, isSuperAdmin, profile } = useAuth();
  const navigate = useNavigate();

  const closeMobile = () => { if (isMobile) setOpenMobile(false); };
  const handleLogout = async () => { await signOut(); navigate('/'); };

  const isProvider = profile?.account_type === 'provider';

  // Admin gets admin-specific base menu, not user/provider menu
  const baseGroups = isAdmin ? adminBaseGroups : (isProvider ? providerGroups : userGroups);

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

        {/* Admin badge */}
        {isAdmin && !collapsed && (
          <div className="mx-3 mt-2 mb-1 px-3 py-1.5 rounded-lg bg-accent/10 dark:bg-accent/15 border border-accent/20">
            <p className="text-[10px] font-bold text-accent flex items-center gap-1.5">
              <ShieldAlert className="w-3 h-3" />
              {isRTL
                ? (isSuperAdmin ? 'لوحة الإدارة العليا' : 'لوحة الإدارة')
                : (isSuperAdmin ? 'Super Admin Panel' : 'Admin Panel')}
            </p>
          </div>
        )}
        {isAdmin && collapsed && (
          <div className="flex justify-center mt-2 mb-1">
            <ShieldAlert className="w-4 h-4 text-accent" />
          </div>
        )}

        {/* ─── Role-based menu ─── */}
        <RenderGroups groups={baseGroups} collapsed={collapsed} isRTL={isRTL} closeMobile={closeMobile} isSuperAdmin={isSuperAdmin} />
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
              {!collapsed && <span className="ms-2">{isRTL ? 'تسجيل الخروج' : 'Logout'}</span>}
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarFooter>
    </Sidebar>
  );
};
