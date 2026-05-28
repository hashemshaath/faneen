/**
 * APP-SHELL-REARCHITECTURE-1 — Breadcrumb derivation.
 *
 * Pure derivation from `useLocation`. Labels are loaded from a small
 * built-in map; unknown segments are humanized. No network, no DB.
 */
import { useMemo } from 'react';
import { useLocation } from 'react-router-dom';
import { useLanguage } from '@/i18n/LanguageContext';
import { useIsMobile } from '@/hooks/use-mobile';

export interface BreadcrumbEntry {
  label: string;
  path: string;
  /** APP-SHELL-2 — module grouping hint for downstream UIs. */
  module?: string;
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

// APP-SHELL-2 — coarse module bucket so UIs can color/group crumbs.
const SEGMENT_TO_MODULE: Record<string, string> = {
  'work-orders': 'work-orders',
  operations: 'operations',
  contracts: 'contracts',
  leads: 'leads',
  bookings: 'bookings',
  staff: 'staff',
  admin: 'admin',
  settings: 'settings',
  messages: 'messages',
  notifications: 'notifications',
  services: 'services',
  projects: 'projects',
  portfolio: 'portfolio',
  reviews: 'reviews',
  warranties: 'warranties',
  installments: 'installments',
  'profile-systems': 'profile-systems',
  dashboard: 'dashboard',
};

function humanize(segment: string): string {
  return segment.replace(/[-_]+/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());
}

export function useBreadcrumbs(): BreadcrumbEntry[] {
  const { pathname } = useLocation();
  const { isRTL } = useLanguage();
  const isMobile = useIsMobile();
  return useMemo(() => {
    const segments = pathname.split('/').filter(Boolean);
    const crumbs: BreadcrumbEntry[] = [];
    let acc = '';
    let currentModule: string | undefined;
    for (const seg of segments) {
      acc += `/${seg}`;
      if (SEGMENT_TO_MODULE[seg]) currentModule = SEGMENT_TO_MODULE[seg];
      // Skip dynamic ID-looking segments (UUIDs / refs) to keep crumbs clean.
      if (/^[0-9a-f-]{20,}$/i.test(seg) || /^[A-Z]{2,8}-[0-9A-Z]{3,16}$/i.test(seg)) {
        crumbs.push({ label: seg, path: acc, module: currentModule });
        continue;
      }
      const label = LABELS[seg];
      crumbs.push({
        label: label ? (isRTL ? label.ar : label.en) : humanize(seg),
        path: acc,
        module: currentModule,
      });
    }
    // APP-SHELL-2 — adaptive truncation on mobile: keep first + last 2.
    if (isMobile && crumbs.length > 3) {
      return [crumbs[0], { label: '…', path: crumbs[crumbs.length - 3].path }, ...crumbs.slice(-2)];
    }
    return crumbs;
  }, [pathname, isRTL, isMobile]);
}