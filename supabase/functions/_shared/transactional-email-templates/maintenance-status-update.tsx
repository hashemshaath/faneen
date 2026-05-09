/// <reference types="npm:@types/react@18.3.1" />
import * as React from 'npm:react@18.3.1'
import { BilingualEmail, SITE_NAME_AR } from '../email-layout/BilingualLayout.tsx'
import type { TemplateEntry } from './registry.ts'

const STATUS_AR: Record<string, string> = {
  pending: 'قيد الانتظار', assigned: 'تم التعيين', in_progress: 'قيد التنفيذ',
  completed: 'مكتمل', cancelled: 'ملغي',
}
const STATUS_EN: Record<string, string> = {
  pending: 'Pending', assigned: 'Assigned', in_progress: 'In progress',
  completed: 'Completed', cancelled: 'Cancelled',
}
const STATUS_TONE: Record<string, 'success' | 'info' | 'warning' | 'danger' | 'neutral'> = {
  completed: 'success', in_progress: 'info', assigned: 'info',
  pending: 'warning', cancelled: 'danger',
}

interface Props {
  clientName?: string
  requestNumber?: string
  title?: string
  oldStatus?: string
  newStatus?: string
}

const MaintenanceStatusUpdateEmail: React.FC<Props> = ({
  clientName, requestNumber, title, oldStatus, newStatus,
}) => {
  const newAr = newStatus ? STATUS_AR[newStatus] || newStatus : undefined
  const newEn = newStatus ? STATUS_EN[newStatus] || newStatus : undefined
  const oldAr = oldStatus ? STATUS_AR[oldStatus] || oldStatus : undefined
  const oldEn = oldStatus ? STATUS_EN[oldStatus] || oldStatus : undefined
  const tone = newStatus ? STATUS_TONE[newStatus] || 'info' : 'info'
  return (
    <BilingualEmail
      preview={`تحديث طلب الصيانة ${requestNumber || ''} · Maintenance request update`}
      badge={newAr && newEn ? { textAr: newAr, textEn: newEn, tone } : undefined}
      titleAr="تحديث حالة طلب الصيانة 🔧"
      titleEn="Maintenance request updated 🔧"
      greetingNameAr={clientName}
      greetingNameEn={clientName}
      introAr="نوافيك بأحدث تطور على طلب الصيانة الخاص بك. التفاصيل أدناه."
      introEn="Here's the latest update on your maintenance request. Details below."
      details={[
        ...(requestNumber ? [{ labelAr: 'رقم الطلب', labelEn: 'Request ID', value: requestNumber, mono: true }] : []),
        ...(title ? [{ labelAr: 'العنوان', labelEn: 'Title', value: title }] : []),
        ...(oldAr && oldEn ? [{ labelAr: 'الحالة السابقة', labelEn: 'Previous status', value: `${oldAr} · ${oldEn}` }] : []),
        ...(newAr && newEn ? [{ labelAr: 'الحالة الحالية', labelEn: 'Current status', value: `${newAr} · ${newEn}` }] : []),
      ]}
      cta={{
        href: 'https://qitaat.com/dashboard/operations',
        labelAr: 'متابعة الطلب',
        labelEn: 'Track request',
      }}
    />
  )
}

export const template = {
  component: MaintenanceStatusUpdateEmail,
  subject: (data: Record<string, any>) =>
    `تحديث طلب صيانة${data?.requestNumber ? ` #${data.requestNumber}` : ''} · Maintenance update — ${SITE_NAME_AR}`,
  displayName: 'تحديث حالة طلب صيانة · Maintenance status update',
  previewData: {
    clientName: 'محمد القحطاني',
    requestNumber: 'MR-0000012',
    title: 'صيانة تسريب في زجاج الواجهة',
    oldStatus: 'pending',
    newStatus: 'in_progress',
  },
} satisfies TemplateEntry
