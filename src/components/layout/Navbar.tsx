import { useState, useEffect, useRef, useCallback } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { PrefetchLink } from "@/components/PrefetchLink";
import { Search, Megaphone, Scale, Layers, FolderOpen, BookOpen, Menu, X, User, LogOut, ShieldAlert, Shield, ChevronDown, Bell, LifeBuoy } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useLanguage } from "@/i18n/LanguageContext";
import { useAuth } from "@/contexts/AuthContext";
import { ThemeToggle } from "@/components/ThemeToggle";
import { NotificationBell } from "@/components/notifications/NotificationBell";
import { useGlobalSearch } from "@/hooks/useGlobalSearch";
import { BrandLogo } from "@/components/common/BrandLogo";

export const Navbar = () => {
  const { t, language, setLanguage, isRTL } = useLanguage();
  const { user, signOut, isAdmin, isSuperAdmin } = useAuth();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const location = useLocation();
  const navigate = useNavigate();
  const menuRef = useRef<HTMLDivElement>(null);
  useGlobalSearch();

  useEffect(() => {
    const handleScroll = () => setScrolled(window.scrollY > 10);
    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  useEffect(() => { setMobileOpen(false); }, [location.pathname]);

  useEffect(() => {
    if (!mobileOpen) return;
    const handleScroll = () => setMobileOpen(false);
    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, [mobileOpen]);

  useEffect(() => {
    if (!mobileOpen) return;
    const handleClick = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) setMobileOpen(false);
    };
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, [mobileOpen]);

  useEffect(() => {
    document.body.style.overflow = mobileOpen ? 'hidden' : '';
    return () => { document.body.style.overflow = ''; };
  }, [mobileOpen]);

  const mainLinks = [
    { to: '/search', label: t('search.page_title'), icon: Search },
    { to: '/offers', label: language === 'ar' ? 'العروض' : 'Offers', icon: Megaphone },
    { to: '/projects', label: language === 'ar' ? 'المشاريع' : 'Projects', icon: FolderOpen },
  ];

  const moreLinks = [
    { to: '/compare', label: language === 'ar' ? 'المقارنة' : 'Compare', icon: Scale },
    { to: '/profile-systems', label: language === 'ar' ? 'القطاعات' : 'Profiles', icon: Layers },
    { to: '/blog', label: language === 'ar' ? 'المدونة' : 'Blog', icon: BookOpen },
    { to: '/help', label: language === 'ar' ? 'مركز المساعدة' : 'Help Center', icon: LifeBuoy },
  ];

  const allLinks = [...mainLinks, ...moreLinks];

  const closeMobile = useCallback(() => setMobileOpen(false), []);

  const scrollToSection = useCallback((hash: string) => {
    closeMobile();
    if (location.pathname !== '/') {
      navigate('/' + hash);
    } else {
      const el = document.querySelector(hash);
      el?.scrollIntoView({ behavior: 'smooth' });
    }
  }, [location.pathname, navigate, closeMobile]);

  const isActive = (path: string) => location.pathname === path;
  const isHome = location.pathname === '/';

  return (
    <>
      <nav
        role="navigation"
        aria-label={language === 'ar' ? 'التنقل الرئيسي' : 'Main navigation'}
        className={`fixed top-0 end-0 start-0 z-50 transition-all duration-300 bg-white border-b ${
          scrolled ? 'border-[#E2E6EE] shadow-sm' : 'border-transparent'
        }`}>
        <div className="container flex items-center justify-between h-16 sm:h-[4.5rem] px-4 sm:px-6">
          {/* Logo */}
          <Link to="/" aria-label={language === 'ar' ? 'قِطاعات — الصفحة الرئيسية' : 'Qitaat — Home'} className="flex items-center group rounded-xl focus-visible:ring-2 focus-visible:ring-primary focus-visible:outline-none">
            <BrandLogo
              variant="full"
              tone="auto"
              size="navbar"
              priority
              alt={language === 'ar' ? 'قِطاعات — الصفحة الرئيسية' : 'Qitaat — Home'}
              imgClassName="transition-transform duration-300 group-hover:scale-[1.04]"
            />
          </Link>

          {/* Desktop Nav */}
          <div className="hidden lg:flex items-center gap-1 font-body text-sm">
            {mainLinks.map((link) => (
              <PrefetchLink
                key={link.to}
                to={link.to}
                className={`relative px-3.5 py-2 rounded-lg transition-colors duration-200 flex items-center gap-1.5 ${
                  isActive(link.to)
                    ? 'text-primary font-semibold'
                    : 'text-[#1A2230] hover:text-primary'
                }`}
              >
                <link.icon className="w-3.5 h-3.5" />
                {link.label}
                {link.to === '/search' && (
                  <kbd aria-hidden="true" className="hidden xl:inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded bg-muted text-[9px] font-mono text-foreground border border-border leading-none">
                    ⌘K
                  </kbd>
                )}
                {isActive(link.to) && (
                  <span className="absolute -bottom-0.5 inset-x-3 h-0.5 bg-primary rounded-full" />
                )}
              </PrefetchLink>
            ))}

            {/* More dropdown */}
            <div className="relative group">
              <button
                type="button"
                aria-haspopup="menu"
                aria-label={isRTL ? 'قائمة المزيد' : 'More menu'}
                className="px-3.5 py-2 rounded-lg text-[#1A2230] hover:text-primary transition-colors duration-200 flex items-center gap-1.5 focus-visible:ring-2 focus-visible:ring-primary focus-visible:outline-none"
              >
                {isRTL ? 'المزيد' : 'More'}
                <ChevronDown aria-hidden="true" className="w-3.5 h-3.5 transition-transform duration-300 group-hover:rotate-180" />
              </button>
              <div className="absolute top-full start-0 pt-2 opacity-0 invisible group-hover:opacity-100 group-hover:visible group-focus-within:opacity-100 group-focus-within:visible transition-all duration-300 translate-y-1 group-hover:translate-y-0 group-focus-within:translate-y-0">
                <div className="bg-white border border-[#E2E6EE] rounded-xl shadow-lg p-2 min-w-[200px]">
                  {moreLinks.map((link) => (
                    <PrefetchLink
                      key={link.to}
                      to={link.to}
                      className={`flex items-center gap-2.5 px-3.5 py-2.5 rounded-lg transition-colors duration-200 ${
                        isActive(link.to)
                          ? 'text-primary bg-primary-light'
                          : 'text-[#1A2230] hover:text-primary hover:bg-[#F7F8FA]'
                      }`}
                    >
                      <div className={`w-7 h-7 rounded-md flex items-center justify-center ${
                        isActive(link.to) ? 'bg-primary/15' : 'bg-primary-light'
                      }`}>
                        <link.icon className="w-3.5 h-3.5 text-primary" />
                      </div>
                      <span className="text-sm font-medium">{link.label}</span>
                    </PrefetchLink>
                  ))}
                  <div className="border-t border-[#E2E6EE] mt-1.5 pt-1.5">
                    <button onClick={() => scrollToSection('#categories')} className="w-full text-start px-3.5 py-2 rounded-lg text-[#1A2230] hover:text-primary hover:bg-[#F7F8FA] text-sm transition-colors focus-visible:ring-2 focus-visible:ring-primary focus-visible:outline-none">
                      {t('nav.sections')}
                    </button>
                    <button onClick={() => scrollToSection('#features')} className="w-full text-start px-3.5 py-2 rounded-lg text-[#1A2230] hover:text-primary hover:bg-[#F7F8FA] text-sm transition-colors focus-visible:ring-2 focus-visible:ring-primary focus-visible:outline-none">
                      {t('nav.features')}
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Right side */}
          <div className="flex items-center gap-1.5 sm:gap-2.5">
            <ThemeToggle variant="navbar" />
            <button
              onClick={() => setLanguage(language === 'ar' ? 'en' : 'ar')}
              className="text-[10px] sm:text-xs text-[#1A2230] hover:text-primary transition-colors px-2 py-1.5 rounded-lg hover:bg-[#F7F8FA] font-medium focus-visible:ring-2 focus-visible:ring-primary focus-visible:outline-none"
              aria-label={language === 'ar' ? 'تبديل اللغة إلى الإنجليزية' : 'Switch language to Arabic'}
            >
              {t('nav.language')}
            </button>

            {user && <NotificationBell />}

            {/* Mobile toggle */}
            <button
              onClick={() => setMobileOpen(!mobileOpen)}
              className="lg:hidden text-[#1A2230] hover:text-primary transition-colors p-2.5 rounded-lg hover:bg-[#F7F8FA] focus-visible:ring-2 focus-visible:ring-primary focus-visible:outline-none min-w-[44px] min-h-[44px] flex items-center justify-center"
              aria-label={mobileOpen ? (language === 'ar' ? 'إغلاق القائمة' : 'Close menu') : (language === 'ar' ? 'فتح القائمة' : 'Open menu')}
              aria-expanded={mobileOpen}
            >
              <div className="relative w-5 h-5">
                <Menu className={`w-5 h-5 absolute inset-0 transition-all duration-300 ${mobileOpen ? 'opacity-0 rotate-90 scale-75' : 'opacity-100'}`} />
                <X className={`w-5 h-5 absolute inset-0 transition-all duration-300 ${mobileOpen ? 'opacity-100' : 'opacity-0 -rotate-90 scale-75'}`} />
              </div>
            </button>

            {/* Desktop auth */}
            {user ? (
              <div className="hidden lg:flex items-center gap-2">
                {(isAdmin || isSuperAdmin) && (
                  <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-bold tracking-wide ${
                    isSuperAdmin
                      ? 'bg-secondary/15 text-secondary border border-secondary/20'
                      : 'bg-destructive/15 text-destructive border border-destructive/20'
                  }`}>
                    {isSuperAdmin ? <ShieldAlert className="w-3 h-3" /> : <Shield className="w-3 h-3" />}
                    {isSuperAdmin ? 'Super Admin' : 'Admin'}
                  </span>
                )}
                <PrefetchLink to="/dashboard">
                  <Button variant="primary" size="sm" className="gap-1.5">
                    <User className="w-3.5 h-3.5" />
                    {t('dashboard.overview')}
                  </Button>
                </PrefetchLink>
                <Button variant="ghost" size="sm" onClick={signOut}>
                  <LogOut className="w-3.5 h-3.5" />
                </Button>
              </div>
            ) : (
              <div className="hidden lg:flex items-center gap-2">
                <PrefetchLink to="/auth">
                  <Button variant="ghost" size="sm">
                    {t('nav.login')}
                  </Button>
                </PrefetchLink>
                <PrefetchLink to="/auth?mode=register">
                  <Button variant="primary" size="sm">
                    {t('nav.register')}
                  </Button>
                </PrefetchLink>
              </div>
            )}
          </div>
        </div>
      </nav>

      {/* Mobile overlay */}
      <div
        className={`fixed inset-0 z-40 bg-black/60 backdrop-blur-sm lg:hidden transition-opacity duration-300 ${
          mobileOpen ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none'
        }`}
        onClick={closeMobile}
      />

      {/* Mobile menu */}
      <div
        ref={menuRef}
        className={`fixed top-16 sm:top-[4.5rem] end-0 start-0 z-50 lg:hidden bg-white border-t border-[#E2E6EE] shadow-lg transition-all duration-300 ease-out ${
          mobileOpen ? 'opacity-100 translate-y-0' : 'opacity-0 -translate-y-3 pointer-events-none'
        }`}
      >
        <div className="max-h-[calc(100vh-4rem)] sm:max-h-[calc(100vh-4.5rem)] overflow-y-auto py-3 px-4 safe-min-pb space-y-0.5 font-body text-sm">
          {allLinks.map((link, idx) => (
            <Link
              key={link.to}
              to={link.to}
              onClick={closeMobile}
              className={`flex items-center gap-3 min-h-ctrl-md py-3 px-3 rounded-xl transition-colors duration-200 ${
                isActive(link.to)
                  ? 'text-primary bg-primary-light'
                  : 'text-[#1A2230] hover:text-primary hover:bg-[#F7F8FA]'
              }`}
            >
              <div className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 ${
                isActive(link.to) ? 'bg-primary/15' : 'bg-primary-light'
              }`}>
                <link.icon className="ic-sm text-primary" />
              </div>
              <span className="font-medium">{link.label}</span>
            </Link>
          ))}

          <div className="border-t border-[#E2E6EE] pt-2 mt-2 space-y-0.5">
            <button onClick={() => scrollToSection('#categories')} className="block w-full text-start text-[#1A2230] hover:text-primary py-2.5 px-3 rounded-lg hover:bg-[#F7F8FA] text-sm transition-colors focus-visible:ring-2 focus-visible:ring-primary focus-visible:outline-none">
              {t('nav.sections')}
            </button>
            <button onClick={() => scrollToSection('#features')} className="block w-full text-start text-[#1A2230] hover:text-primary py-2.5 px-3 rounded-lg hover:bg-[#F7F8FA] text-sm transition-colors focus-visible:ring-2 focus-visible:ring-primary focus-visible:outline-none">
              {t('nav.features')}
            </button>
          </div>

          <div className="pt-3 pb-2 border-t border-[#E2E6EE] flex flex-col gap-2">
            {user ? (
              <>
                {(isAdmin || isSuperAdmin) && (
                  <div className="flex justify-center mb-1">
                    <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold ${
                      isSuperAdmin
                        ? 'bg-secondary/15 text-secondary border border-secondary/20'
                        : 'bg-destructive/15 text-destructive border border-destructive/20'
                    }`}>
                      {isSuperAdmin ? <ShieldAlert className="w-3.5 h-3.5" /> : <Shield className="w-3.5 h-3.5" />}
                      {isSuperAdmin ? 'Super Admin' : 'Admin'}
                    </span>
                  </div>
                )}
                <Link to="/dashboard" onClick={closeMobile}>
                  <Button variant="primary" size="sm" className="w-full gap-1.5">
                    <User className="w-3.5 h-3.5" />
                    {t('dashboard.overview')}
                  </Button>
                </Link>
                <Button variant="ghost" className="text-sm w-full gap-1.5" onClick={() => { signOut(); closeMobile(); }}>
                  <LogOut className="w-3.5 h-3.5" />
                  {t('auth.logout')}
                </Button>
              </>
            ) : (
              <>
                <Link to="/auth?mode=register" onClick={closeMobile}>
                  <Button variant="primary" size="sm" className="w-full">{t('nav.register')}</Button>
                </Link>
                <Link to="/auth" onClick={closeMobile}>
                  <Button variant="ghost" className="text-sm w-full">
                    {t('nav.login')}
                  </Button>
                </Link>
              </>
            )}
          </div>
        </div>
      </div>
    </>
  );
};
