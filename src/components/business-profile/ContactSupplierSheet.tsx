import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from "@/components/ui/sheet";
import { useLanguage } from "@/i18n/LanguageContext";
import { LeadRequestForm } from "@/components/lead/LeadRequestForm";

/**
 * Inline sheet wrapper around LeadRequestForm — used by BusinessProfile to
 * capture supplier leads without exposing tel:/mailto: to unauthenticated
 * visitors. No popups, no dialogs — a side sheet that stays out of the way.
 */
interface ContactSupplierSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  businessId: string;
  businessName?: string;
  source?: string;
}

export const ContactSupplierSheet = ({
  open,
  onOpenChange,
  businessId,
  businessName,
  source = "business-profile",
}: ContactSupplierSheetProps) => {
  const { isRTL } = useLanguage();

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent
        side={isRTL ? "right" : "left"}
        className="w-full sm:max-w-lg overflow-y-auto p-4 sm:p-6"
      >
        <SheetHeader className="text-start">
          <SheetTitle className="font-heading text-base sm:text-lg">
            {isRTL ? "تواصل مع المورّد" : "Contact supplier"}
          </SheetTitle>
          <SheetDescription className="text-xs sm:text-sm">
            {isRTL
              ? "أرسل طلبك مباشرة وسيتواصل معك المورّد عبر الوسيلة المفضلة لك."
              : "Send your request and the supplier will reach out via your preferred channel."}
          </SheetDescription>
        </SheetHeader>

        <div className="mt-4">
          <LeadRequestForm
            businessId={businessId}
            businessName={businessName}
            source={source}
            onSuccess={() => {
              // Auto-close after a short delay so the user sees the success state
              setTimeout(() => onOpenChange(false), 1800);
            }}
          />
        </div>
      </SheetContent>
    </Sheet>
  );
};

export default ContactSupplierSheet;