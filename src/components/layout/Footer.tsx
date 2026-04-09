import { Link } from "react-router-dom";
import { useLanguage } from "@/i18n/LanguageContext";

export const Footer = () => {
  const { t, language } = useLanguage();

  return (
    <footer className="bg-primary py-16">
      <div className="container">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-10 mb-12">
          <div>
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 rounded-lg bg-gradient-gold flex items-center justify-center">
                <span className="font-heading font-black text-lg text-secondary-foreground">ف</span>
              </div>
              <div>
                <h3 className="font-heading font-bold text-lg text-primary-foreground">فنيين</h3>
                <span className="text-xs text-gold font-body">Faneen.com</span>
              </div>
            </div>
            <p className="font-body text-sm text-primary-foreground/50 leading-relaxed">{t('footer.desc')}</p>
          </div>
          <div>
            <h4 className="font-heading font-bold text-primary-foreground mb-4">{t('footer.sections')}</h4>
            <ul className="space-y-2 font-body text-sm text-primary-foreground/50">
              <li><a href="#" className="hover:text-gold transition-colors">{t('cat.aluminum')}</a></li>
              <li><a href="#" className="hover:text-gold transition-colors">{t('cat.iron')}</a></li>
              <li><a href="#" className="hover:text-gold transition-colors">{t('cat.glass')}</a></li>
              <li><a href="#" className="hover:text-gold transition-colors">{t('cat.wood')}</a></li>
            </ul>
          </div>
          <div>
            <h4 className="font-heading font-bold text-primary-foreground mb-4">{t('footer.services')}</h4>
            <ul className="space-y-2 font-body text-sm text-primary-foreground/50">
              <li><Link to="/projects" className="hover:text-gold transition-colors">{language === 'ar' ? 'المشاريع' : 'Projects'}</Link></li>
              <li><Link to="/blog" className="hover:text-gold transition-colors">{language === 'ar' ? 'المدونة' : 'Blog'}</Link></li>
              <li><Link to="/offers" className="hover:text-gold transition-colors">{language === 'ar' ? 'العروض' : 'Offers'}</Link></li>
              <li><a href="#" className="hover:text-gold transition-colors">{t('footer.contracts')}</a></li>
              <li><a href="#" className="hover:text-gold transition-colors">{t('footer.installments')}</a></li>
              <li><a href="#" className="hover:text-gold transition-colors">{t('footer.warranties')}</a></li>
            </ul>
          </div>
          <div>
            <h4 className="font-heading font-bold text-primary-foreground mb-4">{t('footer.contact')}</h4>
            <ul className="space-y-2 font-body text-sm text-primary-foreground/50">
              <li><a href="#" className="hover:text-gold transition-colors">{t('footer.support')}</a></li>
              <li><a href="#" className="hover:text-gold transition-colors">{t('footer.partnerships')}</a></li>
              <li><a href="#" className="hover:text-gold transition-colors">{t('footer.privacy')}</a></li>
              <li><a href="#" className="hover:text-gold transition-colors">{t('footer.terms')}</a></li>
            </ul>
          </div>
        </div>
        <div className="border-t border-primary-foreground/10 pt-6 text-center">
          <p className="font-body text-xs text-primary-foreground/30">{t('footer.rights')}</p>
        </div>
      </div>
    </footer>
  );
};
