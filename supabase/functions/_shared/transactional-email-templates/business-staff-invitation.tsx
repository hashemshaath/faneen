/// <reference types="npm:@types/react@18.3.1" />
import * as React from 'npm:react@18.3.1'
import { BilingualEmail, SITE_NAME_AR } from '../email-layout/BilingualLayout.tsx'
import type { TemplateEntry } from './registry.ts'

interface Props {
  recipientEmail?: string
  businessName?: string
  inviterName?: string
  roleAr?: string
  roleEn?: string
  acceptUrl?: string
  expiryDate?: string
}

const Email: React.FC<Props> = ({
  recipientEmail, businessName, inviterName, roleAr, roleEn, acceptUrl, expiryDate,
}) => (
  <BilingualEmail
    preview={`دعوة للانضمام كمفوّض · You've been invited as a representative${businessName ? ` · ${businessName}` : ''}`}
    badge={{ textAr: 'دعوة فريق', textEn: 'Team invitation', tone: 'info' }}
    titleAr="دعوة للانضمام كمفوّض"
    titleEn="You're invited as a representative"
    greetingNameAr={recipientEmail}
    greetingNameEn={recipientEmail}
    introAr={
      businessName
        ? `قامت ${businessName} بدعوتك للانضمام كمفوّض على منصة قِطاعات${roleAr ? ` بدور (${roleAr})` : ''}. يمكنك قبول الدعوة والوصول إلى لوحة التحكم لإدارة بيانات المنشأة والخدمات حسب الصلاحيات الممنوحة.`
        : `تمت دعوتك للانضمام كمفوّض على منصة قِطاعات${roleAr ? ` بدور (${roleAr})` : ''}.`
    }
    introEn={
      businessName
        ? `${businessName} has invited you to join Qitaat as an authorized representative${roleEn ? ` with the role of ${roleEn}` : ''}. Accept the invitation to access the dashboard and manage business data within your assigned permissions.`
        : `You've been invited to join Qitaat as an authorized representative${roleEn ? ` with the role of ${roleEn}` : ''}.`
    }
    details={[
      ...(businessName ? [{ labelAr: 'المنشأة', labelEn: 'Business', value: businessName }] : []),
      ...(inviterName ? [{ labelAr: 'بواسطة', labelEn: 'Invited by', value: inviterName }] : []),
      ...(roleAr && roleEn ? [{ labelAr: 'الدور', labelEn: 'Role', value: `${roleAr} · ${roleEn}` }] : []),
      ...(expiryDate ? [{ labelAr: 'صالحة حتى', labelEn: 'Valid until', value: expiryDate }] : []),
    ]}
    cta={acceptUrl ? { href: acceptUrl, labelAr: 'قبول الدعوة', labelEn: 'Accept invitation' } : undefined}
    tipAr="يجب تسجيل الدخول بنفس البريد الإلكتروني الذي وصلتك إليه هذه الدعوة. إذا لم يكن لديك حساب، يمكنك إنشاؤه بنفس البريد ثم قبول الدعوة."
    tipEn="You must sign in with the same email this invitation was sent to. If you don't have an account yet, sign up with this email and then accept."
  />
)

export const template = {
  component: Email,
  subject: (d: Record<string, unknown>) => {
    const businessName = typeof d?.businessName === 'string' ? d.businessName : ''
    return `دعوة للانضمام كمفوّض${businessName ? ` لـ ${businessName}` : ''} · You're invited — ${SITE_NAME_AR}`
  },
  displayName: 'دعوة مفوّض · Staff invitation',
  previewData: {
    recipientEmail: 'partner@example.com',
    businessName: 'مؤسسة قطاعات الألمنيوم',
    inviterName: 'سعود الحربي',
    roleAr: 'مدير',
    roleEn: 'Manager',
    expiryDate: '2026-05-27',
    acceptUrl: 'https://qitaat.com/staff-invite/sample-token',
  },
} satisfies TemplateEntry