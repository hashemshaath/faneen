import { useState, useEffect, useRef, useCallback } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { PrefetchLink } from "@/components/PrefetchLink";
import { Search, Megaphone, Scale, Layers, FolderOpen, BookOpen, Menu, X, User, LogOut } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useLanguage } from "@/i18n/LanguageContext";
import { useAuth } from "@/contexts/AuthContext";
import { ThemeToggle } from "@/components/ThemeToggle";

export const Navbar = () => {
  const { t, language, setLanguage } = useLanguage();
  const { user, signOut } = useAuth();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const location = useLocation();
  const navigate = useNavigate();
  const menuRef = useRef<HTMLDivElement>(null);

  // Track scroll for shadow
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

  const navLinks = [
    { to: '/search', label: t('search.page_title'), icon: Search },
    { to: '/offers', label: language === 'ar' ? 'العروض' : 'Offers', icon: Megaphone },
    { to: '/compare', label: language === 'ar' ? 'المقارنة' : 'Compare', icon: Scale },
    { to: '/profile-systems', label: language === 'ar' ? 'القطاعات' : 'Profiles', icon: Layers },
    { to: '/projects', label: language === 'ar' ? 'المشاريع' : 'Projects', icon: FolderOpen },
    { to: '/blog', label: language === 'ar' ? 'المدونة' : 'Blog', icon: BookOpen },
  ];

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

  return (
    <>
      <nav className={`fixed top-0 right-0 left-0 z-50 bg-surface-nav/95 backdrop-blur-md border-b border-gold/20 transition-shadow duration-300 ${scrolled ? 'shadow-lg shadow-black/5' : ''}`}>
        <div className="container flex items-center justify-between h-14 sm:h-16 px-3 sm:px-4">
          <Link to="/" className="flex items-center gap-2 sm:gap-3">
            <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-lg bg-gradient-gold flex items-center justify-center">
              <span className="font-heading font-black text-base sm:text-lg text-secondary-foreground">ف</span>
            </div>
            <div>
              <h1 className="font-heading font-bold text-base sm:text-lg text-surface-nav-foreground leading-none">فنيين</h1>
              <span className="text-[10px] sm:text-xs text-gold font-body">Faneen</span>
            </div>
          </Link>

          <div className="hidden lg:flex items-center gap-5 font-body text-sm text-surface-nav-foreground/80">
            {navLinks.map((link) => (
              <PrefetchLink
                key={link.to}
                to={link.to}
                className={`hover:text-gold transition-colors flex items-center gap-1 py-1 border-b-2 ${isActive(link.to) ? 'text-gold border-gold' : 'border-transparent'}`}
              >
                <link.icon className="w-4 h-4" />
                {link.label}
              </PrefetchLink>
            ))}
            <button onClick={() => scrollToSection('#categories')} className="hover:text-gold transition-colors">{t('nav.sections')}</button>
            <button onClick={() => scrollToSection('#features')} className="hover:text-gold transition-colors">{t('nav.features')}</button>
          </div>

          <div className="flex items-center gap-2 sm:gap-3">
            <ThemeToggle variant="navbar" />
            <button
              onClick={() => setLanguage(language === 'ar' ? 'en' : 'ar')}
              className="text-[10px] sm:text-xs text-surface-nav-foreground/60 hover:text-accent transition-colors px-1.5 sm:px-2 py-1 rounded border border-surface-nav-foreground/20"
            >
              {t('nav.language')}
            </button>
            <button
              onClick={() => setMobileOpen(!mobileOpen)}
              className="lg:hidden text-surface-nav-foreground/80 hover:text-gold transition-colors p-1"
              aria-label="Toggle menu"
            >
              <div className="relative w-6 h-6">
                <Menu className={`w-6 h-6 absolute inset-0 transition-all duration-300 ${mobileOpen ? 'opacity-0 rotate-90 scale-75' : 'opacity-100 rotate-0 scale-100'}`} />
                <X className={`w-6 h-6 absolute inset-0 transition-all duration-300 ${mobileOpen ? 'opacity-100 rotate-0 scale-100' : 'opacity-0 -rotate-90 scale-75'}`} />
              </div>
            </button>
            {user ? (
              <div className="hidden lg:flex items-center gap-2">
                <PrefetchLink to="/dashboard">
                  <Button variant="hero" size="sm" className="gap-1.5">
                    <User className="w-3.5 h-3.5" />
                    {t('dashboard.overview')}
                  </Button>
                </PrefetchLink>
                <Button variant="ghost" size="sm" className="text-surface-nav-foreground/80 hover:text-gold hover:bg-gold/10" onClick={signOut}>
                  <LogOut className="w-3.5 h-3.5" />
                </Button>
              </div>
            ) : (
              <div className="hidden lg:flex items-center gap-2">
                <PrefetchLink to="/auth">
                  <Button variant="ghost" size="sm" className="text-surface-nav-foreground/80 hover:text-gold hover:bg-gold/10 text-sm">
                    {t('nav.login')}
                  </Button>
                </PrefetchLink>
                <PrefetchLink to="/auth">
                  <Button variant="hero" size="sm">{t('nav.register')}</Button>
                </PrefetchLink>
              </div>
            )}
          </div>
        </div>
      </nav>

      {/* Mobile overlay */}
      <div
        className={`fixed inset-0 z-40 bg-black/50 backdrop-blur-sm lg:hidden transition-opacity duration-300 ${
          mobileOpen ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none'
        }`}
        onClick={closeMobile}
      />

      {/* Mobile menu */}
      <div
        ref={menuRef}
        className={`fixed top-14 sm:top-16 right-0 left-0 z-50 lg:hidden bg-surface-nav border-t border-gold/20 shadow-2xl transition-all duration-300 ease-out ${
          mobileOpen ? 'opacity-100 translate-y-0' : 'opacity-0 -translate-y-4 pointer-events-none'
        }`}
      >
        <div className="max-h-[calc(100vh-3.5rem)] sm:max-h-[calc(100vh-4rem)] overflow-y-auto py-2 px-4 space-y-0.5 font-body text-sm">
          {navLinks.map((link, idx) => (
            <Link
              key={link.to}
              to={link.to}
              onClick={closeMobile}
              className={`flex items-center gap-3 py-3 px-3 rounded-xl transition-all ${
                isActive(link.to)
                  ? 'text-gold bg-gold/10'
                  : 'text-surface-nav-foreground/80 hover:text-gold hover:bg-gold/5'
              }`}
              style={{ animationDelay: `${idx * 30}ms` }}
            >
              <div className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 ${
                isActive(link.to) ? 'bg-gold/20' : 'bg-gold/10'
              }`}>
                <link.icon className="w-4 h-4 text-gold" />
              </div>
              <span className="font-medium">{link.label}</span>
            </Link>
          ))}

          <div className="border-t border-surface-nav-foreground/10 pt-2 mt-1 space-y-0.5">
            <button onClick={() => scrollToSection('#categories')} className="block w-full text-start text-surface-nav-foreground/60 hover:text-gold transition-colors py-2.5 px-3 rounded-lg hover:bg-gold/5 text-sm">{t('nav.sections')}</button>
            <button onClick={() => scrollToSection('#features')} className="block w-full text-start text-surface-nav-foreground/60 hover:text-gold transition-colors py-2.5 px-3 rounded-lg hover:bg-gold/5 text-sm">{t('nav.features')}</button>
          </div>

          <div className="pt-3 pb-2 border-t border-surface-nav-foreground/10 flex flex-col gap-2">
            {user ? (
              <>
                <Link to="/dashboard" onClick={closeMobile}>
                  <Button variant="hero" size="sm" className="w-full gap-1.5">
                    <User className="w-3.5 h-3.5" />
                    {t('dashboard.overview')}
                  </Button>
                </Link>
                <Button variant="ghost" className="text-surface-nav-foreground/80 hover:text-gold hover:bg-gold/10 text-sm w-full gap-1.5" onClick={() => { signOut(); closeMobile(); }}>
                  <LogOut className="w-3.5 h-3.5" />
                  {t('auth.logout')}
                </Button>
              </>
            ) : (
              <>
                <Link to="/auth" onClick={closeMobile}>
                  <Button variant="hero" size="sm" className="w-full">{t('nav.register')}</Button>
                </Link>
                <Link to="/auth" onClick={closeMobile}>
                  <Button variant="ghost" className="text-surface-nav-foreground/80 hover:text-gold hover:bg-gold/10 text-sm w-full">
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
