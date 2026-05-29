import { useLanguage } from "@/i18n/LanguageContext";
import { PrefetchLink } from "@/components/PrefetchLink";

interface LinkItem {
  label: string;
  to: string;
}

interface FooterLinkColumnProps {
  title: string;
  links: LinkItem[];
}

const FooterLinkColumn = ({ title, links }: FooterLinkColumnProps) => (
  <nav aria-label={title}>
    <h4 className="font-heading font-semibold text-[13px] uppercase tracking-wider text-primary/85 mb-4">
      {title}
    </h4>
    <ul className="space-y-1 font-body text-sm text-surface-nav-foreground/85">
      {links.map((item) => (
        <li key={item.to}>
          <PrefetchLink
            to={item.to}
            className="group inline-flex items-center gap-2 min-h-[36px] py-1 hover:text-primary transition-colors duration-200 rounded focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 focus-visible:ring-offset-surface-nav focus-visible:outline-none"
          >
            <span aria-hidden="true" className="w-1 h-1 rounded-full bg-primary/50 group-hover:bg-primary group-hover:scale-150 transition-all" />
            {item.label}
          </PrefetchLink>
        </li>
      ))}
    </ul>
  </nav>
);

export const FooterLinks = () => {
  const { t, isRTL } = useLanguage();

  return (
    <>
      <FooterLinkColumn
        title={t('footer.sections')}
        links={[
          { label: t('cat.aluminum'), to: '/search?category=aluminum' },
          { label: t('cat.iron'), to: '/search?category=iron' },
          { label: t('cat.glass'), to: '/search?category=glass' },
          { label: t('cat.wood'), to: '/search?category=wood' },
          { label: t('cat.accessories'), to: '/search?category=accessories' },
        ]}
      />
      <FooterLinkColumn
        title={t('footer.services')}
        links={[
          { label: isRTL ? 'المشاريع' : 'Projects', to: '/projects' },
          { label: isRTL ? 'المدونة' : 'Blog', to: '/blog' },
          { label: isRTL ? 'الأدلة الفنية' : 'Technical Guides', to: '/guides' },
          { label: isRTL ? 'الأسعار والمقارنة' : 'Prices & Compare', to: '/services' },
          { label: isRTL ? 'العروض' : 'Offers', to: '/offers' },
          { label: t('footer.contracts'), to: '/contracts' },
          { label: isRTL ? 'العضويات' : 'Membership', to: '/membership' },
          { label: isRTL ? 'انضم كمزود خدمة' : 'For Providers', to: '/for-providers' },
        ]}
      />
      <FooterLinkColumn
        title={t('footer.contact')}
        links={[
          { label: t('footer.support'), to: '/contact' },
          { label: isRTL ? 'مركز المساعدة' : 'Help Center', to: '/help' },
          { label: isRTL ? 'الإبلاغ عن مشكلة' : 'Report an issue', to: '/help/report-issue' },
          { label: isRTL ? 'اقتراح ميزة' : 'Suggest a feature', to: '/help/feature-request' },
          { label: t('footer.partnerships'), to: '/about' },
          { label: t('footer.privacy'), to: '/privacy' },
          { label: t('footer.terms'), to: '/terms' },
        ]}
      />
    </>
  );
};
