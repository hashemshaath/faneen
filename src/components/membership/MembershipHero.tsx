/**
 * MEMBERSHIP-PAGE-REDESIGN-2 — Public membership hero.
 *
 * Implements the spec hero verbatim:
 *   Title:     "عضويات قطاعات"
 *   Subtitle:  "اختر مستوى الظهور والمزايا المناسب لجهتك حسب الخدمات،
 *              الطلبات، والعروض المتاحة."
 *   Primary:   "قارن العضويات"  → scrolls to the in-page feature matrix.
 *   Secondary: "تواصل معنا"     → /contact.
 *   Safe note: "قد تختلف بعض المزايا حسب إعدادات الحساب ونوع الخدمة."
 *
 * Pure presentation — no payment, no entitlement, no membership data
 * fetched here. Governance is enforced by the parent page via
 * `useMembershipVisibility`.
 */
import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { ListChecks, MessageCircle, Info } from 'lucide-react';

interface MembershipHeroProps {
  isRTL: boolean;
  /** DOM id of the in-page comparison matrix the primary CTA scrolls to. */
  compareAnchorId?: string;
}

export const MembershipHero = ({ isRTL, compareAnchorId = 'compare' }: MembershipHeroProps) => {
  const scrollToCompare = () => {
    if (typeof document === 'undefined') return;
    const el = document.getElementById(compareAnchorId);
    if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' });
  };

  return (
    <header className="text-center max-w-3xl mx-auto pt-2 mb-10 sm:mb-12 space-y-6">
      <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-primary/10 text-primary border border-primary/20 text-xs sm:text-sm font-medium">
        <span className="flex h-2 w-2 rounded-full bg-primary" />
        {isRTL ? 'العضويات' : 'Memberships'}
      </div>

      <h1 className="font-heading font-bold text-3xl sm:text-5xl md:text-[3.25rem] text-foreground leading-tight tracking-tight">
        {isRTL ? 'عضويات قطاعات' : 'Qitaat Memberships'}
      </h1>

      <p className="text-muted-foreground text-base sm:text-lg max-w-2xl mx-auto leading-relaxed">
        {isRTL
          ? 'اختر مستوى الظهور والمزايا المناسب لجهتك حسب الخدمات، الطلبات، والعروض المتاحة.'
          : 'Pick the visibility and benefits level that fits your business based on services, requests, and available offers.'}
      </p>

      <div className="flex flex-col sm:flex-row items-center justify-center gap-3 pt-2">
        <Button
          size="lg"
          onClick={scrollToCompare}
          className="h-12 px-6 rounded-xl font-semibold gap-2 w-full sm:w-auto"
        >
          <ListChecks className="w-4 h-4" />
          {isRTL ? 'قارن العضويات' : 'Compare memberships'}
        </Button>
        <Button
          asChild
          size="lg"
          variant="outline"
          className="h-12 px-6 rounded-xl font-semibold gap-2 w-full sm:w-auto"
        >
          <Link to="/contact">
            <MessageCircle className="w-4 h-4" />
            {isRTL ? 'تواصل معنا' : 'Contact us'}
          </Link>
        </Button>
      </div>

      <p className="text-xs text-muted-foreground flex items-center justify-center gap-1.5 pt-1">
        <Info className="w-3.5 h-3.5" aria-hidden />
        {isRTL
          ? 'قد تختلف بعض المزايا حسب إعدادات الحساب ونوع الخدمة.'
          : 'Some benefits may vary based on account settings and service type.'}
      </p>
    </header>
  );
};

export default MembershipHero;