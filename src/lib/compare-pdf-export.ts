import { setupArabicDoc, getArabicTableStyles } from './pdf-arabic-font';

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

  // Register Arabic font
  await registerArabicFont(doc);
  if (data.isRTL) doc.setFont('Amiri');

  const pageWidth = doc.internal.pageSize.getWidth();
  const rtlStyles = data.isRTL ? { font: 'Amiri', halign: 'right' as const } : {};

  // Title
  doc.setFontSize(18);
  doc.setTextColor(40, 40, 40);
  doc.text(data.isRTL ? 'مقارنة مقدمي الخدمات' : 'Service Provider Comparison', pageWidth / 2, 20, { align: 'center' });

  doc.setFontSize(10);
  doc.setTextColor(128, 128, 128);
  doc.text(`faneen.com — ${new Date().toLocaleDateString(data.isRTL ? 'ar-SA' : 'en-US')}`, pageWidth / 2, 27, { align: 'center' });

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
    headStyles: { fillColor: [200, 167, 103], textColor: [30, 30, 30], fontStyle: 'bold', halign: 'center', ...( data.isRTL ? { font: 'Amiri' } : {}) },
    styles: { halign: 'center', fontSize: 9, cellPadding: 3, ...(data.isRTL ? { font: 'Amiri' } : {}) },
    alternateRowStyles: { fillColor: [248, 248, 248] },
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
      headStyles: { fillColor: [200, 167, 103], textColor: [30, 30, 30], fontStyle: 'bold', halign: 'center', ...(data.isRTL ? { font: 'Amiri' } : {}) },
      styles: { halign: 'center', fontSize: 9, cellPadding: 3, ...(data.isRTL ? { font: 'Amiri' } : {}) },
      alternateRowStyles: { fillColor: [248, 248, 248] },
    });
  }

  // Footer
  const pageCount = doc.getNumberOfPages();
  for (let i = 1; i <= pageCount; i++) {
    doc.setPage(i);
    doc.setFontSize(8);
    doc.setTextColor(180, 180, 180);
    doc.text('faneen.com', 14, doc.internal.pageSize.getHeight() - 8);
    doc.text(`${i} / ${pageCount}`, pageWidth - 14, doc.internal.pageSize.getHeight() - 8, { align: 'right' });
  }

  doc.save(`faneen-compare-${Date.now()}.pdf`);
};
