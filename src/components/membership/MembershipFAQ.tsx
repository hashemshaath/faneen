import React, { useMemo, useState } from 'react';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import { HelpCircle, Search, X } from 'lucide-react';
import { Input } from '@/components/ui/input';

interface Props { isRTL: boolean }

const faqs = [
  {
    ar: { q: 'هل يمكنني تغيير باقتي لاحقاً؟', a: 'نعم، يمكنك ترقية باقتك في أي وقت. عند خفض الباقة تحتفظ بمميزاتك الحالية حتى انتهاء الفترة المدفوعة، ثم يتم الانتقال للباقة الأقل تلقائياً.' },
    en: { q: 'Can I change my plan later?', a: 'Yes — you can upgrade anytime. When downgrading, you keep your current benefits until the paid period ends, then move to the lower plan automatically.' },
  },
  {
    ar: { q: 'هل التجربة مجانية حقاً؟', a: 'الباقة المجانية مجانية بالكامل وبدون أي بطاقة ائتمان. يمكنك استخدامها للأبد مع المزايا الأساسية.' },
    en: { q: 'Is the free tier really free?', a: 'The Free plan is fully free with no credit card required. You can use it forever with the core features.' },
  },
  {
    ar: { q: 'كيف يتم الدفع؟', a: 'حالياً نحن في النسخة التجريبية، ويتم تفعيل الترقيات يدوياً دون أي رسوم. سيتم إضافة الدفع الإلكتروني (مدى، فيزا، ماستركارد، أبل باي) قريباً.' },
    en: { q: 'How does payment work?', a: 'We are currently in beta — upgrades are activated manually with no charge. Online payment (Mada, Visa, Mastercard, Apple Pay) will be added soon.' },
  },
  {
    ar: { q: 'هل تشمل الأسعار ضريبة القيمة المضافة؟', a: 'نعم، جميع الأسعار المعروضة شاملة لضريبة القيمة المضافة 15% وفقاً للأنظمة في المملكة العربية السعودية.' },
    en: { q: 'Do prices include VAT?', a: 'Yes — all displayed prices include 15% VAT in compliance with Saudi Arabian regulations.' },
  },
  {
    ar: { q: 'هل يمكنني الحصول على فاتورة ضريبية؟', a: 'نعم، يتم إصدار فاتورة ضريبية إلكترونية معتمدة عند كل عملية اشتراك أو تجديد، ويمكنك تنزيلها من لوحة التحكم.' },
    en: { q: 'Can I get a tax invoice?', a: 'Yes — a certified e-invoice is issued for every subscription or renewal, downloadable from your dashboard.' },
  },
  {
    ar: { q: 'ماذا يحدث إذا ألغيت الاشتراك؟', a: 'تحتفظ بكامل مميزات باقتك حتى انتهاء فترة الاشتراك المدفوعة، ثم يتم الانتقال للباقة المختارة (أو المجانية) تلقائياً. يمكنك استئناف التجديد في أي وقت.' },
    en: { q: 'What happens if I cancel?', a: 'You keep all benefits until the end of the paid period, then automatically move to your chosen plan (or Free). You can resume renewal anytime.' },
  },
];

export const MembershipFAQ = ({ isRTL }: Props) => {
  const [query, setQuery] = useState('');

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return faqs.map((f, i) => ({ ...f, _idx: i }));
    return faqs
      .map((f, i) => ({ ...f, _idx: i }))
      .filter((f) => {
        const t = isRTL ? f.ar : f.en;
        return t.q.toLowerCase().includes(q) || t.a.toLowerCase().includes(q);
      });
  }, [query, isRTL]);

  return (
  <section className="max-w-3xl mx-auto mt-16 sm:mt-20" aria-labelledby="membership-faq-title">
    <div className="text-center mb-6">
      <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-accent/10 text-accent text-xs font-medium mb-3">
        <HelpCircle className="w-3.5 h-3.5" />
        {isRTL ? 'الأسئلة الشائعة' : 'FAQ'}
      </div>
      <h2 id="membership-faq-title" className="font-heading font-bold text-2xl sm:text-3xl text-foreground">
        {isRTL ? 'أسئلة قد تخطر ببالك' : 'Questions you might have'}
      </h2>
    </div>

    <div className="relative mb-4">
      <Search className="w-4 h-4 text-muted-foreground absolute top-1/2 -translate-y-1/2 start-3 pointer-events-none" />
      <Input
        type="search"
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        placeholder={isRTL ? 'ابحث في الأسئلة الشائعة...' : 'Search FAQs...'}
        dir="auto"
        className="ps-9 pe-9 h-11 rounded-xl bg-card"
        aria-label={isRTL ? 'بحث' : 'Search'}
      />
      {query && (
        <button
          type="button"
          onClick={() => setQuery('')}
          className="absolute top-1/2 -translate-y-1/2 end-2 p-1 rounded-md text-muted-foreground hover:text-foreground hover:bg-muted/50"
          aria-label={isRTL ? 'مسح' : 'Clear'}
        >
          <X className="w-4 h-4" />
        </button>
      )}
    </div>

    {filtered.length === 0 ? (
      <div className="rounded-2xl border border-border/60 bg-card p-8 text-center">
        <p className="text-sm text-muted-foreground">
          {isRTL ? 'لم نعثر على نتائج مطابقة. جرّب كلمة مختلفة.' : 'No matching questions. Try a different keyword.'}
        </p>
      </div>
    ) : (
    <Accordion type="single" collapsible className="rounded-2xl border border-border/60 bg-card overflow-hidden divide-y divide-border/40">
      {filtered.map((f) => {
        const t = isRTL ? f.ar : f.en;
        return (
          <AccordionItem key={f._idx} value={`item-${f._idx}`} className="border-0 px-5">
            <AccordionTrigger className="text-start text-sm font-semibold hover:no-underline py-4">
              {t.q}
            </AccordionTrigger>
            <AccordionContent className="text-sm text-muted-foreground leading-relaxed pb-4">
              {t.a}
            </AccordionContent>
          </AccordionItem>
        );
      })}
    </Accordion>
    )}
  </section>
  );
};
