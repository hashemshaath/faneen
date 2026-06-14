import React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Eye } from 'lucide-react';
import { validateHexColor } from '@/lib/theme/brandThemeUtils';
import type { AdminColorState } from './types';

export interface BrandingPreviewSectionProps {
  isRTL: boolean;
  theme: AdminColorState;
}

/**
 * BrandingPreviewSection — live preview built from the in-form theme
 * state. Read-only: never writes to CSS variables, theme appliers or DB.
 */
export const BrandingPreviewSection: React.FC<BrandingPreviewSectionProps> = ({ isRTL, theme }) => {
  const statuses = [
    { key: 'success' as const, ar: 'نجاح', en: 'Success' },
    { key: 'warning' as const, ar: 'تنبيه', en: 'Warning' },
    { key: 'error' as const, ar: 'خطأ', en: 'Error' },
    { key: 'info' as const, ar: 'معلومة', en: 'Info' },
  ];
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base flex items-center gap-2">
          <Eye className="w-4 h-4 text-accent" />
          {isRTL ? 'معاينة الهوية' : 'Theme preview'}
        </CardTitle>
        <CardDescription className="text-xs">
          {isRTL
            ? 'تعكس قيم الفورم الحالية مباشرةً قبل الحفظ.'
            : 'Reflects current form values live, before saving.'}
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div
          className="rounded-xl p-4 sm:p-6 space-y-4 border"
          style={{
            background: validateHexColor(theme.background) ? theme.background : undefined,
            borderColor: validateHexColor(theme.border) ? theme.border : undefined,
            color: validateHexColor(theme.text) ? theme.text : undefined,
          }}
        >
          <div className="flex flex-wrap gap-2">
            <button type="button" className="h-10 px-4 rounded-lg text-sm font-semibold text-white" style={{ background: theme.primary }}>
              {isRTL ? 'زر أساسي' : 'Primary button'}
            </button>
            <button type="button" className="h-10 px-4 rounded-lg text-sm font-semibold text-white" style={{ background: theme.secondary }}>
              {isRTL ? 'زر ثانوي' : 'Secondary button'}
            </button>
            <button type="button" className="h-10 px-4 rounded-lg text-sm font-semibold text-white" style={{ background: theme.accent }}>
              {isRTL ? 'زر مميز' : 'Accent button'}
            </button>
          </div>
          <div className="flex flex-wrap gap-2">
            {statuses.map((s) => (
              <span
                key={s.key}
                className="inline-flex items-center h-7 px-3 rounded-full text-xs font-semibold text-white"
                style={{ background: theme[s.key] }}
              >
                {isRTL ? s.ar : s.en}
              </span>
            ))}
          </div>
          <div
            className="rounded-xl p-4 border"
            style={{
              background: validateHexColor(theme.surface) ? theme.surface : undefined,
              borderColor: validateHexColor(theme.border) ? theme.border : undefined,
              color: validateHexColor(theme.text) ? theme.text : undefined,
            }}
          >
            <div className="text-sm font-bold mb-1">{isRTL ? 'عنوان البطاقة' : 'Card title'}</div>
            <p className="text-xs" style={{ color: theme.textMuted }}>
              {isRTL
                ? 'هذه فقرة تجريبية تستخدم لون النص الباهت لمعاينة التباين.'
                : 'Sample paragraph using muted text to preview contrast.'}
            </p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

export default BrandingPreviewSection;