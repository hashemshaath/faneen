/**
 * BUSINESS-OPERATIONS-INTELLIGENCE-1 — Bilingual customer-facing copy.
 *
 * Generic, PII-light, supplier-data-free copy used for in-app customer
 * notifications. Email body content lives inside React Email templates
 * under `supabase/functions/_shared/transactional-email-templates/`.
 *
 * Pure module — no Supabase, no environment access.
 */
import type { CustomerProjectEventType } from './eventTypes';

export interface CustomerEventCopy {
  titleAr: string;
  titleEn: string;
  bodyAr: string;
  bodyEn: string;
  /** Optional transactional-email template name (if a template exists). */
  emailTemplate?: string;
}

export const CUSTOMER_EVENT_COPY: Record<CustomerProjectEventType, CustomerEventCopy> = {
  'quotation.sent': {
    titleAr: 'عرض السعر جاهز للمراجعة',
    titleEn: 'Your quotation is ready for review',
    bodyAr: 'تم إرسال عرض السعر إليك. يمكنك مراجعته من خلال الرابط الآمن.',
    bodyEn: 'A quotation has been sent to you. Use the secure link to review it.',
    emailTemplate: 'customer-quotation-ready',
  },
  'quotation.viewed': {
    titleAr: 'تمت مشاهدة عرض السعر',
    titleEn: 'Quotation viewed',
    bodyAr: 'تم تسجيل مشاهدة عرض السعر.',
    bodyEn: 'Your quotation view has been recorded.',
  },
  'quotation.approved': {
    titleAr: 'تم اعتماد عرض السعر',
    titleEn: 'Your quotation has been approved',
    bodyAr: 'شكراً لاعتماد عرض السعر. سنبدأ إجراءات العقد قريباً.',
    bodyEn: 'Thank you for approving the quotation. Contract steps will follow shortly.',
    emailTemplate: 'customer-quotation-approved',
  },
  'quotation.rejected': {
    titleAr: 'تم رفض عرض السعر',
    titleEn: 'Quotation rejected',
    bodyAr: 'تم تسجيل رفض عرض السعر.',
    bodyEn: 'Your quotation rejection has been recorded.',
  },
  'quotation.expiring_soon': {
    titleAr: 'عرض السعر على وشك الانتهاء',
    titleEn: 'Your quotation is expiring soon',
    bodyAr: 'يرجى مراجعة عرض السعر قبل انتهاء صلاحيته.',
    bodyEn: 'Please review your quotation before it expires.',
  },
  'contract.draft_created': {
    titleAr: 'تم إنشاء مسودة العقد',
    titleEn: 'Contract draft created',
    bodyAr: 'تم إعداد مسودة العقد الخاصة بمشروعك.',
    bodyEn: 'A draft contract has been prepared for your project.',
  },
  'contract.sent': {
    titleAr: 'تم إرسال العقد للمراجعة',
    titleEn: 'Contract sent for review',
    bodyAr: 'تم إرسال العقد إليك للمراجعة والتوقيع.',
    bodyEn: 'Your contract has been sent for review and signature.',
  },
  'contract.signed': {
    titleAr: 'تم توقيع العقد',
    titleEn: 'Contract signed',
    bodyAr: 'تم توقيع العقد بنجاح.',
    bodyEn: 'Your contract has been signed successfully.',
  },
  'contract.activated': {
    titleAr: 'تم تفعيل العقد',
    titleEn: 'Contract activated',
    bodyAr: 'العقد الآن مفعّل وسيبدأ التنفيذ.',
    bodyEn: 'Your contract is now active and execution will begin.',
  },
  'work_order.created': {
    titleAr: 'تم إنشاء أمر العمل الخاص بك',
    titleEn: 'Your work order has been created',
    bodyAr: 'تم تسجيل مشروعك وبدء التحضير له.',
    bodyEn: 'Your project has been registered and preparation has started.',
    emailTemplate: 'customer-work-order-created',
  },
  'work_order.measurements_started': {
    titleAr: 'بدأت مرحلة القياسات',
    titleEn: 'Measurements have started',
    bodyAr: 'تم بدء مرحلة القياسات لمشروعك.',
    bodyEn: 'The measurements phase of your project has started.',
  },
  'work_order.measurements_completed': {
    titleAr: 'اكتملت مرحلة القياسات',
    titleEn: 'Measurements completed',
    bodyAr: 'تم إكمال القياسات الخاصة بمشروعك.',
    bodyEn: 'Measurements for your project have been completed.',
  },
  'work_order.production_started': {
    titleAr: 'بدأ تنفيذ المشروع',
    titleEn: 'Production has started',
    bodyAr: 'بدأت مرحلة التصنيع لمشروعك.',
    bodyEn: 'Production has started on your project.',
  },
  'work_order.qc_started': {
    titleAr: 'بدأت مرحلة فحص الجودة',
    titleEn: 'Quality control started',
    bodyAr: 'دخل مشروعك مرحلة فحص الجودة.',
    bodyEn: 'Your project has entered quality control.',
  },
  'work_order.ready_for_installation': {
    titleAr: 'المشروع جاهز للتركيب',
    titleEn: 'Your project is ready for installation',
    bodyAr: 'تم اكتمال التصنيع، وأصبح المشروع جاهزاً للتركيب.',
    bodyEn: 'Production is complete and your project is ready for installation.',
  },
  'work_order.installation_scheduled': {
    titleAr: 'تم جدولة موعد التركيب',
    titleEn: 'Installation scheduled',
    bodyAr: 'تم جدولة موعد تركيب مشروعك.',
    bodyEn: 'Your installation appointment has been scheduled.',
  },
  'work_order.completed': {
    titleAr: 'تم اكتمال المشروع',
    titleEn: 'Your project has been completed',
    bodyAr: 'تم إنجاز مشروعك بنجاح. شكراً لثقتك.',
    bodyEn: 'Your project has been completed successfully. Thank you for trusting us.',
    emailTemplate: 'customer-work-order-completed',
  },
  'installation.scheduled': {
    titleAr: 'تم تحديد موعد التركيب',
    titleEn: 'Installation appointment scheduled',
    bodyAr: 'تم تحديد موعد لتركيب مشروعك. يمكنك تأكيد الموعد من خلال الرابط الآمن.',
    bodyEn: 'An installation appointment has been scheduled for your project. You can confirm it through your secure link.',
    emailTemplate: 'customer-installation-scheduled',
  },
  'installation.confirmed': {
    titleAr: 'تم تأكيد موعد التركيب',
    titleEn: 'Installation appointment confirmed',
    bodyAr: 'تم تأكيد موعد التركيب. سنتواصل معك قبل الموعد.',
    bodyEn: 'Your installation appointment is confirmed. We will contact you before the visit.',
    emailTemplate: 'customer-installation-confirmed',
  },
  'installation.reschedule_requested': {
    titleAr: 'تم استلام طلب إعادة الجدولة',
    titleEn: 'Reschedule request received',
    bodyAr: 'استلمنا طلبك بإعادة جدولة موعد التركيب وسنعود إليك قريباً.',
    bodyEn: 'We received your request to reschedule the installation and will get back to you shortly.',
    emailTemplate: 'customer-installation-reschedule-requested',
  },
  'installation.completed': {
    titleAr: 'تم اكتمال التركيب',
    titleEn: 'Installation completed',
    bodyAr: 'تم تنفيذ التركيب بنجاح. شكراً لثقتك.',
    bodyEn: 'Your installation has been completed successfully. Thank you for trusting us.',
    emailTemplate: 'customer-installation-completed',
  },
  'customer_visible_attachment_added': {
    titleAr: 'تمت إضافة مرفق جديد لمشروعك',
    titleEn: 'A new attachment was added to your project',
    bodyAr: 'يمكنك مراجعة المرفقات المتاحة من خلال الرابط الآمن.',
    bodyEn: 'You can review the available attachments through your secure link.',
  },
};

export function getCustomerEventCopy(event: CustomerProjectEventType): CustomerEventCopy {
  return CUSTOMER_EVENT_COPY[event];
}