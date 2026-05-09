/// <reference types="npm:@types/react@18.3.1" />
import * as React from 'npm:react@18.3.1'
import { BilingualEmail, SITE_NAME_AR } from '../email-layout/BilingualLayout.tsx'
import type { TemplateEntry } from './registry.ts'

interface BookingConfirmationProps {
  clientName?: string
  businessName?: string
  bookingDate?: string
  startTime?: string
  refId?: string
}

const BookingConfirmationEmail: React.FC<BookingConfirmationProps> = ({
  clientName, businessName, bookingDate, startTime, refId,
}) => (
  <BilingualEmail
    preview={`تأكيد حجزك لدى ${businessName || 'مزود الخدمة'} · Your booking is confirmed`}
    badge={{ textAr: 'تم التأكيد', textEn: 'Confirmed', tone: 'success' }}
    titleAr="تم تأكيد حجزك ✓"
    titleEn="Your booking is confirmed ✓"
    greetingNameAr={clientName}
    greetingNameEn={clientName}
    introAr="تم تسجيل موعدك بنجاح. الرجاء الاحتفاظ بهذه التفاصيل للرجوع إليها."
    introEn="Your appointment has been scheduled successfully. Please keep these details for your reference."
    details={[
      ...(refId ? [{ labelAr: 'رقم الحجز', labelEn: 'Booking ID', value: refId, mono: true }] : []),
      ...(businessName ? [{ labelAr: 'مزود الخدمة', labelEn: 'Provider', value: businessName }] : []),
      ...(bookingDate ? [{ labelAr: 'التاريخ', labelEn: 'Date', value: bookingDate, mono: true }] : []),
      ...(startTime ? [{ labelAr: 'الوقت', labelEn: 'Time', value: startTime, mono: true }] : []),
    ]}
    tipAr="إذا احتجت لتعديل أو إلغاء الموعد، يمكنك ذلك عبر لوحة التحكم قبل الموعد بـ 24 ساعة على الأقل."
    tipEn="To reschedule or cancel, please use your dashboard at least 24 hours before the appointment."
    cta={{
      href: 'https://qitaat.com/dashboard/bookings',
      labelAr: 'إدارة الحجز',
      labelEn: 'Manage booking',
    }}
  />
)

export const template = {
  component: BookingConfirmationEmail,
  subject: (data: Record<string, any>) =>
    `تأكيد حجز${data?.refId ? ` #${data.refId}` : ''} · Booking confirmed — ${SITE_NAME_AR}`,
  displayName: 'تأكيد حجز موعد · Booking confirmation',
  previewData: {
    clientName: 'أحمد العتيبي',
    businessName: 'شركة الإنجاز للمقاولات',
    bookingDate: '2026-04-20',
    startTime: '10:00 ص',
    refId: 'BK-0001234',
  },
} satisfies TemplateEntry
