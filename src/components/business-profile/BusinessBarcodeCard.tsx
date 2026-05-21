import React from 'react';
import { QrCode, Sparkles } from 'lucide-react';
import BarcodeWidget from '@/components/barcodes/BarcodeWidget';
import { useEntityBarcode } from '@/lib/barcodes/useEntityBarcode';
import { useBi } from '@/components/common/Bilingual';

interface Props {
  businessId: string | null | undefined;
  businessName?: string;
  className?: string;
}

/**
 * Inline barcode + QR card for a business entity.
 * Includes the 30x20 cm printable sticker action (via BarcodeWidget).
 * Renders nothing if the business has no provisioned barcode yet.
 */
export const BusinessBarcodeCard: React.FC<Props> = ({ businessId, businessName, className }) => {
  const bi = useBi();
  const { data: code } = useEntityBarcode('business', businessId ?? null);
  if (!businessId || !code) return null;
  return (
    <section className={className} aria-labelledby="business-barcode-heading">
      <div className="flex items-start justify-between gap-3 mb-3">
        <div className="flex items-start gap-3 min-w-0">
          <div className="shrink-0 h-10 w-10 rounded-xl bg-gradient-to-br from-emerald-500 to-emerald-700 text-white flex items-center justify-center shadow-sm">
            <QrCode className="h-5 w-5" />
          </div>
          <div className="min-w-0">
            <h3 id="business-barcode-heading" className="text-base font-bold text-foreground leading-tight">
              {bi('باركود النشاط الرسمي', 'Official Business Barcode')}
            </h3>
            <p className="text-xs text-muted-foreground mt-1 leading-relaxed">
              {bi(
                'استخدم هذا الكود للتعريف بالنشاط، أو اطبع الملصق الكبير لتثبيته في موقع العمل.',
                'Use this code to identify your business, or print the large sticker for on-site display.',
              )}
            </p>
          </div>
        </div>
        <span className="hidden sm:inline-flex items-center gap-1 text-[10px] font-semibold tracking-wider uppercase text-amber-700 dark:text-amber-400 bg-amber-500/10 border border-amber-500/30 rounded-full px-2 py-1">
          <Sparkles className="h-3 w-3" />
          {bi('احترافي', 'Premium')}
        </span>
      </div>
      <BarcodeWidget
        barcodeCode={code}
        entityType="business"
        title={bi('باركود النشاط', 'Business barcode')}
        subtitle={businessName}
        printable
        downloadable
        copyable
        size="md"
      />
    </section>
  );
};

export default BusinessBarcodeCard;