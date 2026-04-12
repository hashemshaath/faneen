import { useState, useEffect, useRef, useCallback } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { PrefetchLink } from "@/components/PrefetchLink";
import { Search, Megaphone, Scale, Layers, FolderOpen, BookOpen, Menu, X, User, LogOut, ShieldAlert, Shield, ChevronDown, Bell } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useLanguage } from "@/i18n/LanguageContext";
import { useAuth } from "@/contexts/AuthContext";
import { ThemeToggle } from "@/components/ThemeToggle";
import { NotificationBell } from "@/components/notifications/NotificationBell";
import { useGlobalSearch } from "@/hooks/useGlobalSearch";

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
        className={`fixed top-0 end-0 start-0 z-50 transition-all duration-500 ${
          scrolled
            ? 'bg-surface-nav/98 backdrop-blur-xl shadow-xl shadow-black/10 border-b border-gold/10'
            : isHome
              ? 'bg-transparent border-b border-transparent'
              : 'bg-surface-nav/95 backdrop-blur-md border-b border-gold/20'
        }`}>
        <div className="container flex items-center justify-between h-16 sm:h-[4.5rem] px-4 sm:px-6">
          {/* Logo */}
          <Link to="/" className="flex items-center gap-2.5 sm:gap-3 group">
            <div className="w-10 h-10 sm:w-11 sm:h-11 rounded-xl bg-gradient-gold flex items-center justify-center shadow-lg shadow-gold/20 group-hover:scale-105 group-hover:shadow-gold/40 transition-all duration-300">
              <span className="font-heading font-black text-lg sm:text-xl text-secondary-foreground">ف</span>
            </div>
            <div className="hidden sm:block">
              <h1 className="font-heading font-bold text-lg text-surface-nav-foreground leading-none">فنيين</h1>
              <span className="text-[10px] text-gold/80 font-body tracking-wider">FANEEN</span>
            </div>
          </Link>

          {/* Desktop Nav */}
          <div className="hidden lg:flex items-center gap-1 font-body text-sm">
            {mainLinks.map((link) => (
              <PrefetchLink
                key={link.to}
                to={link.to}
                className={`relative px-3.5 py-2 rounded-lg transition-all duration-300 flex items-center gap-1.5 ${
                  isActive(link.to) 
                    ? 'text-gold bg-gold/10' 
                    : 'text-surface-nav-foreground/70 hover:text-gold hover:bg-gold/5'
                }`}
              >
                <link.icon className="w-3.5 h-3.5" />
                {link.label}
                {link.to === '/search' && (
                  <kbd className="hidden xl:inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded bg-surface-nav-foreground/10 text-[9px] font-mono text-surface-nav-foreground/40 border border-surface-nav-foreground/10 leading-none">
                    ⌘K
                  </kbd>
                )}
                {isActive(link.to) && (
                  <span className="absolute bottom-0 inset-x-3 h-0.5 bg-gold rounded-full" />
                )}
              </PrefetchLink>
            ))}

            {/* More dropdown */}
            <div className="relative group">
              <button className="px-3.5 py-2 rounded-lg text-surface-nav-foreground/70 hover:text-gold hover:bg-gold/5 transition-all duration-300 flex items-center gap-1.5">
                {isRTL ? 'المزيد' : 'More'}
                <ChevronDown className="w-3.5 h-3.5 transition-transform duration-300 group-hover:rotate-180" />
              </button>
              <div className="absolute top-full start-0 pt-2 opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-300 translate-y-1 group-hover:translate-y-0">
                <div className="bg-surface-nav/98 backdrop-blur-xl border border-gold/15 rounded-xl shadow-2xl shadow-black/20 p-2 min-w-[200px]">
                  {moreLinks.map((link) => (
                    <PrefetchLink
                      key={link.to}
                      to={link.to}
                      className={`flex items-center gap-2.5 px-3.5 py-2.5 rounded-lg transition-all duration-200 ${
                        isActive(link.to)
                          ? 'text-gold bg-gold/10'
                          : 'text-surface-nav-foreground/70 hover:text-gold hover:bg-gold/5'
                      }`}
                    >
                      <div className={`w-7 h-7 rounded-md flex items-center justify-center ${
                        isActive(link.to) ? 'bg-gold/20' : 'bg-gold/10'
                      }`}>
                        <link.icon className="w-3.5 h-3.5 text-gold" />
                      </div>
                      <span className="text-sm font-medium">{link.label}</span>
                    </PrefetchLink>
                  ))}
                  <div className="border-t border-surface-nav-foreground/10 mt-1.5 pt-1.5">
                    <button onClick={() => scrollToSection('#categories')} className="w-full text-start px-3.5 py-2 rounded-lg text-surface-nav-foreground/50 hover:text-gold hover:bg-gold/5 text-sm transition-all">
                      {t('nav.sections')}
                    </button>
                    <button onClick={() => scrollToSection('#features')} className="w-full text-start px-3.5 py-2 rounded-lg text-surface-nav-foreground/50 hover:text-gold hover:bg-gold/5 text-sm transition-all">
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
              className="text-[10px] sm:text-xs text-surface-nav-foreground/50 hover:text-gold transition-colors px-2 py-1.5 rounded-lg border border-surface-nav-foreground/15 hover:border-gold/30 font-medium focus-visible:ring-2 focus-visible:ring-gold focus-visible:outline-none"
              aria-label={language === 'ar' ? 'تبديل اللغة إلى الإنجليزية' : 'Switch language to Arabic'}
            >
              {t('nav.language')}
            </button>

            {user && <NotificationBell />}

            {/* Mobile toggle */}
            <button
              onClick={() => setMobileOpen(!mobileOpen)}
              className="lg:hidden text-surface-nav-foreground/80 hover:text-gold transition-colors p-2.5 rounded-lg hover:bg-gold/5 focus-visible:ring-2 focus-visible:ring-gold focus-visible:outline-none min-w-[44px] min-h-[44px] flex items-center justify-center"
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
                      ? 'bg-purple-500/15 text-purple-400 border border-purple-500/20'
                      : 'bg-red-500/15 text-red-400 border border-red-500/20'
                  }`}>
                    {isSuperAdmin ? <ShieldAlert className="w-3 h-3" /> : <Shield className="w-3 h-3" />}
                    {isSuperAdmin ? 'Super Admin' : 'Admin'}
                  </span>
                )}
                <PrefetchLink to="/dashboard">
                  <Button variant="hero" size="sm" className="gap-1.5 shadow-lg shadow-gold/20 hover:shadow-gold/40 transition-shadow">
                    <User className="w-3.5 h-3.5" />
                    {t('dashboard.overview')}
                  </Button>
                </PrefetchLink>
                <Button variant="ghost" size="sm" className="text-surface-nav-foreground/60 hover:text-gold hover:bg-gold/10" onClick={signOut}>
                  <LogOut className="w-3.5 h-3.5" />
                </Button>
              </div>
            ) : (
              <div className="hidden lg:flex items-center gap-2">
                <PrefetchLink to="/auth?mode=login">
                  <Button variant="ghost" size="sm" className="text-surface-nav-foreground/70 hover:text-gold hover:bg-gold/10 text-sm">
                    {t('nav.login')}
                  </Button>
                </PrefetchLink>
                <PrefetchLink to="/auth?mode=register">
                  <Button variant="hero" size="sm" className="shadow-lg shadow-gold/20 hover:shadow-gold/40 transition-shadow">
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
        className={`fixed top-16 sm:top-[4.5rem] end-0 start-0 z-50 lg:hidden bg-surface-nav/98 backdrop-blur-xl border-t border-gold/10 shadow-2xl shadow-black/20 transition-all duration-400 ease-out ${
          mobileOpen ? 'opacity-100 translate-y-0' : 'opacity-0 -translate-y-3 pointer-events-none'
        }`}
      >
        <div className="max-h-[calc(100vh-4rem)] sm:max-h-[calc(100vh-4.5rem)] overflow-y-auto py-3 px-4 space-y-0.5 font-body text-sm">
          {allLinks.map((link, idx) => (
            <Link
              key={link.to}
              to={link.to}
              onClick={closeMobile}
              className={`flex items-center gap-3 py-3 px-3 rounded-xl transition-all duration-200 ${
                isActive(link.to)
                  ? 'text-gold bg-gold/10'
                  : 'text-surface-nav-foreground/70 hover:text-gold hover:bg-gold/5'
              }`}
            >
              <div className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 ${
                isActive(link.to) ? 'bg-gold/20' : 'bg-surface-nav-foreground/5'
              }`}>
                <link.icon className="w-4 h-4 text-gold" />
              </div>
              <span className="font-medium">{link.label}</span>
            </Link>
          ))}

          <div className="border-t border-surface-nav-foreground/10 pt-2 mt-2 space-y-0.5">
            <button onClick={() => scrollToSection('#categories')} className="block w-full text-start text-surface-nav-foreground/50 hover:text-gold py-2.5 px-3 rounded-lg hover:bg-gold/5 text-sm transition-all">
              {t('nav.sections')}
            </button>
            <button onClick={() => scrollToSection('#features')} className="block w-full text-start text-surface-nav-foreground/50 hover:text-gold py-2.5 px-3 rounded-lg hover:bg-gold/5 text-sm transition-all">
              {t('nav.features')}
            </button>
          </div>

          <div className="pt-3 pb-2 border-t border-surface-nav-foreground/10 flex flex-col gap-2">
            {user ? (
              <>
                {(isAdmin || isSuperAdmin) && (
                  <div className="flex justify-center mb-1">
                    <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold ${
                      isSuperAdmin
                        ? 'bg-purple-500/15 text-purple-400 border border-purple-500/20'
                        : 'bg-red-500/15 text-red-400 border border-red-500/20'
                    }`}>
                      {isSuperAdmin ? <ShieldAlert className="w-3.5 h-3.5" /> : <Shield className="w-3.5 h-3.5" />}
                      {isSuperAdmin ? 'Super Admin' : 'Admin'}
                    </span>
                  </div>
                )}
                <Link to="/dashboard" onClick={closeMobile}>
                  <Button variant="hero" size="sm" className="w-full gap-1.5 shadow-lg shadow-gold/20">
                    <User className="w-3.5 h-3.5" />
                    {t('dashboard.overview')}
                  </Button>
                </Link>
                <Button variant="ghost" className="text-surface-nav-foreground/60 hover:text-gold hover:bg-gold/10 text-sm w-full gap-1.5" onClick={() => { signOut(); closeMobile(); }}>
                  <LogOut className="w-3.5 h-3.5" />
                  {t('auth.logout')}
                </Button>
              </>
            ) : (
              <>
                <Link to="/auth?mode=register" onClick={closeMobile}>
                  <Button variant="hero" size="sm" className="w-full shadow-lg shadow-gold/20">{t('nav.register')}</Button>
                </Link>
                <Link to="/auth?mode=login" onClick={closeMobile}>
                  <Button variant="ghost" className="text-surface-nav-foreground/60 hover:text-gold hover:bg-gold/10 text-sm w-full">
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
