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
    ar: { q: 'كيف يتم الدفع؟', a: 'الدفع الإلكتروني عبر مُيسّر (Moyasar) باستخدام مدى أو فيزا أو ماستركارد أو أبل باي. تتم العملية على صفحة دفع آمنة، ويتم تفعيل الباقة فور تأكيد العملية.' },
    en: { q: 'How does payment work?', a: 'Online payment is processed via Moyasar (Mada, Visa, Mastercard, Apple Pay) on a secure checkout page. Your plan is activated as soon as the payment is confirmed.' },
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
  {
    ar: { q: 'هل العضوية تضمن وصول طلبات أو مبيعات؟', a: 'لا. العضوية تنظّم مستوى الظهور والمزايا (مثل الأولوية في النتائج، عدد الخدمات، وأدوات إضافية)، لكنها لا تضمن عدد الطلبات أو إتمام أي صفقة. النتائج تعتمد على جودة الملف، الخدمات المعروضة، ومنطقة التغطية.' },
    en: { q: 'Does membership guarantee leads or sales?', a: 'No. Membership organizes your visibility and benefits (priority in results, service limits, extra tools) but does not guarantee any number of leads or deals. Outcomes depend on profile quality, services listed, and service area.' },
  },
  {
    ar: { q: 'لماذا تظهر بعض الخدمات كمطلوب ترقية؟', a: 'لكل باقة حد لعدد الخدمات النشطة والقطاعات المتاحة. عند تجاوز الحد أو محاولة تفعيل خدمة ضمن قطاع لا يشمله مستواك الحالي، ستظهر دعوة للترقية. يمكنك دائمًا حفظ الخدمة كمسودة ثم تفعيلها بعد الترقية.' },
    en: { q: 'Why do some services show as requiring an upgrade?', a: 'Each plan has limits on active services and covered sectors. When you exceed the limit or activate a service in a sector beyond your tier, an upgrade prompt appears. You can keep the service as a draft and activate it later.' },
  },
  {
    ar: { q: 'هل كل العلامات التجارية والقطاعات تظهر مباشرة؟', a: 'بعض العلامات والقطاعات تخضع لمراجعة من فريق قطاعات قبل النشر للحفاظ على دقة الدليل. ستصلك إشعارات عند الموافقة أو طلب تعديلات.' },
    en: { q: 'Do all brands and sectors appear instantly?', a: 'Some brands and sectors are reviewed by the Qitaat team before publishing to keep the directory accurate. You will be notified once approved or if changes are requested.' },
  },
  {
    ar: { q: 'هل العقود وعروض الأسعار متاحة لكل الخطط؟', a: 'الوصول الأساسي للعقود وطلبات عروض الأسعار متاح حسب نوع الحساب، أما الحدود التفصيلية والميزات المتقدمة (مثل عدد العقود المتزامنة) فتعتمد على الباقة وقد تتطلب ترقية.' },
    en: { q: 'Are contracts and quote requests available on every plan?', a: 'Basic access to contracts and RFQs depends on account type. Detailed limits and advanced features (such as concurrent contract count) depend on the plan and may require an upgrade.' },
  },
  {
    ar: { q: 'ماذا يحدث إذا كانت العضويات غير متاحة مؤقتًا؟', a: 'إذا أوقفت الإدارة عرض خطط العضوية، ستبقى خدمات الدليل وطلبات عروض الأسعار متاحة، ويمكنك التواصل مع الدعم لمعرفة الخيارات المتاحة لجهتك.' },
    en: { q: 'What happens if memberships are temporarily unavailable?', a: 'If the admin pauses membership plans, the directory and quote requests stay available and you can contact support to learn what options remain for your business.' },
  },
  {
    ar: { q: 'هل تختلف المزايا حسب نوع الخدمة؟', a: 'نعم. بعض المزايا (مثل الظهور المميز، التقسيط، أو أدوات إضافية) ترتبط بنوع الخدمة وقطاعها وحدود الباقة، وقد تظهر لبعض الخدمات دون غيرها.' },
    en: { q: 'Do benefits differ by service type?', a: 'Yes. Some benefits (such as boosted visibility, BNPL, or extra tools) depend on the service type, its sector, and plan limits, so they may appear for some services and not others.' },
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
