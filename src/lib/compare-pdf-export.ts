import { setupArabicDoc, getArabicTableStyles } from './pdf-arabic-font';
import { BRAND_DOCUMENTS } from '@/config/brandTheme';
import { hexToRgbTuple } from '@/lib/theme/brandThemeUtils';

// Centralized brand document tokens — see `src/config/brandTheme.ts`.
const HEADER_RGB = hexToRgbTuple(BRAND_DOCUMENTS.pdfHeader)     ?? [19, 23, 34];
const TEXT_RGB   = hexToRgbTuple(BRAND_DOCUMENTS.invoiceText)   ?? [26, 34, 48];
const MUTED_RGB  = hexToRgbTuple(BRAND_DOCUMENTS.invoiceMuted)  ?? [107, 118, 137];
const SURFACE2_RGB: [number, number, number] = [242, 244, 248];

interface ExportBusiness {
  name: string;
  rating: string;
  ratingCount: number;
  category: string;
  location: string;
  tier: string;
  installments: string;
  services: { name: string; price: string }[];
}

interface ExportData {
  businesses: ExportBusiness[];
  allServices: string[];
  isRTL: boolean;
}

export const exportComparePDF = async (data: ExportData) => {
  const [{ default: jsPDF }, { default: autoTable }] = await Promise.all([
    import('jspdf'),
    import('jspdf-autotable'),
  ]);

  const doc = new jsPDF({ orientation: 'landscape', unit: 'mm', format: 'a4' });

  const fontLoaded = await setupArabicDoc(doc, data.isRTL);

  const pageWidth = doc.internal.pageSize.getWidth();
  const rtlStyles = getArabicTableStyles(data.isRTL, fontLoaded);

  // Title
  doc.setFontSize(18);
  doc.setTextColor(...TEXT_RGB);
  doc.text(data.isRTL ? 'مقارنة مقدمي الخدمات' : 'Service Provider Comparison', pageWidth / 2, 20, { align: 'center' });

  doc.setFontSize(10);
  doc.setTextColor(...MUTED_RGB);
  doc.text(`qitaat.com — ${new Date().toLocaleDateString(data.isRTL ? 'ar-SA-u-nu-latn' : 'en-US')}`, pageWidth / 2, 27, { align: 'center' });

  // Overview Table
  const overviewHeaders = [
    data.isRTL ? 'البند' : 'Item',
    ...data.businesses.map(b => b.name),
  ];

  const overviewRows = [
    [data.isRTL ? 'التقييم' : 'Rating', ...data.businesses.map(b => `${b.rating} (${b.ratingCount})`)],
    [data.isRTL ? 'التصنيف' : 'Category', ...data.businesses.map(b => b.category)],
    [data.isRTL ? 'الموقع' : 'Location', ...data.businesses.map(b => b.location)],
    [data.isRTL ? 'العضوية' : 'Membership', ...data.businesses.map(b => b.tier)],
    [data.isRTL ? 'التقسيط' : 'Installments', ...data.businesses.map(b => b.installments)],
  ];

  autoTable(doc, {
    startY: 34,
    head: [overviewHeaders],
    body: overviewRows,
    theme: 'grid',
    headStyles: { fillColor: HEADER_RGB, textColor: [255, 255, 255], fontStyle: 'bold', halign: 'center', ...( data.isRTL ? { font: 'ArabicFont' } : {}) },
    styles: { halign: 'center', fontSize: 9, cellPadding: 3, ...(data.isRTL ? { font: 'ArabicFont' } : {}) },
    alternateRowStyles: { fillColor: SURFACE2_RGB },
  });

  // Services comparison
  if (data.allServices.length > 0) {
    const lastY = (doc as any).lastAutoTable?.finalY ?? 80;

    const serviceHeaders = [
      data.isRTL ? 'الخدمة' : 'Service',
      ...data.businesses.map(b => b.name),
    ];

    const serviceRows = data.allServices.map(service => [
      service,
      ...data.businesses.map(b => {
        const found = b.services.find(s => s.name === service);
        return found ? found.price : '—';
      }),
    ]);

    autoTable(doc, {
      startY: lastY + 10,
      head: [serviceHeaders],
      body: serviceRows,
      theme: 'grid',
      headStyles: { fillColor: HEADER_RGB, textColor: [255, 255, 255], fontStyle: 'bold', halign: 'center', ...(data.isRTL ? { font: 'ArabicFont' } : {}) },
      styles: { halign: 'center', fontSize: 9, cellPadding: 3, ...(data.isRTL ? { font: 'ArabicFont' } : {}) },
      alternateRowStyles: { fillColor: SURFACE2_RGB },
    });
  }

  // Footer
  const pageCount = doc.getNumberOfPages();
  for (let i = 1; i <= pageCount; i++) {
    doc.setPage(i);
    doc.setFontSize(8);
    doc.setTextColor(...MUTED_RGB);
    doc.text('qitaat.com', 14, doc.internal.pageSize.getHeight() - 8);
    doc.text(`${i} / ${pageCount}`, pageWidth - 14, doc.internal.pageSize.getHeight() - 8, { align: 'right' });
  }

  doc.save(`qitaat-compare-${Date.now()}.pdf`);
};

