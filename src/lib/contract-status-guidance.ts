/**
 * CT4B — Per-status guidance and allowed action hints for contracts.
 *
 * Pure metadata — no side effects, no DB lookups. The actual permission
 * checks (lock guard, RLS, RPCs like accept_contract /
 * send_contract_for_approval) remain the source of truth. This file just
 * helps the UI explain "what does this status mean and what can I do next?"
 * in the user's language.
 */
import type { ContractStatus } from './contract-statuses';

export interface StatusGuidance {
  meaning_ar: string;
  meaning_en: string;
  next_actions_ar: string[];
  next_actions_en: string[];
  /** UI-only flag: whether the official BOQ/terms are frozen at this status. */
  locked: boolean;
  /** Short lock notice (only filled when `locked`). */
  lock_notice_ar?: string;
  lock_notice_en?: string;
}

const GUIDANCE: Record<ContractStatus, StatusGuidance> = {
  draft: {
    meaning_ar: 'العقد قيد الإعداد ولم يُرسل بعد. يمكن تعديله بالكامل.',
    meaning_en: 'The contract is being prepared and has not been sent yet. Fully editable.',
    next_actions_ar: ['تعديل البيانات والبنود', 'تغيير القالب أو طريقة التسعير', 'إرسال للمراجعة'],
    next_actions_en: ['Edit details and items', 'Change template or pricing method', 'Send for approval'],
    locked: false,
  },
  pending_approval: {
    meaning_ar: 'تم إرسال العقد وبانتظار قبول الطرف الآخر.',
    meaning_en: 'The contract is sent and waiting for the other party to accept.',
    next_actions_ar: ['الاطلاع على العقد', 'القبول إذا كنت طرفًا فيه', 'إلغاء قبل القبول إن لزم'],
    next_actions_en: ['Review the contract', 'Accept if you are a party', 'Cancel before acceptance if needed'],
    locked: true,
    lock_notice_ar: 'لا يمكن تعديل البنود الرسمية بعد الإرسال إلا بإلغاء العقد أو ملحق رسمي بعد التفعيل.',
    lock_notice_en: 'Official items cannot be edited once sent — cancel before approval or use an amendment after activation.',
  },
  active: {
    meaning_ar: 'العقد مفعّل بعد قبول الطرفين. التعديلات الرسمية تتم عبر ملحق عقد فقط.',
    meaning_en: 'The contract is active after both parties accepted. Formal changes require an amendment.',
    next_actions_ar: ['متابعة المراحل والدفعات', 'إنشاء ملحق عقد', 'إكمال أو إلغاء أو فتح نزاع'],
    next_actions_en: ['Track milestones & payments', 'Create an amendment', 'Complete, cancel, or dispute'],
    locked: true,
    lock_notice_ar: 'بعد تفعيل العقد، لا يمكن تعديل البنود الرسمية إلا عبر ملحق عقد.',
    lock_notice_en: 'Once active, official items can only change through a formal amendment.',
  },
  completed: {
    meaning_ar: 'تم إنجاز العقد بالكامل. يمكن الاطلاع وتنزيل النسخة الرسمية.',
    meaning_en: 'The contract has been fully delivered. View only and export the official PDF.',
    next_actions_ar: ['عرض العقد', 'تنزيل PDF الرسمي'],
    next_actions_en: ['View the contract', 'Download the official PDF'],
    locked: true,
  },
  cancelled: {
    meaning_ar: 'تم إلغاء العقد.',
    meaning_en: 'The contract was cancelled.',
    next_actions_ar: ['عرض العقد فقط'],
    next_actions_en: ['View only'],
    locked: true,
  },
  disputed: {
    meaning_ar: 'العقد في حالة نزاع. تواصل مع الدعم لحل القضية.',
    meaning_en: 'The contract is in dispute. Contact support to resolve.',
    next_actions_ar: ['عرض العقد', 'فتح طلب دعم', 'تسجيل ملاحظات'],
    next_actions_en: ['View the contract', 'Open a support ticket', 'Log notes'],
    locked: true,
  },
};

export function getStatusGuidance(status: string | null | undefined): StatusGuidance {
  if (!status) return GUIDANCE.draft;
  return (GUIDANCE as Record<string, StatusGuidance>)[status] ?? GUIDANCE.draft;
}