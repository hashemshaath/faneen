/**
 * HomeAudienceSplit — one section, two halves: customer | provider.
 * Replaces the previous WhoIsItForSection + ForClientsSection +
 * ForProvidersSection trio (three sections collapsed into one).
 * No images, no icon walls — copy-first, CTA-first.
 */
import { Link } from 'react-router-dom';
import { ArrowLeft, ArrowRight } from 'lucide-react';
import { useBi } from '@/components/common/Bilingual';
import { useLanguage } from '@/i18n/LanguageContext';
import { Button } from '@/components/ui/button';
import { Section } from './_shared';

const HomeAudienceSplit = () => {
  const bi = useBi();
  const { isRTL } = useLanguage();
  const Arrow = isRTL ? ArrowLeft : ArrowRight;
  return (
    <Section className="border-t border-border/40">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-6">
        {/* Customer half */}
        <div className="relative overflow-hidden rounded-2xl border border-border/60 bg-card p-6 sm:p-8 md:p-10 flex flex-col">
          <span className="inline-block self-start text-[11px] font-semibold uppercase tracking-wider px-2.5 py-1 rounded-full bg-primary/10 text-primary mb-4">
            {bi('للعميل', 'For customers')}
          </span>
          <h2 className="font-heading font-bold text-xl sm:text-2xl md:text-3xl text-foreground leading-tight mb-3">
            {bi('تحتاج تنفيذ عمل صناعي؟', 'Need an industrial job done?')}
          </h2>
          <p className="text-sm sm:text-base text-muted-foreground leading-relaxed mb-6 flex-1">
            {bi(
              'اختر القطاع، أرسل طلبك، واحصل على مزودين مناسبين حسب المدينة والتخصص.',
              'Pick a sector, send your request, and get matched with providers by city and specialty.',
            )}
          </p>
          <Link to="/search?intent=quote" className="self-start">
            <Button variant="primary" size="appLg" className="gap-2">
              {bi('ابدأ طلبك', 'Start your request')}
              <Arrow className="w-4 h-4" />
            </Button>
          </Link>
        </div>

        {/* Provider half */}
        <div className="relative overflow-hidden rounded-2xl border border-border/60 bg-secondary/5 p-6 sm:p-8 md:p-10 flex flex-col">
          <span className="inline-block self-start text-[11px] font-semibold uppercase tracking-wider px-2.5 py-1 rounded-full bg-secondary/10 text-secondary mb-4">
            {bi('لمزود الخدمة', 'For providers')}
          </span>
          <h2 className="font-heading font-bold text-xl sm:text-2xl md:text-3xl text-foreground leading-tight mb-3">
            {bi('هل تقدّم خدمات صناعية؟', 'Do you offer industrial services?')}
          </h2>
          <p className="text-sm sm:text-base text-muted-foreground leading-relaxed mb-6 flex-1">
            {bi(
              'اعرض أعمالك، استقبل فرصًا مناسبة، وابنِ حضورك داخل سوق قطاعات.',
              'Show your work, receive matched opportunities, and build your presence on Qitaat.',
            )}
          </p>
          <Link to="/auth?mode=signup&role=provider" className="self-start">
            <Button variant="secondary" size="appLg" className="gap-2">
              {bi('سجّل كمزود خدمة', 'Register as a provider')}
              <Arrow className="w-4 h-4" />
            </Button>
          </Link>
        </div>
      </div>
    </Section>
  );
};

export default HomeAudienceSplit;