import { useState, useEffect, useRef, useCallback } from "react";
import { Link, useLocation } from "react-router-dom";
import { PrefetchLink } from "@/components/PrefetchLink";
import { Search, Megaphone, Scale, Layers, FolderOpen, BookOpen, Menu, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useLanguage } from "@/i18n/LanguageContext";
import { useAuth } from "@/contexts/AuthContext";

export const Navbar = () => {
  const { t, language, setLanguage } = useLanguage();
  const { user, signOut } = useAuth();
  const [mobileOpen, setMobileOpen] = useState(false);
  const location = useLocation();
  const menuRef = useRef<HTMLDivElement>(null);

  // Close on route change
  useEffect(() => {
    setMobileOpen(false);
  }, [location.pathname]);

  // Close on scroll
  useEffect(() => {
    if (!mobileOpen) return;
    const handleScroll = () => setMobileOpen(false);
    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, [mobileOpen]);

  // Close on outside click
  useEffect(() => {
    if (!mobileOpen) return;
    const handleClick = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setMobileOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, [mobileOpen]);

  // Prevent body scroll when menu open
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

  return (
    <>
      <nav className="fixed top-0 right-0 left-0 z-50 bg-primary/95 backdrop-blur-sm border-b border-gold/20">
        <div className="container flex items-center justify-between h-16">
          <Link to="/" className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-gradient-gold flex items-center justify-center">
              <span className="font-heading font-black text-lg text-secondary-foreground">ف</span>
            </div>
            <div>
              <h1 className="font-heading font-bold text-lg text-primary-foreground leading-none">فنيين</h1>
              <span className="text-xs text-gold font-body">Faneen</span>
            </div>
          </Link>
          <div className="hidden md:flex items-center gap-6 font-body text-sm text-primary-foreground/80">
            {navLinks.map((link) => (
              <PrefetchLink key={link.to} to={link.to} className="hover:text-gold transition-colors flex items-center gap-1">
                <link.icon className="w-4 h-4" />
                {link.label}
              </PrefetchLink>
            ))}
            <a href="#categories" className="hover:text-gold transition-colors">{t('nav.sections')}</a>
            <a href="#features" className="hover:text-gold transition-colors">{t('nav.features')}</a>
            <a href="#providers" className="hover:text-gold transition-colors">{t('nav.providers')}</a>
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={() => setLanguage(language === 'ar' ? 'en' : 'ar')}
              className="text-xs text-primary-foreground/60 hover:text-gold transition-colors px-2 py-1 rounded border border-primary-foreground/20"
            >
              {t('nav.language')}
            </button>
            <button
              onClick={() => setMobileOpen(!mobileOpen)}
              className="md:hidden text-primary-foreground/80 hover:text-gold transition-colors p-1"
              aria-label="Toggle menu"
            >
              <div className="relative w-6 h-6">
                <Menu className={`w-6 h-6 absolute inset-0 transition-all duration-300 ${mobileOpen ? 'opacity-0 rotate-90 scale-75' : 'opacity-100 rotate-0 scale-100'}`} />
                <X className={`w-6 h-6 absolute inset-0 transition-all duration-300 ${mobileOpen ? 'opacity-100 rotate-0 scale-100' : 'opacity-0 -rotate-90 scale-75'}`} />
              </div>
            </button>
            {user ? (
              <div className="hidden md:flex items-center gap-2">
                <PrefetchLink to="/dashboard">
                  <Button variant="hero" size="sm">{t('dashboard.overview')}</Button>
                </PrefetchLink>
                <Button variant="ghost" className="text-primary-foreground/80 hover:text-gold hover:bg-gold/10 text-sm" onClick={signOut}>
                  {t('auth.logout')}
                </Button>
              </div>
            ) : (
              <div className="hidden md:flex items-center gap-2">
                <PrefetchLink to="/auth">
                  <Button variant="ghost" className="text-primary-foreground/80 hover:text-gold hover:bg-gold/10 text-sm">
                    {t('nav.login')}
                  </Button>
                </PrefetchLink>
                <PrefetchLink to="/auth">
                  <Button variant="hero" size="sm">
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
        className={`fixed inset-0 z-40 bg-black/40 backdrop-blur-sm md:hidden transition-opacity duration-300 ${
          mobileOpen ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none'
        }`}
        onClick={closeMobile}
      />

      {/* Mobile menu */}
      <div
        ref={menuRef}
        className={`fixed top-16 right-0 left-0 z-50 md:hidden bg-primary border-t border-gold/20 shadow-2xl transition-all duration-300 ease-out ${
          mobileOpen
            ? 'opacity-100 translate-y-0'
            : 'opacity-0 -translate-y-4 pointer-events-none'
        }`}
      >
        <div className="max-h-[calc(100vh-4rem)] overflow-y-auto py-3 px-5 space-y-1 font-body text-sm">
          {navLinks.map((link, idx) => (
            <Link
              key={link.to}
              to={link.to}
              onClick={closeMobile}
              className="flex items-center gap-3 text-primary-foreground/80 hover:text-gold hover:bg-gold/5 transition-all py-3 px-3 rounded-lg border-b border-primary-foreground/5"
              style={{ animationDelay: `${idx * 40}ms` }}
            >
              <div className="w-8 h-8 rounded-lg bg-gold/10 flex items-center justify-center shrink-0">
                <link.icon className="w-4 h-4 text-gold" />
              </div>
              {link.label}
            </Link>
          ))}

          <div className="border-t border-primary-foreground/10 pt-2 mt-2 space-y-1">
            <a href="#categories" onClick={closeMobile} className="block text-primary-foreground/60 hover:text-gold transition-colors py-2 px-3 rounded-lg hover:bg-gold/5">{t('nav.sections')}</a>
            <a href="#features" onClick={closeMobile} className="block text-primary-foreground/60 hover:text-gold transition-colors py-2 px-3 rounded-lg hover:bg-gold/5">{t('nav.features')}</a>
            <a href="#providers" onClick={closeMobile} className="block text-primary-foreground/60 hover:text-gold transition-colors py-2 px-3 rounded-lg hover:bg-gold/5">{t('nav.providers')}</a>
          </div>

          <div className="pt-3 border-t border-primary-foreground/10 flex flex-col gap-2">
            {user ? (
              <>
                <Link to="/dashboard" onClick={closeMobile}>
                  <Button variant="hero" size="sm" className="w-full">{t('dashboard.overview')}</Button>
                </Link>
                <Button variant="ghost" className="text-primary-foreground/80 hover:text-gold hover:bg-gold/10 text-sm w-full" onClick={() => { signOut(); closeMobile(); }}>
                  {t('auth.logout')}
                </Button>
              </>
            ) : (
              <>
                <Link to="/auth" onClick={closeMobile}>
                  <Button variant="ghost" className="text-primary-foreground/80 hover:text-gold hover:bg-gold/10 text-sm w-full">
                    {t('nav.login')}
                  </Button>
                </Link>
                <Link to="/auth" onClick={closeMobile}>
                  <Button variant="hero" size="sm" className="w-full">
                    {t('nav.register')}
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
