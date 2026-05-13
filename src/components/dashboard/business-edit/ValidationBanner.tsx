import React from 'react';
import { AlertTriangle, CheckCircle2, Info } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import {
  type ValidationIssue,
  errorCount,
  warningCount,
  messageFor,
} from './validation';

const fieldLabel = (isRTL: boolean): Record<string, string> => ({
  name_ar: isRTL ? 'اسم المنشأة (عربي)' : 'Business name (AR)',
  name_en: isRTL ? 'اسم المنشأة (إنجليزي)' : 'Business name (EN)',
  national_id: isRTL ? 'رقم السجل التجاري' : 'Commercial Registration',
  unified_number: isRTL ? 'الرقم الموحّد' : 'Unified number',
  vat_number: isRTL ? 'الرقم الضريبي' : 'VAT number',
  phone: isRTL ? 'الهاتف الثابت' : 'Landline phone',
  mobile: isRTL ? 'الجوال' : 'Mobile',
  customer_service_phone: isRTL ? 'هاتف خدمة العملاء' : 'Customer service phone',
  email: isRTL ? 'البريد الإلكتروني' : 'Email',
  website: isRTL ? 'الموقع الإلكتروني' : 'Website',
  account_manager_email: isRTL ? 'بريد مدير الحساب' : 'Account manager email',
  account_manager_phone: isRTL ? 'جوال مدير الحساب' : 'Account manager mobile',
  description_ar_en: isRTL ? 'الوصف الكامل' : 'Full description',
  short_description_ar_en: isRTL ? 'النبذة المختصرة' : 'Short description',
  region_ar_en: isRTL ? 'المنطقة' : 'Region',
  address_ar_en: isRTL ? 'العنوان التفصيلي' : 'Full address',
  coordinates: isRTL ? 'موقع المنشأة على الخريطة' : 'Map location',
});

export const ValidationBanner: React.FC<{ issues: ValidationIssue[]; isRTL: boolean }> = ({
  issues,
  isRTL,
}) => {
  const errors = errorCount(issues);
  const warns = warningCount(issues);
  const labels = fieldLabel(isRTL);

  if (errors === 0 && warns === 0) {
    return (
      <Card className="border-emerald-500/30 bg-emerald-500/5">
        <CardContent className="py-3 flex items-center gap-2 text-sm text-emerald-700 dark:text-emerald-400">
          <CheckCircle2 className="w-4 h-4" />
          {isRTL ? 'كل الحقول صحيحة وجاهزة للحفظ.' : 'All fields are valid and ready to save.'}
        </CardContent>
      </Card>
    );
  }

  return (
    <Card
      className={
        errors > 0
          ? 'border-destructive/30 bg-destructive/5'
          : 'border-warning/30 bg-warning/5'
      }
    >
      <CardContent className="py-3 space-y-2">
        <div className={`flex items-center gap-2 text-sm font-medium ${errors > 0 ? 'text-destructive' : 'text-warning'}`}>
          {errors > 0 ? <AlertTriangle className="w-4 h-4" /> : <Info className="w-4 h-4" />}
          {errors > 0
            ? isRTL
              ? `يوجد ${errors} حقل يحتاج إلى تصحيح قبل الحفظ`
              : `${errors} field${errors > 1 ? 's' : ''} need correction before saving`
            : isRTL
              ? `يوجد ${warns} ملاحظة لتحسين البيانات`
              : `${warns} suggestion${warns > 1 ? 's' : ''} to improve your profile`}
        </div>
        <ul className="text-xs text-muted-foreground space-y-1 list-disc ms-5">
          {issues.slice(0, 6).map((i, idx) => (
            <li key={idx}>
              <span className="font-medium text-foreground">{labels[i.key] ?? i.key}:</span>{' '}
              {messageFor(i.code, isRTL)}
            </li>
          ))}
        </ul>
      </CardContent>
    </Card>
  );
};

export const FieldError: React.FC<{ issue?: ValidationIssue; isRTL: boolean }> = ({
  issue,
  isRTL,
}) => {
  if (!issue) return null;
  return (
    <p
      className={`text-xs mt-1 ${issue.severity === 'error' ? 'text-destructive' : 'text-warning'}`}
    >
      {messageFor(issue.code, isRTL)}
    </p>
  );
};