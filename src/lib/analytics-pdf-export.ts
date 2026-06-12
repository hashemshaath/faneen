/**
 * Analytics PDF export — bilingual (Arabic/English) using the shared
 * Noto Naskh font loader (`setupArabicDoc`). Produces a printable summary
 * with KPI rows + breakdown tables.
 *
 * Pure helper: callers pass already-computed values from the analytics
 * page (no DB calls, no React).
 */
import { setupArabicDoc, getArabicTableStyles } from './pdf-arabic-font';

export interface AnalyticsExportStats {
  totalRevenue: number;
  totalContracts: number;
  activeContracts: number;
  completedContracts: number;
  totalBookings: number;
  confirmedBookings: number;
  completedBookings: number;
  cancelledBookings: number;
  totalReviews: number;
  avgRating: string | number;
  projectsCount: number;
  servicesCount: number;
}

export interface AnalyticsExportInput {
  isRTL: boolean;
  businessName: string;
  periodLabel: string;
  generatedAt: Date;
  stats: AnalyticsExportStats;
  revenueSeries: { date: string; revenue: number; count: number }[];
  contractStatusBreakdown: { name: string; value: number }[];
  bookingStatusBreakdown: { name: string; value: number }[];
  reviewsDistribution: { stars: string; count: number }[];
  overdueCount?: number;
}

const T = (isRTL: boolean, ar: string, en: string) => (isRTL ? ar : en);

export async function exportAnalyticsPdf(input: AnalyticsExportInput): Promise<void> {
  const [{ default: jsPDF }, { default: autoTable }] = await Promise.all([
    import('jspdf'),
    import('jspdf-autotable'),
  ]);
  const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
  const fontLoaded = await setupArabicDoc(doc, input.isRTL);
  const styles = getArabicTableStyles(input.isRTL, fontLoaded);

  const pageWidth = doc.internal.pageSize.getWidth();
  const ts = input.generatedAt.toLocaleString(input.isRTL ? 'ar-SA-u-nu-latn' : 'en');

  // ── Header ──────────────────────────────────────────────────────────
  doc.setFontSize(16);
  doc.text(
    T(input.isRTL, 'تقرير التحليلات', 'Analytics Report'),
    input.isRTL ? pageWidth - 14 : 14,
    18,
    { align: input.isRTL ? 'right' : 'left' },
  );
  doc.setFontSize(10);
  doc.setTextColor(120);
  doc.text(
    `${input.businessName} • ${input.periodLabel} • ${ts}`,
    input.isRTL ? pageWidth - 14 : 14,
    25,
    { align: input.isRTL ? 'right' : 'left' },
  );
  doc.setTextColor(0);

  // ── KPI table ───────────────────────────────────────────────────────
  const sar = T(input.isRTL, 'ر.س', 'SAR');
  const kpiRows: [string, string][] = [
    [T(input.isRTL, 'إجمالي الإيرادات', 'Total revenue'),
      `${input.stats.totalRevenue.toLocaleString()} ${sar}`],
    [T(input.isRTL, 'العقود (الإجمالي)', 'Contracts (total)'),
      String(input.stats.totalContracts)],
    [T(input.isRTL, 'عقود نشطة', 'Active contracts'),
      String(input.stats.activeContracts)],
    [T(input.isRTL, 'عقود مكتملة', 'Completed contracts'),
      String(input.stats.completedContracts)],
    [T(input.isRTL, 'الحجوزات (الإجمالي)', 'Bookings (total)'),
      String(input.stats.totalBookings)],
    [T(input.isRTL, 'حجوزات مؤكدة', 'Confirmed bookings'),
      String(input.stats.confirmedBookings)],
    [T(input.isRTL, 'حجوزات مكتملة', 'Completed bookings'),
      String(input.stats.completedBookings)],
    [T(input.isRTL, 'حجوزات ملغاة', 'Cancelled bookings'),
      String(input.stats.cancelledBookings)],
    [T(input.isRTL, 'متوسط التقييم', 'Avg. rating'),
      `${input.stats.avgRating} (${input.stats.totalReviews})`],
    [T(input.isRTL, 'الخدمات النشطة', 'Active services'),
      String(input.stats.servicesCount)],
    [T(input.isRTL, 'المشاريع', 'Projects'),
      String(input.stats.projectsCount)],
    [T(input.isRTL, 'دفعات متأخرة', 'Overdue payments'),
      String(input.overdueCount ?? 0)],
  ];

  autoTable(doc, {
    startY: 32,
    head: [[T(input.isRTL, 'المؤشر', 'Metric'), T(input.isRTL, 'القيمة', 'Value')]],
    body: kpiRows,
    styles: { ...styles, fontSize: 10, cellPadding: 2.5 },
    headStyles: { ...styles, fillColor: [34, 139, 90], textColor: 255 },
    theme: 'striped',
    margin: { left: 14, right: 14 },
  });

  // ── Status breakdowns ───────────────────────────────────────────────
  const breakdown = (
    title: string,
    rows: { name: string; value: number }[],
  ) => {
    if (!rows.length) return;
    const last = doc.lastAutoTable?.finalY ?? 60;
    autoTable(doc, {
      startY: last + 6,
      head: [[title, T(input.isRTL, 'العدد', 'Count')]],
      body: rows.map((r) => [r.name, String(r.value)]),
      styles: { ...styles, fontSize: 9, cellPadding: 2 },
      headStyles: { ...styles, fillColor: [47, 98, 174], textColor: 255 },
      theme: 'grid',
      margin: { left: 14, right: 14 },
    });
  };

  breakdown(T(input.isRTL, 'توزيع العقود حسب الحالة', 'Contracts by status'),
    input.contractStatusBreakdown);
  breakdown(T(input.isRTL, 'توزيع الحجوزات حسب الحالة', 'Bookings by status'),
    input.bookingStatusBreakdown);
  breakdown(T(input.isRTL, 'توزيع التقييمات', 'Reviews distribution'),
    input.reviewsDistribution.map((r) => ({ name: r.stars, value: r.count })));

  // ── Revenue series (last N) ─────────────────────────────────────────
  if (input.revenueSeries.length) {
    const last = doc.lastAutoTable?.finalY ?? 80;
    autoTable(doc, {
      startY: last + 6,
      head: [[
        T(input.isRTL, 'التاريخ', 'Date'),
        T(input.isRTL, 'الإيرادات', 'Revenue'),
        T(input.isRTL, 'عدد العقود', 'Contracts'),
      ]],
      body: input.revenueSeries.map((r) => [
        r.date, r.revenue.toLocaleString(), String(r.count),
      ]),
      styles: { ...styles, fontSize: 8, cellPadding: 1.8 },
      headStyles: { ...styles, fillColor: [34, 139, 90], textColor: 255 },
      theme: 'striped',
      margin: { left: 14, right: 14 },
    });
  }

  // ── Footer ──────────────────────────────────────────────────────────
  const pages = doc.getNumberOfPages();
  for (let i = 1; i <= pages; i++) {
    doc.setPage(i);
    doc.setFontSize(8);
    doc.setTextColor(150);
    doc.text(
      `Qitaat • قِطاعات • ${i}/${pages}`,
      pageWidth / 2,
      doc.internal.pageSize.getHeight() - 8,
      { align: 'center' },
    );
  }

  const stamp = input.generatedAt
    .toISOString().slice(0, 16).replace(/[:T-]/g, '');
  doc.save(`qitaat-analytics-${stamp}.pdf`);
}