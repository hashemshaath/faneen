import { useState } from "react";
import { Link } from "react-router-dom";
import { Search, Megaphone, Scale, Layers, FolderOpen, BookOpen, Menu, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useLanguage } from "@/i18n/LanguageContext";
import { useAuth } from "@/contexts/AuthContext";

export const Navbar = () => {
  const { t, language, setLanguage } = useLanguage();
  const { user, signOut } = useAuth();
  const [mobileOpen, setMobileOpen] = useState(false);

  const navLinks = [
    { to: '/search', label: t('search.page_title'), icon: Search },
    { to: '/offers', label: language === 'ar' ? 'العروض' : 'Offers', icon: Megaphone },
    { to: '/compare', label: language === 'ar' ? 'المقارنة' : 'Compare', icon: Scale },
    { to: '/profile-systems', label: language === 'ar' ? 'القطاعات' : 'Profiles', icon: Layers },
    { to: '/projects', label: language === 'ar' ? 'المشاريع' : 'Projects', icon: FolderOpen },
    { to: '/blog', label: language === 'ar' ? 'المدونة' : 'Blog', icon: BookOpen },
  ];

  return (
    <nav className="fixed top-0 right-0 left-0 z-50 bg-primary/95 backdrop-blur-sm border-b border-gold/20">
      <div className="container flex items-center justify-between h-16">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-gradient-gold flex items-center justify-center">
            <span className="font-heading font-black text-lg text-secondary-foreground">ف</span>
          </div>
          <div>
            <h1 className="font-heading font-bold text-lg text-primary-foreground leading-none">فنيين</h1>
            <span className="text-xs text-gold font-body">Faneen</span>
          </div>
        </div>
        <div className="hidden md:flex items-center gap-6 font-body text-sm text-primary-foreground/80">
          {navLinks.map((link) => (
            <Link key={link.to} to={link.to} className="hover:text-gold transition-colors flex items-center gap-1">
              <link.icon className="w-4 h-4" />
              {link.label}
            </Link>
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
            {mobileOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
          </button>
          {user ? (
            <div className="hidden md:flex items-center gap-2">
              <Link to="/dashboard">
                <Button variant="hero" size="sm">{t('dashboard.overview')}</Button>
              </Link>
              <Button variant="ghost" className="text-primary-foreground/80 hover:text-gold hover:bg-gold/10 text-sm" onClick={signOut}>
                {t('auth.logout')}
              </Button>
            </div>
          ) : (
            <div className="hidden md:flex items-center gap-2">
              <Link to="/auth">
                <Button variant="ghost" className="text-primary-foreground/80 hover:text-gold hover:bg-gold/10 text-sm">
                  {t('nav.login')}
                </Button>
              </Link>
              <Link to="/auth">
                <Button variant="hero" size="sm">
                  {t('nav.register')}
                </Button>
              </Link>
            </div>
          )}
        </div>
      </div>

      {mobileOpen && (
        <div className="md:hidden bg-primary/98 border-t border-gold/20 py-4 px-6 space-y-3 font-body text-sm animate-in slide-in-from-top-2 duration-200">
          {navLinks.map((link) => (
            <Link
              key={link.to}
              to={link.to}
              onClick={() => setMobileOpen(false)}
              className="flex items-center gap-3 text-primary-foreground/80 hover:text-gold transition-colors py-2 border-b border-primary-foreground/10"
            >
              <link.icon className="w-4 h-4" />
              {link.label}
            </Link>
          ))}
          <a href="#categories" onClick={() => setMobileOpen(false)} className="block text-primary-foreground/80 hover:text-gold transition-colors py-2 border-b border-primary-foreground/10">{t('nav.sections')}</a>
          <a href="#features" onClick={() => setMobileOpen(false)} className="block text-primary-foreground/80 hover:text-gold transition-colors py-2 border-b border-primary-foreground/10">{t('nav.features')}</a>
          <a href="#providers" onClick={() => setMobileOpen(false)} className="block text-primary-foreground/80 hover:text-gold transition-colors py-2 border-b border-primary-foreground/10">{t('nav.providers')}</a>
          <div className="pt-3 flex flex-col gap-2">
            {user ? (
              <>
                <Link to="/dashboard" onClick={() => setMobileOpen(false)}>
                  <Button variant="hero" size="sm" className="w-full">{t('dashboard.overview')}</Button>
                </Link>
                <Button variant="ghost" className="text-primary-foreground/80 hover:text-gold hover:bg-gold/10 text-sm w-full" onClick={() => { signOut(); setMobileOpen(false); }}>
                  {t('auth.logout')}
                </Button>
              </>
            ) : (
              <>
                <Link to="/auth" onClick={() => setMobileOpen(false)}>
                  <Button variant="ghost" className="text-primary-foreground/80 hover:text-gold hover:bg-gold/10 text-sm w-full">
                    {t('nav.login')}
                  </Button>
                </Link>
                <Link to="/auth" onClick={() => setMobileOpen(false)}>
                  <Button variant="hero" size="sm" className="w-full">
                    {t('nav.register')}
                  </Button>
                </Link>
              </>
            )}
          </div>
        </div>
      )}
    </nav>
  );
};
