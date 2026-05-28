/**
 * APP-SHELL-REARCHITECTURE-1 — Breadcrumb derivation.
 *
 * Pure derivation from `useLocation`. Labels are loaded from a small
 * built-in map; unknown segments are humanized. No network, no DB.
 */
import { useMemo } from 'react';
import { useLocation } from 'react-router-dom';
import { useLanguage } from '@/i18n/LanguageContext';

export interface BreadcrumbEntry {
  label: string;
  path: string;
}

const LABELS: Record<string, { ar: string; en: string }> = {
  dashboard:        { ar: 'لوحة التحكم', en: 'Dashboard' },
  admin:            { ar: 'الإدارة',     en: 'Admin' },
  'work-orders':    { ar: 'أوامر العمل', en: 'Work Orders' },
  operations:       { ar: 'العمليات',    en: 'Operations' },
  feed:             { ar: 'التدفق',      en: 'Feed' },
  contracts:        { ar: 'العقود',      en: 'Contracts' },
  leads:            { ar: 'العملاء المحتملون', en: 'Leads' },
  bookings:         { ar: 'الحجوزات',    en: 'Bookings' },
  settings:         { ar: 'الإعدادات',   en: 'Settings' },
  staff:            { ar: 'الموظفون',    en: 'Staff' },
  notifications:    { ar: 'الإشعارات',   en: 'Notifications' },
  messages:         { ar: 'الرسائل',     en: 'Messages' },
  services:         { ar: 'الخدمات',     en: 'Services' },
  portfolio:        { ar: 'معرض الأعمال', en: 'Portfolio' },
  projects:         { ar: 'المشاريع',    en: 'Projects' },
  reviews:          { ar: 'التقييمات',   en: 'Reviews' },
  warranties:       { ar: 'الضمانات',    en: 'Warranties' },
  installments:     { ar: 'الأقساط',     en: 'Installments' },
  'no-access':      { ar: 'لا صلاحية',   en: 'No Access' },
  overview:         { ar: 'نظرة عامة',   en: 'Overview' },
  ref:              { ar: 'مراجع',       en: 'References' },
  triage:           { ar: 'الفرز',       en: 'Triage' },
  operations_console: { ar: 'وحدة العمليات', en: 'Operations Console' },
};

function humanize(segment: string): string {
  return segment.replace(/[-_]+/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());
}

export function useBreadcrumbs(): BreadcrumbEntry[] {
  const { pathname } = useLocation();
  const { isRTL } = useLanguage();
  return useMemo(() => {
    const segments = pathname.split('/').filter(Boolean);
    const crumbs: BreadcrumbEntry[] = [];
    let acc = '';
    for (const seg of segments) {
      acc += `/${seg}`;
      // Skip dynamic ID-looking segments (UUIDs / refs) to keep crumbs clean.
      if (/^[0-9a-f-]{20,}$/i.test(seg) || /^[A-Z]{2,8}-[0-9A-Z]{3,16}$/i.test(seg)) {
        crumbs.push({ label: seg, path: acc });
        continue;
      }
      const label = LABELS[seg];
      crumbs.push({ label: label ? (isRTL ? label.ar : label.en) : humanize(seg), path: acc });
    }
    return crumbs;
  }, [pathname, isRTL]);
}