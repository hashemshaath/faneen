/**
 * SERVICE-ACTIVATION-GOVERNANCE-3 — Phase E
 *
 * In-app notifications for provider-service activation governance.
 * Reuses the canonical fire-and-forget notification primitive.
 * Never throws. Never sends email.
 */
import { createNotificationFireAndForget } from '@/modules/notifications';

export type ServiceActivationEvent =
  | 'provider_service_activation_requested'
  | 'provider_service_activation_approved'
  | 'provider_service_activation_rejected'
  | 'provider_service_suspended_by_admin'
  | 'provider_service_restored_by_admin'
  | 'provider_service_requires_upgrade'
  | 'membership_change_affected_services';

export interface ServiceActivationNotificationInput {
  user_id: string;
  event: ServiceActivationEvent;
  business_service_id: string;
  business_id: string;
  service_name_ar: string;
  service_name_en?: string | null;
  reason?: string | null;
  required_plan_tier?: string | null;
}

function compose(
  event: ServiceActivationEvent,
  serviceName: string,
  reason: string | null | undefined,
  tier: string | null | undefined,
): { title_ar: string; title_en: string; body_ar: string; body_en: string } {
  switch (event) {
    case 'provider_service_activation_requested':
      return {
        title_ar: 'طلب تفعيل خدمة قيد المراجعة',
        title_en: 'Service activation requested',
        body_ar: `تم رفع طلب تفعيل خدمة ${serviceName} للمراجعة من قِبل الإدارة.`,
        body_en: `Activation request for service ${serviceName} is pending admin review.`,
      };
    case 'provider_service_activation_approved':
      return {
        title_ar: 'تم تفعيل الخدمة',
        title_en: 'Service activated',
        body_ar: `تم اعتماد تفعيل خدمة ${serviceName} لجهتك. أصبحت الخدمة مؤهلة للظهور حسب حالة العضوية والإعدادات.`,
        body_en: `Service ${serviceName} has been approved and is eligible to appear based on your membership and settings.`,
      };
    case 'provider_service_activation_rejected':
      return {
        title_ar: 'تم رفض تفعيل الخدمة',
        title_en: 'Service activation rejected',
        body_ar: `تم رفض طلب تفعيل خدمة ${serviceName}.${reason ? ` السبب: ${reason}` : ''}`,
        body_en: `Activation request for service ${serviceName} was rejected.${reason ? ` Reason: ${reason}` : ''}`,
      };
    case 'provider_service_suspended_by_admin':
      return {
        title_ar: 'تم إيقاف خدمة من الإدارة',
        title_en: 'Service suspended by admin',
        body_ar: `تم إيقاف خدمة ${serviceName} مؤقتًا من الإدارة.${reason ? ` السبب: ${reason}` : ''} يمكنك مراجعة الحالة من صفحة إدارة الخدمات.`,
        body_en: `Service ${serviceName} has been temporarily suspended by admin.${reason ? ` Reason: ${reason}` : ''} You can review the status from your services page.`,
      };
    case 'provider_service_restored_by_admin':
      return {
        title_ar: 'تمت استعادة الخدمة',
        title_en: 'Service restored',
        body_ar: `تمت استعادة خدمة ${serviceName}. يمكنك إدارتها من صفحة الخدمات.`,
        body_en: `Service ${serviceName} has been restored. You can manage it from your services page.`,
      };
    case 'provider_service_requires_upgrade':
      return {
        title_ar: 'الخدمة تتطلب ترقية',
        title_en: 'Service requires upgrade',
        body_ar: `خدمة ${serviceName} تتطلب ترقية العضوية${tier ? ` إلى باقة ${tier}` : ''} أو زيادة حدود الخدمات المفعلة.`,
        body_en: `Service ${serviceName} requires a membership upgrade${tier ? ` to the ${tier} plan` : ''} or a higher active-service limit.`,
      };
    case 'membership_change_affected_services':
      return {
        title_ar: 'تغيّر في حالة الخدمات بسبب العضوية',
        title_en: 'Service availability changed by membership',
        body_ar: 'تغيّرت حالة بعض خدماتك نتيجة تعديل العضوية. راجع صفحة الخدمات للتفاصيل.',
        body_en: 'Some of your services changed availability due to a membership change. Review your services page for details.',
      };
  }
}

export function notifyServiceActivationEvent(input: ServiceActivationNotificationInput): void {
  try {
    if (!input?.user_id || !input?.business_service_id) return;
    const name =
      input.service_name_ar?.trim() ||
      input.service_name_en?.trim() ||
      '—';
    const content = compose(input.event, name, input.reason ?? null, input.required_plan_tier ?? null);
    createNotificationFireAndForget(
      {
        user_id: input.user_id,
        title_ar: content.title_ar,
        title_en: content.title_en,
        body_ar: content.body_ar,
        body_en: content.body_en,
        notification_type: `provider_services.${input.event}`,
        reference_type: 'business_service',
        reference_id: input.business_service_id,
        action_url: '/dashboard/services',
      },
      `provider_services.notify[${input.event}]`,
    );
  } catch {
    // Never throw from notification path.
  }
}