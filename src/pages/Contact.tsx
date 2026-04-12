import React, { useMemo } from 'react';
import { useLanguage } from '@/i18n/LanguageContext';
import { usePageMeta, useJsonLd } from '@/hooks/usePageMeta';
import { Navbar } from '@/components/layout/Navbar';
import { Footer } from '@/components/layout/Footer';
import { Mail, Phone, MapPin } from 'lucide-react';

const Contact = () => {
  const { isRTL, language } = useLanguage();
  usePageMeta({
    title: isRTL ? 'تواصل معنا | فنيين' : 'Contact Us | Faneen',
    description: isRTL ? 'تواصل مع فريق فنيين للدعم الفني أو الاستفسارات أو الشراكات' : 'Contact Faneen team for support, inquiries or partnerships',
    canonical: 'https://faneen.com/contact',
  });

  useJsonLd(useMemo(() => ({
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: [
      { '@type': 'ListItem', position: 1, name: 'فنيين', item: 'https://faneen.com' },
      { '@type': 'ListItem', position: 2, name: language === 'ar' ? 'تواصل معنا' : 'Contact', item: 'https://faneen.com/contact' },
    ],
  }), [language]));

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <div className="bg-primary pt-24 pb-10"><div className="container px-4"><h1 className="font-heading text-2xl sm:text-3xl font-bold text-primary-foreground">{isRTL ? 'تواصل معنا' : 'Contact Us'}</h1></div></div>
      <div className="container py-10 px-4 max-w-2xl space-y-6">
        {[
          { icon: Mail, label: isRTL ? 'البريد الإلكتروني' : 'Email', value: 'info@faneen.com', href: 'mailto:info@faneen.com' },
          { icon: Phone, label: isRTL ? 'الهاتف' : 'Phone', value: '+966 50 000 0000', href: 'tel:+966500000000' },
          { icon: MapPin, label: isRTL ? 'العنوان' : 'Address', value: isRTL ? 'المملكة العربية السعودية' : 'Saudi Arabia' },
        ].map((item, i) => (
          <div key={i} className="flex items-center gap-4 p-5 rounded-xl border border-border/50 bg-card">
            <div className="w-12 h-12 rounded-xl bg-gold/10 flex items-center justify-center shrink-0"><item.icon className="w-5 h-5 text-gold" /></div>
            <div>
              <p className="text-xs text-muted-foreground">{item.label}</p>
              {item.href ? <a href={item.href} className="font-heading font-bold text-foreground hover:text-gold transition-colors">{item.value}</a> : <p className="font-heading font-bold text-foreground">{item.value}</p>}
            </div>
          </div>
        ))}
      </div>
      <Footer />
    </div>
  );
};

export default Contact;
