import { Loader2, MessageSquare, Share2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useLanguage } from "@/i18n/LanguageContext";

interface BusinessProfileStickyCtaProps {
  onContact: () => void;
  onShare: () => void;
  isContacting: boolean;
}

/**
 * UX-REDESIGN-4 — Mobile-only sticky bottom CTA.
 * - Hidden on >= sm to avoid covering desktop content.
 * - RTL-safe (uses logical layout primitives, no left/right offsets).
 * - Fixed height + safe-area padding to keep CLS = 0 (no layout shift on
 *   mount because it is position:fixed and the page reserves no space).
 * - Public-only actions: contact (lead capture or conversation) and share.
 *   No links to admin, dashboard, auth, or onboarding.
 */
export const BusinessProfileStickyCta = ({
  onContact,
  onShare,
  isContacting,
}: BusinessProfileStickyCtaProps) => {
  const { language, isRTL } = useLanguage();

  return (
    <div
      data-business-profile-sticky-cta=""
      className="fixed inset-x-0 bottom-0 z-40 border-t border-border/40 bg-background/95 px-3 pb-[max(0.5rem,env(safe-area-inset-bottom))] pt-2 shadow-[0_-4px_16px_-8px_rgba(0,0,0,0.15)] backdrop-blur-md sm:hidden"
      role="region"
      aria-label={isRTL ? "إجراءات سريعة" : "Quick actions"}
      dir={isRTL ? "rtl" : "ltr"}
    >
      <div className="flex items-center gap-2">
        <Button
          variant="hero"
          size="sm"
          className="h-11 flex-1 gap-1.5 rounded-xl text-sm font-semibold"
          onClick={onContact}
          disabled={isContacting}
        >
          {isContacting ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <MessageSquare className="h-4 w-4" />
          )}
          {language === "ar" ? "اطلب عرض سعر" : "Request a quote"}
        </Button>
        <Button
          variant="outline"
          size="sm"
          className="h-11 w-11 shrink-0 rounded-xl p-0"
          onClick={onShare}
          aria-label={language === "ar" ? "مشاركة" : "Share"}
        >
          <Share2 className="h-4 w-4" />
        </Button>
      </div>
      <p className="mt-1 text-center text-[10px] leading-tight text-muted-foreground">
        {language === "ar"
          ? "أرسل طلبك للجهة عبر قِطاعات — قد تختلف طريقة التواصل حسب نوع الخدمة."
          : "Send your request through Qitaat — contact method may vary by service."}
      </p>
    </div>
  );
};

export default BusinessProfileStickyCta;