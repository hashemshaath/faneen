import React, { useMemo } from 'react';
import { useLanguage } from '@/i18n/LanguageContext';
import { usePageMeta, useMultiJsonLd } from '@/hooks/usePageMeta';
import { Navbar } from '@/components/layout/Navbar';
import { Footer } from '@/components/layout/Footer';
import { Mail, Phone, MapPin, MessageSquare } from 'lucide-react';
import { WhyQitaatSection } from '@/components/home/WhyQitaatSection';

const About = () => {
  const { isRTL, language } = useLanguage();
  usePageMeta({
    title: isRTL ? 'من نحن - عن منصة قِطاعات | قِطاعات' : 'About Us - Qitaat Platform | Qitaat',
    description: isRTL ? 'تعرف على منصة قِطاعات - المنصة الأولى لدليل أعمال الألمنيوم والحديد والزجاج والخشب في العالم العربي' : 'Learn about Qitaat - the leading business directory for aluminum, iron, glass and wood in the Arab world',
    canonical: 'https://qitaat.com/about',
  });

  useMultiJsonLd(useMemo(() => {
    const breadcrumb = {
      '@context': 'https://schema.org',
      '@type': 'BreadcrumbList',
      itemListElement: [
        { '@type': 'ListItem', position: 1, name: 'قِطاعات', item: 'https://qitaat.com' },
        { '@type': 'ListItem', position: 2, name: language === 'ar' ? 'من نحن' : 'About', item: 'https://qitaat.com/about' },
      ],
    };

    const faqPage = {
      '@context': 'https://schema.org',
      '@type': 'FAQPage',
      mainEntity: [
        {
          '@type': 'Question',
          name: language === 'ar' ? 'ما هي منصة قِطاعات؟' : 'What is Qitaat?',
          acceptedAnswer: {
            '@type': 'Answer',
            text: language === 'ar'
              ? 'قِطاعات هي المنصة الأولى المتخصصة في قطاع الألمنيوم والحديد والزجاج والخشب في العالم العربي. نربط بين أصحاب المشاريع ومزودي الخدمات بطريقة احترافية وآمنة.'
              : 'Qitaat is the first platform specializing in the aluminum, iron, glass and wood sector in the Arab world, connecting project owners with service providers.',
          },
        },
        {
          '@type': 'Question',
          name: language === 'ar' ? 'ما هي الأدوات التي توفرها قِطاعات؟' : 'What tools does Qitaat provide?',
          acceptedAnswer: {
            '@type': 'Answer',
            text: language === 'ar'
              ? 'نوفر أدوات متكاملة تشمل: نظام عقود محمية، تقسيط مرن، ضمانات، تقييمات حقيقية، ومقارنة بين المزودين لمساعدتك في اتخاذ القرار الأفضل.'
              : 'We provide integrated tools including protected contracts, flexible installments, warranties, real reviews, and provider comparison.',
          },
        },
        {
          '@type': 'Question',
          name: language === 'ar' ? 'أين يقع مقر قِطاعات؟' : 'Where is Qitaat located?',
          acceptedAnswer: {
            '@type': 'Answer',
            text: language === 'ar' ? 'المملكة العربية السعودية' : 'Saudi Arabia',
          },
        },
        {
          '@type': 'Question',
          name: language === 'ar' ? 'كيف أتواصل مع قِطاعات؟' : 'How can I contact Qitaat?',
          acceptedAnswer: {
            '@type': 'Answer',
            text: language === 'ar' ? 'يمكنك التواصل عبر البريد الإلكتروني info@qitaat.com أو من خلال صفحة التواصل في الموقع.' : 'You can contact us via email at info@qitaat.com or through the contact page.',
          },
        },
      ],
    };

    return [breadcrumb, faqPage];
  }, [language]));

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <div className="bg-primary pt-24 pb-10"><div className="container px-4"><h1 className="font-heading text-2xl sm:text-3xl font-bold text-primary-foreground">{isRTL ? 'من نحن' : 'About Us'}</h1></div></div>
      <div className="container py-10 px-4 max-w-3xl space-y-6">
        <p className="text-muted-foreground leading-relaxed">{isRTL ? 'قِطاعات هي المنصة الأولى المتخصصة في قطاع الألمنيوم والحديد والاستيل والزجاج والخشب في العالم العربي. نربط بين أصحاب المشاريع ومزودي الخدمات بطريقة احترافية وآمنة.' : 'Qitaat is the first platform specializing in the aluminum, iron, steel, glass and wood sector in the Arab world. We connect project owners with service providers professionally and securely.'}</p>
        <p className="text-muted-foreground leading-relaxed">{isRTL ? 'نوفر أدوات متكاملة تشمل: نظام عقود محمية، تقسيط مرن، ضمانات، تقييمات حقيقية، ومقارنة بين المزودين لمساعدتك في اتخاذ القرار الأفضل.' : 'We provide integrated tools including: protected contracts, flexible installments, warranties, real reviews, and provider comparison to help you make the best decision.'}</p>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-4">
          {[
            { icon: MessageSquare, title: isRTL ? 'رسالتنا' : 'Our Mission', desc: isRTL ? 'تسهيل الوصول لأفضل مزودي الخدمات' : 'Facilitating access to the best providers' },
            { icon: MapPin, title: isRTL ? 'موقعنا' : 'Location', desc: isRTL ? 'المملكة العربية السعودية' : 'Saudi Arabia' },
            { icon: Mail, title: isRTL ? 'تواصل معنا' : 'Contact', desc: 'info@qitaat.com' },
          ].map((item, i) => (
            <div key={i} className="p-4 rounded-xl border border-border/50 bg-card space-y-2 text-center">
              <item.icon className="w-6 h-6 text-gold mx-auto" />
              <h3 className="font-heading font-bold text-sm text-foreground">{item.title}</h3>
              <p className="text-xs text-muted-foreground">{item.desc}</p>
            </div>
          ))}
        </div>
      </div>
      <WhyQitaatSection variant="about" />
      <Footer />
    </div>
  );
};

export default About;
