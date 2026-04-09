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
import { useLanguage } from '@/i18n/LanguageContext';
import { useAuth } from '@/contexts/AuthContext';
import {
  LayoutDashboard, Wrench, Image, Star, FileText, Shield, Settings, LogOut, Home, Globe, CreditCard, Megaphone, Key, Book, FolderOpen, PenSquare, Layers, MessageSquare, Users, Newspaper, Building2,
} from 'lucide-react';
import { Button } from '@/components/ui/button';

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
  { titleKey: 'nav.projects', url: '/projects', icon: Building2 },
  { titleKey: 'nav.blog', url: '/blog', icon: Newspaper },
  { titleKey: 'dashboard.settings', url: '/dashboard/settings', icon: Settings },
] as const;

const adminItems = [
  { titleKey: 'admin.users', url: '/admin/users', icon: Users },
  { titleKey: 'admin.profile_systems', url: '/dashboard/profile-systems', icon: Layers },
  { titleKey: 'admin.blog', url: '/dashboard/blog', icon: PenSquare },
  { titleKey: 'admin.api_settings', url: '/admin/api-settings', icon: Key },
  { titleKey: 'admin.api_docs', url: '/admin/api-docs', icon: Book },
] as const;

export const DashboardSidebar: React.FC = () => {
  const { state } = useSidebar();
  const collapsed = state === 'collapsed';
  const { t, language, setLanguage, isRTL } = useLanguage();
  const { signOut } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const handleLogout = async () => {
    await signOut();
    navigate('/');
  };

  return (
    <Sidebar collapsible="icon" side={isRTL ? 'right' : 'left'}>
      <SidebarContent>
        {/* Logo */}
        <div className="p-4 flex items-center gap-2 border-b border-border">
          <div className="w-9 h-9 rounded-xl bg-gold flex items-center justify-center text-primary-foreground font-bold text-lg shrink-0">
            ف
          </div>
          {!collapsed && (
            <div>
              <h1 className="font-heading font-bold text-lg leading-none">فنيين</h1>
              <span className="text-[10px] text-gold font-medium">Faneen</span>
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
                      className="hover:bg-muted/50"
                      activeClassName="bg-gold/10 text-gold font-medium"
                    >
                      <item.icon className="h-4 w-4 shrink-0" />
                      {!collapsed && <span className="ms-2">{t(item.titleKey as any)}</span>}
                    </NavLink>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        {/* Admin section */}
        <SidebarGroup>
          <SidebarGroupLabel>{!collapsed ? (isRTL ? 'الإدارة' : 'Admin') : ''}</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {adminItems.map((item) => (
                <SidebarMenuItem key={item.url}>
                  <SidebarMenuButton asChild>
                    <NavLink
                      to={item.url}
                      className="hover:bg-muted/50"
                      activeClassName="bg-gold/10 text-gold font-medium"
                    >
                      <item.icon className="h-4 w-4 shrink-0" />
                      {!collapsed && <span className="ms-2">{
                        isRTL
                          ? (item.titleKey === 'admin.api_settings' ? 'إعدادات API' : item.titleKey === 'admin.api_docs' ? 'توثيق API' : item.titleKey === 'admin.profile_systems' ? 'القطاعات' : item.titleKey === 'admin.users' ? 'المستخدمين' : 'المدونة')
                          : (item.titleKey === 'admin.api_settings' ? 'API Settings' : item.titleKey === 'admin.api_docs' ? 'API Docs' : item.titleKey === 'admin.profile_systems' ? 'Profiles' : item.titleKey === 'admin.users' ? 'Users' : 'Blog')
                      }</span>}
                    </NavLink>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>

      <SidebarFooter className="border-t border-border p-3 space-y-2">
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton asChild>
              <NavLink to="/" className="hover:bg-muted/50" activeClassName="">
                <Home className="h-4 w-4 shrink-0" />
                {!collapsed && <span className="ms-2">{isRTL ? 'الرئيسية' : 'Home'}</span>}
              </NavLink>
            </SidebarMenuButton>
          </SidebarMenuItem>
          <SidebarMenuItem>
            <SidebarMenuButton onClick={() => setLanguage(language === 'ar' ? 'en' : 'ar')}>
              <Globe className="h-4 w-4 shrink-0" />
              {!collapsed && <span className="ms-2">{language === 'ar' ? 'EN' : 'عربي'}</span>}
            </SidebarMenuButton>
          </SidebarMenuItem>
          <SidebarMenuItem>
            <SidebarMenuButton onClick={handleLogout} className="text-destructive hover:text-destructive">
              <LogOut className="h-4 w-4 shrink-0" />
              {!collapsed && <span className="ms-2">{t('auth.logout')}</span>}
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarFooter>
    </Sidebar>
  );
};
