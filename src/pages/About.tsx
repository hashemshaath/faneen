import React, { useMemo } from 'react';
import { useLanguage } from '@/i18n/LanguageContext';
import { usePageMeta, useJsonLd } from '@/hooks/usePageMeta';
import { Navbar } from '@/components/layout/Navbar';
import { Footer } from '@/components/layout/Footer';
import { Mail, Phone, MapPin, MessageSquare } from 'lucide-react';

const About = () => {
  const { isRTL, language } = useLanguage();
  usePageMeta({
    title: isRTL ? 'من نحن - عن منصة فنيين | فنيين' : 'About Us - Faneen Platform | Faneen',
    description: isRTL ? 'تعرف على منصة فنيين - المنصة الأولى لدليل أعمال الألمنيوم والحديد والزجاج والخشب في العالم العربي' : 'Learn about Faneen - the leading business directory for aluminum, iron, glass and wood in the Arab world',
    canonical: 'https://faneen.com/about',
  });

  useJsonLd(useMemo(() => ({
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: [
      { '@type': 'ListItem', position: 1, name: 'فنيين', item: 'https://faneen.com' },
      { '@type': 'ListItem', position: 2, name: language === 'ar' ? 'من نحن' : 'About', item: 'https://faneen.com/about' },
    ],
  }), [language]));

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <div className="bg-primary pt-24 pb-10"><div className="container px-4"><h1 className="font-heading text-2xl sm:text-3xl font-bold text-primary-foreground">{isRTL ? 'من نحن' : 'About Us'}</h1></div></div>
      <div className="container py-10 px-4 max-w-3xl space-y-6">
        <p className="text-muted-foreground leading-relaxed">{isRTL ? 'فنيين هي المنصة الأولى المتخصصة في قطاع الألمنيوم والحديد والاستيل والزجاج والخشب في العالم العربي. نربط بين أصحاب المشاريع ومزودي الخدمات بطريقة احترافية وآمنة.' : 'Faneen is the first platform specializing in the aluminum, iron, steel, glass and wood sector in the Arab world. We connect project owners with service providers professionally and securely.'}</p>
        <p className="text-muted-foreground leading-relaxed">{isRTL ? 'نوفر أدوات متكاملة تشمل: نظام عقود محمية، تقسيط مرن، ضمانات، تقييمات حقيقية، ومقارنة بين المزودين لمساعدتك في اتخاذ القرار الأفضل.' : 'We provide integrated tools including: protected contracts, flexible installments, warranties, real reviews, and provider comparison to help you make the best decision.'}</p>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-4">
          {[
            { icon: MessageSquare, title: isRTL ? 'رسالتنا' : 'Our Mission', desc: isRTL ? 'تسهيل الوصول لأفضل مزودي الخدمات' : 'Facilitating access to the best providers' },
            { icon: MapPin, title: isRTL ? 'موقعنا' : 'Location', desc: isRTL ? 'المملكة العربية السعودية' : 'Saudi Arabia' },
            { icon: Mail, title: isRTL ? 'تواصل معنا' : 'Contact', desc: 'info@faneen.com' },
          ].map((item, i) => (
            <div key={i} className="p-4 rounded-xl border border-border/50 bg-card space-y-2 text-center">
              <item.icon className="w-6 h-6 text-gold mx-auto" />
              <h3 className="font-heading font-bold text-sm text-foreground">{item.title}</h3>
              <p className="text-xs text-muted-foreground">{item.desc}</p>
            </div>
          ))}
        </div>
      </div>
      <Footer />
    </div>
  );
};

export default About;
