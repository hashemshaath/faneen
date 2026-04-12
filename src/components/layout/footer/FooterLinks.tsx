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
  <div>
    <h4 className="font-heading font-bold text-sm text-surface-nav-foreground mb-5 pb-2 border-b border-surface-nav-foreground/[0.06]">
      {title}
    </h4>
    <ul className="space-y-3 font-body text-[13px] text-surface-nav-foreground/40">
      {links.map((item) => (
        <li key={item.to}>
          <PrefetchLink to={item.to} className="group flex items-center gap-1.5 hover:text-gold transition-all duration-200">
            <span className="w-1 h-1 rounded-full bg-gold/30 group-hover:bg-gold group-hover:scale-150 transition-all" />
            {item.label}
          </PrefetchLink>
        </li>
      ))}
    </ul>
  </div>
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
          { label: isRTL ? 'العروض' : 'Offers', to: '/offers' },
          { label: t('footer.contracts'), to: '/contracts' },
          { label: isRTL ? 'العضويات' : 'Membership', to: '/membership' },
        ]}
      />
      <FooterLinkColumn
        title={t('footer.contact')}
        links={[
          { label: t('footer.support'), to: '/contact' },
          { label: t('footer.partnerships'), to: '/about' },
          { label: t('footer.privacy'), to: '/privacy' },
          { label: t('footer.terms'), to: '/terms' },
        ]}
      />
    </>
  );
};
