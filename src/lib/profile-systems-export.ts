import type { ComponentType } from 'react';
import { setupArabicDoc, getArabicTableStyles } from './pdf-arabic-font';

export interface ProfileExportRow {
  name_ar: string;
  name_en: string | null;
  category: string | null;
  profile_type: string | null;
  thermal_insulation_rating: number | null;
  sound_insulation_rating: number | null;
  strength_rating: number | null;
  max_height_mm: number | null;
  available_colors: string[] | null;
  recommendation_level: string | null;
  views_count: number | null;
  slug: string;
}

type Lang = 'ar' | 'en';

const escapeCSV = (v: unknown): string => {
  const s = v == null ? '' : String(v);
  if (/[",\n;]/.test(s)) return `"${s.replace(/"/g, '""')}"`;
  return s;
};

const triggerDownload = (blob: Blob, filename: string) => {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  setTimeout(() => URL.revokeObjectURL(url), 1000);
};

export const exportProfilesCSV = (rows: ProfileExportRow[], lang: Lang) => {
  const isAr = lang === 'ar';
  const headers = isAr
    ? ['الاسم', 'الفئة', 'النوع', 'العزل الحراري', 'العزل الصوتي', 'التحمل', 'أقصى ارتفاع (مم)', 'عدد الألوان', 'التوصية', 'المشاهدات', 'الرابط']
    : ['Name', 'Category', 'Type', 'Thermal', 'Sound', 'Strength', 'Max Height (mm)', 'Colors', 'Recommendation', 'Views', 'URL'];

  const body = rows.map((p) => [
    isAr ? (p.name_ar || p.name_en || '') : (p.name_en || p.name_ar || ''),
    p.category ?? '',
    p.profile_type ?? '',
    p.thermal_insulation_rating ?? '',
    p.sound_insulation_rating ?? '',
    p.strength_rating ?? '',
    p.max_height_mm ?? '',
    p.available_colors?.length ?? 0,
    p.recommendation_level ?? '',
    p.views_count ?? 0,
    `https://qitaat.com/profile-systems/${p.slug}`,
  ]);

  // UTF-8 BOM so Excel renders Arabic correctly.
  const csv = '\uFEFF' + [headers.map(escapeCSV).join(','), ...body.map((r) => r.map(escapeCSV).join(','))].join('\n');
  const stamp = new Date().toISOString().slice(0, 10);
  triggerDownload(new Blob([csv], { type: 'text/csv;charset=utf-8;' }), `profile-systems-${stamp}.csv`);
};

export const exportProfilesPDF = async (rows: ProfileExportRow[], lang: Lang) => {
  const isAr = lang === 'ar';
  const [{ default: jsPDF }, autoTableMod] = await Promise.all([
    import('jspdf'),
    import('jspdf-autotable'),
  ]);
  const autoTable = (autoTableMod as unknown as { default: ComponentType<unknown> }).default as unknown as (doc: unknown, opts: unknown) => void;

  const doc = new jsPDF({ orientation: 'landscape', unit: 'mm', format: 'a4' });
  const fontLoaded = await setupArabicDoc(doc as unknown as Parameters<typeof setupArabicDoc>[0], isAr);
  const styles = getArabicTableStyles(isAr, fontLoaded);
  const pageWidth = doc.internal.pageSize.getWidth();

  doc.setFontSize(16);
  doc.setTextColor(19, 23, 34);
  doc.text(isAr ? 'دليل القطاعات والأنظمة' : 'Profile Systems Directory', pageWidth / 2, 16, { align: 'center' });
  doc.setFontSize(10);
  doc.setTextColor(107, 118, 137);
  doc.text(
    `qitaat.com — ${new Date().toLocaleDateString(isAr ? 'ar-SA-u-nu-latn' : 'en-US')} — ${rows.length} ${isAr ? 'قطاع' : 'profiles'}`,
    pageWidth / 2, 23, { align: 'center' },
  );

  const head = [[
    isAr ? 'الاسم' : 'Name',
    isAr ? 'الفئة' : 'Category',
    isAr ? 'حراري' : 'Thermal',
    isAr ? 'صوتي' : 'Sound',
    isAr ? 'تحمل' : 'Strength',
    isAr ? 'ارتفاع (مم)' : 'Height (mm)',
    isAr ? 'ألوان' : 'Colors',
    isAr ? 'التوصية' : 'Recommendation',
  ]];
  const body = rows.map((p) => [
    isAr ? (p.name_ar || p.name_en || '') : (p.name_en || p.name_ar || ''),
    p.category ?? '—',
    String(p.thermal_insulation_rating ?? '—'),
    String(p.sound_insulation_rating ?? '—'),
    String(p.strength_rating ?? '—'),
    String(p.max_height_mm ?? '—'),
    String(p.available_colors?.length ?? 0),
    p.recommendation_level ?? '—',
  ]);

  autoTable(doc, {
    startY: 30,
    head,
    body,
    theme: 'grid',
    headStyles: { fillColor: [19, 23, 34], textColor: [255, 255, 255], fontStyle: 'bold', halign: 'center', ...(isAr ? { font: 'ArabicFont' } : {}) },
    styles: { halign: 'center', fontSize: 9, cellPadding: 2.5, ...styles },
    alternateRowStyles: { fillColor: [242, 244, 248] },
  });

  const stamp = new Date().toISOString().slice(0, 10);
  doc.save(`profile-systems-${stamp}.pdf`);
};