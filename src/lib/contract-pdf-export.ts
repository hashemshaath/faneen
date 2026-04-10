export interface ContractExportData {
  contractNumber: string;
  title: string;
  description?: string;
  totalAmount: number;
  currency: string;
  startDate?: string;
  endDate?: string;
  clientName: string;
  providerName: string;
  supervisorName?: string;
  supervisorPhone?: string;
  supervisorEmail?: string;
  terms?: string;
  milestones: { title: string; amount: number; dueDate?: string; status: string }[];
  isRTL: boolean;
}

export const exportContractPDF = async (data: ContractExportData) => {
  const [{ default: jsPDF }, { default: autoTable }] = await Promise.all([
    import('jspdf'),
    import('jspdf-autotable'),
  ]);

  const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
  const w = doc.internal.pageSize.getWidth();
  let y = 15;

  // Header
  doc.setFillColor(30, 30, 40);
  doc.rect(0, 0, w, 35, 'F');
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(18);
  doc.text(data.isRTL ? 'عقد رسمي' : 'Official Contract', w / 2, 15, { align: 'center' });
  doc.setFontSize(10);
  doc.text(`#${data.contractNumber}`, w / 2, 23, { align: 'center' });
  doc.setFontSize(9);
  doc.text(data.title, w / 2, 30, { align: 'center' });

  y = 45;
  doc.setTextColor(0, 0, 0);

  // Parties
  doc.setFontSize(12);
  doc.text(data.isRTL ? 'أطراف العقد' : 'Contract Parties', 15, y);
  y += 8;

  const partiesData = [
    [data.isRTL ? 'العميل' : 'Client', data.clientName],
    [data.isRTL ? 'مزود الخدمة' : 'Provider', data.providerName],
  ];
  if (data.supervisorName) partiesData.push([data.isRTL ? 'المسؤول' : 'Supervisor', data.supervisorName]);
  if (data.supervisorPhone) partiesData.push([data.isRTL ? 'هاتف المسؤول' : 'Supervisor Phone', data.supervisorPhone]);

  autoTable(doc, {
    startY: y,
    body: partiesData,
    theme: 'grid',
    styles: { fontSize: 9, cellPadding: 3, halign: data.isRTL ? 'right' : 'left' },
    columnStyles: { 0: { fontStyle: 'bold', cellWidth: 45 } },
    margin: { left: 15, right: 15 },
  });

  y = (doc as any).lastAutoTable.finalY + 10;

  // Financial
  doc.setFontSize(12);
  doc.text(data.isRTL ? 'البيانات المالية' : 'Financial Details', 15, y);
  y += 8;

  const finData = [
    [data.isRTL ? 'إجمالي المبلغ' : 'Total Amount', `${data.totalAmount.toLocaleString()} ${data.currency}`],
    [data.isRTL ? 'تاريخ البداية' : 'Start Date', data.startDate || '-'],
    [data.isRTL ? 'تاريخ النهاية' : 'End Date', data.endDate || '-'],
  ];

  autoTable(doc, {
    startY: y,
    body: finData,
    theme: 'grid',
    styles: { fontSize: 9, cellPadding: 3, halign: data.isRTL ? 'right' : 'left' },
    columnStyles: { 0: { fontStyle: 'bold', cellWidth: 45 } },
    margin: { left: 15, right: 15 },
  });

  y = (doc as any).lastAutoTable.finalY + 10;

  // Milestones
  if (data.milestones.length > 0) {
    doc.setFontSize(12);
    doc.text(data.isRTL ? 'مراحل التنفيذ' : 'Milestones', 15, y);
    y += 8;

    autoTable(doc, {
      startY: y,
      head: [[
        data.isRTL ? 'المرحلة' : 'Milestone',
        data.isRTL ? 'المبلغ' : 'Amount',
        data.isRTL ? 'التاريخ' : 'Due Date',
        data.isRTL ? 'الحالة' : 'Status',
      ]],
      body: data.milestones.map(m => [
        m.title,
        `${m.amount.toLocaleString()} ${data.currency}`,
        m.dueDate || '-',
        m.status,
      ]),
      theme: 'striped',
      styles: { fontSize: 8, cellPadding: 3, halign: data.isRTL ? 'right' : 'left' },
      headStyles: { fillColor: [30, 30, 40] },
      margin: { left: 15, right: 15 },
    });

    y = (doc as any).lastAutoTable.finalY + 10;
  }

  // Terms
  if (data.terms) {
    if (y > 230) { doc.addPage(); y = 15; }
    doc.setFontSize(12);
    doc.text(data.isRTL ? 'الشروط والالتزامات' : 'Terms & Conditions', 15, y);
    y += 8;
    doc.setFontSize(8);
    const lines = doc.splitTextToSize(data.terms, w - 30);
    doc.text(lines, 15, y);
    y += lines.length * 4 + 10;
  }

  // Signatures
  if (y > 230) { doc.addPage(); y = 15; }
  y += 5;
  doc.setFontSize(10);
  doc.text(data.isRTL ? 'التوقيعات' : 'Signatures', 15, y);
  y += 10;
  doc.setDrawColor(180, 180, 180);
  doc.line(15, y + 15, 85, y + 15);
  doc.line(w - 85, y + 15, w - 15, y + 15);
  doc.setFontSize(8);
  doc.text(data.isRTL ? 'توقيع العميل' : 'Client Signature', 50, y + 22, { align: 'center' });
  doc.text(data.isRTL ? 'توقيع المزود' : 'Provider Signature', w - 50, y + 22, { align: 'center' });

  // Footer
  const pageCount = doc.getNumberOfPages();
  for (let i = 1; i <= pageCount; i++) {
    doc.setPage(i);
    doc.setFontSize(7);
    doc.setTextColor(150, 150, 150);
    doc.text(`${data.isRTL ? 'صفحة' : 'Page'} ${i}/${pageCount}`, w / 2, doc.internal.pageSize.getHeight() - 8, { align: 'center' });
  }

  doc.save(`contract-${data.contractNumber}.pdf`);
};
