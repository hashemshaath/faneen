import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

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

export const exportComparePDF = ({ businesses, allServices, isRTL }: ExportData) => {
  const doc = new jsPDF({ orientation: 'landscape', unit: 'mm', format: 'a4' });

  const title = isRTL ? 'مقارنة مزودي الخدمة' : 'Provider Comparison';
  const date = new Date().toLocaleDateString(isRTL ? 'ar-SA' : 'en-US');

  // Title
  doc.setFontSize(18);
  doc.setTextColor(30, 41, 59);
  doc.text(title, doc.internal.pageSize.width / 2, 18, { align: 'center' });

  doc.setFontSize(10);
  doc.setTextColor(100, 116, 139);
  doc.text(date, doc.internal.pageSize.width / 2, 25, { align: 'center' });

  // Labels
  const ratingLabel = isRTL ? 'التقييم' : 'Rating';
  const categoryLabel = isRTL ? 'التخصص' : 'Category';
  const locationLabel = isRTL ? 'الموقع' : 'Location';
  const tierLabel = isRTL ? 'العضوية' : 'Tier';
  const installLabel = isRTL ? 'التقسيط' : 'Installments';

  // Build table data
  const head = [['', ...businesses.map(b => b.name)]];

  const body: string[][] = [
    [ratingLabel, ...businesses.map(b => `${b.rating} (${b.ratingCount})`)],
    [categoryLabel, ...businesses.map(b => b.category)],
    [locationLabel, ...businesses.map(b => b.location)],
    [tierLabel, ...businesses.map(b => b.tier)],
    [installLabel, ...businesses.map(b => b.installments)],
  ];

  // Services section
  if (allServices.length > 0) {
    body.push([isRTL ? '── الخدمات والأسعار ──' : '── Services & Pricing ──', ...businesses.map(() => '')]);
    allServices.forEach(svcName => {
      body.push([
        svcName,
        ...businesses.map(b => {
          const svc = b.services.find(s => s.name === svcName);
          return svc ? svc.price : '-';
        }),
      ]);
    });
  }

  autoTable(doc, {
    head,
    body,
    startY: 32,
    theme: 'grid',
    styles: {
      fontSize: 9,
      cellPadding: 4,
      halign: 'center',
      valign: 'middle',
    },
    headStyles: {
      fillColor: [30, 41, 59],
      textColor: 255,
      fontStyle: 'bold',
      fontSize: 10,
    },
    columnStyles: {
      0: { halign: isRTL ? 'right' : 'left', fontStyle: 'bold', fillColor: [248, 250, 252] },
    },
    alternateRowStyles: { fillColor: [248, 250, 252] },
    margin: { top: 32, left: 14, right: 14 },
  });

  // Footer
  const pageCount = doc.getNumberOfPages();
  for (let i = 1; i <= pageCount; i++) {
    doc.setPage(i);
    doc.setFontSize(8);
    doc.setTextColor(148, 163, 184);
    doc.text(
      isRTL ? 'فنين - مقارنة مزودي الخدمة' : 'Faneen - Provider Comparison',
      14,
      doc.internal.pageSize.height - 8
    );
    doc.text(
      `${i} / ${pageCount}`,
      doc.internal.pageSize.width - 14,
      doc.internal.pageSize.height - 8,
      { align: 'right' }
    );
  }

  doc.save(isRTL ? 'مقارنة-مزودي-الخدمة.pdf' : 'provider-comparison.pdf');
};
