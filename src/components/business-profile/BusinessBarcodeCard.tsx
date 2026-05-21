import React from 'react';
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
    <BarcodeWidget
      barcodeCode={code}
      entityType="business"
      title={bi('باركود النشاط', 'Business barcode')}
      subtitle={businessName}
      printable
      downloadable
      copyable
      size="md"
      className={className}
    />
  );
};

export default BusinessBarcodeCard;