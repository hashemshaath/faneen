import { Link } from 'react-router-dom';
import { Navbar } from '@/components/layout/Navbar';
import { Footer } from '@/components/layout/Footer';
import { Button } from '@/components/ui/button';
import { Lock, MessageCircle } from 'lucide-react';
import { useLanguage } from '@/i18n/LanguageContext';
import { useNoIndex } from '@/hooks/useNoIndex';

/**
 * Public unavailable state for `/membership` when the admin has disabled
 * the `memberships` module. Renders a safe, non-sales page with no plan
 * details, no prices, and a contact-support fallback. `noindex` so SEO
 * does not surface a degraded experience.
 */
export const MembershipUnavailableState = () => {
  const { isRTL } = useLanguage();
  useNoIndex();

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <Navbar />
      <main className="flex-1 container px-4 py-16 sm:py-24">
        <div className="max-w-xl mx-auto text-center">
          <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-muted/60 text-muted-foreground mb-5">
            <Lock className="w-6 h-6" aria-hidden />
          </div>
          <h1 className="font-heading font-bold text-2xl sm:text-3xl text-foreground mb-3">
            {isRTL ? 'العضويات غير متاحة حاليًا' : 'Memberships are currently unavailable'}
          </h1>
          <p className="text-sm sm:text-base text-muted-foreground leading-relaxed mb-8">
            {isRTL
              ? 'تم إيقاف عرض خطط العضوية مؤقتًا من قِبل الإدارة. تظل خدمات الدليل الصناعي وطلبات عروض الأسعار متاحة للجميع.'
              : 'Membership plans have been temporarily disabled by the administrator. The industrial directory and quote requests remain available to everyone.'}
          </p>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
            <Button asChild variant="primary" className="w-full sm:w-auto">
              <Link to="/">{isRTL ? 'العودة للرئيسية' : 'Back to home'}</Link>
            </Button>
            <Button asChild variant="outline" className="w-full sm:w-auto">
              <Link to="/contact" className="gap-2">
                <MessageCircle className="w-4 h-4" />
                {isRTL ? 'تواصل مع الدعم' : 'Contact support'}
              </Link>
            </Button>
          </div>
        </div>
      </main>
      <Footer />
    </div>
  );
};

export default MembershipUnavailableState;