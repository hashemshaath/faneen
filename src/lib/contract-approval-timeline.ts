/**
 * Pure helper that derives a read-only approval-lifecycle timeline from
 * existing contract fields. Does NOT mutate or change any contract status.
 *
 * Some columns (sent_for_approval_at, disputed_at) do not exist on the
 * contracts table — they are inferred from `status` + `updated_at` as a
 * best-effort fallback. Callers should treat those timestamps as approximate.
 */

export type ApprovalStepStatus = 'done' | 'current' | 'pending' | 'blocked';

export interface ApprovalStep {
  key: string;
  labelAr: string;
  labelEn: string;
  status: ApprovalStepStatus;
  timestamp?: string | null;
  descriptionAr: string;
  descriptionEn: string;
}

export interface ApprovalTimelineInput {
  status: string;
  client_accepted_at?: string | null;
  provider_accepted_at?: string | null;
  created_at?: string | null;
  updated_at?: string | null;
  sent_for_approval_at?: string | null;
  locked_at?: string | null;
  completed_at?: string | null;
  cancelled_at?: string | null;
  disputed_at?: string | null;
}

export function getContractApprovalTimeline(c: ApprovalTimelineInput): ApprovalStep[] {
  const status = c.status;
  const isCancelled = status === 'cancelled';
  const isDisputed = status === 'disputed';
  const isCompleted = status === 'completed';
  const isActive = status === 'active';
  const isPending = status === 'pending_approval';
  const isDraft = status === 'draft';

  // Inferred (column does not exist): pending_approval/active means it was sent
  const sentAt =
    c.sent_for_approval_at ??
    (isPending || isActive || isCompleted ? c.updated_at ?? null : null);

  const steps: ApprovalStep[] = [];

  steps.push({
    key: 'draft',
    labelAr: 'إنشاء المسودة',
    labelEn: 'Draft created',
    status: 'done',
    timestamp: c.created_at,
    descriptionAr: 'تم إنشاء مسودة العقد.',
    descriptionEn: 'Contract draft was created.',
  });

  steps.push({
    key: 'sent',
    labelAr: 'إرسال للموافقة',
    labelEn: 'Sent for approval',
    status: sentAt ? 'done' : isDraft ? 'current' : 'pending',
    timestamp: sentAt,
    descriptionAr: 'تم إرسال العقد لمراجعة الأطراف.',
    descriptionEn: 'Contract was sent to parties for review.',
  });

  steps.push({
    key: 'provider_approved',
    labelAr: 'موافقة المزود',
    labelEn: 'Provider approved',
    status: c.provider_accepted_at ? 'done' : isPending ? 'current' : 'pending',
    timestamp: c.provider_accepted_at,
    descriptionAr: 'وافق المزود على بنود العقد.',
    descriptionEn: 'Provider accepted the contract terms.',
  });

  steps.push({
    key: 'client_approved',
    labelAr: 'موافقة العميل',
    labelEn: 'Client approved',
    status: c.client_accepted_at ? 'done' : isPending ? 'current' : 'pending',
    timestamp: c.client_accepted_at,
    descriptionAr: 'وافق العميل على بنود العقد.',
    descriptionEn: 'Client accepted the contract terms.',
  });

  steps.push({
    key: 'active',
    labelAr: 'تفعيل العقد',
    labelEn: 'Contract active',
    status: isActive
      ? 'current'
      : isCompleted
        ? 'done'
        : isCancelled || isDisputed
          ? 'blocked'
          : 'pending',
    timestamp: c.locked_at,
    descriptionAr: 'العقد مفعل ومقفل، التعديل عبر ملحق رسمي.',
    descriptionEn: 'Contract is active and locked; changes require an amendment.',
  });

  if (isCompleted) {
    steps.push({
      key: 'completed',
      labelAr: 'اكتمل',
      labelEn: 'Completed',
      status: 'done',
      timestamp: c.completed_at,
      descriptionAr: 'تم تنفيذ العقد بالكامل.',
      descriptionEn: 'Contract has been fully executed.',
    });
  } else if (isCancelled) {
    steps.push({
      key: 'cancelled',
      labelAr: 'ملغى',
      labelEn: 'Cancelled',
      status: 'blocked',
      timestamp: c.cancelled_at,
      descriptionAr: 'تم إلغاء العقد.',
      descriptionEn: 'Contract was cancelled.',
    });
  } else if (isDisputed) {
    steps.push({
      key: 'disputed',
      labelAr: 'محل نزاع',
      labelEn: 'Disputed',
      status: 'blocked',
      timestamp: c.disputed_at ?? c.updated_at ?? null,
      descriptionAr: 'العقد محل نزاع بين الأطراف.',
      descriptionEn: 'Contract is currently disputed.',
    });
  }

  return steps;
}

export function getContractStatusGuidanceLine(
  status: string,
  isRTL: boolean,
): string {
  const map: Record<string, { ar: string; en: string }> = {
    draft: { ar: 'العقد مسودة ويمكن تعديله.', en: 'Contract is a draft and can still be edited.' },
    pending_approval: { ar: 'بانتظار موافقة الأطراف.', en: 'Waiting for parties to approve.' },
    active: { ar: 'العقد مفعل، وأي تعديل رسمي يتم عبر ملحق.', en: 'Contract is active; changes require a formal amendment.' },
    completed: { ar: 'العقد مكتمل.', en: 'Contract is completed.' },
    cancelled: { ar: 'العقد ملغى.', en: 'Contract was cancelled.' },
    disputed: { ar: 'العقد محل نزاع.', en: 'Contract is disputed.' },
  };
  const entry = map[status] ?? map.draft;
  return isRTL ? entry.ar : entry.en;
}

/* ── Last / Next Action Summary (display only) ───────────────────────────── */

export type NextActionTone = 'muted' | 'info' | 'success' | 'warning' | 'destructive';

export interface NextActionSummary {
  tone: NextActionTone;
  labelAr: string;
  labelEn: string;
  descriptionAr: string;
  descriptionEn: string;
  timestamp?: string | null;
  actionHintAr?: string;
  actionHintEn?: string;
}

export interface NextActionInput {
  status: string;
  client_accepted_at?: string | null;
  provider_accepted_at?: string | null;
  updated_at?: string | null;
  locked_at?: string | null;
  completed_at?: string | null;
  cancelled_at?: string | null;
  disputed_at?: string | null;
}

/**
 * Pure helper that derives a short "what's the current next action?" summary
 * from existing contract fields. Display only — no mutation, no DB calls.
 */
export function getContractNextActionSummary(
  c: NextActionInput,
  _isRTL: boolean = false,
): NextActionSummary {
  const status = c.status;

  if (status === 'pending_approval') {
    const p = !!c.provider_accepted_at;
    const cl = !!c.client_accepted_at;
    if (p && !cl) {
      return {
        tone: 'warning',
        labelAr: 'بانتظار موافقة العميل',
        labelEn: 'Waiting for client approval',
        descriptionAr: 'وافق المزود، ولم يوافق العميل بعد.',
        descriptionEn: 'Provider approved; client has not approved yet.',
        timestamp: c.provider_accepted_at ?? c.updated_at ?? null,
        actionHintAr: 'تواصل مع العميل لإكمال الموافقة.',
        actionHintEn: 'Follow up with the client to complete approval.',
      };
    }
    if (cl && !p) {
      return {
        tone: 'warning',
        labelAr: 'بانتظار موافقة المزود',
        labelEn: 'Waiting for provider approval',
        descriptionAr: 'وافق العميل، ولم يوافق المزود بعد.',
        descriptionEn: 'Client approved; provider has not approved yet.',
        timestamp: c.client_accepted_at ?? c.updated_at ?? null,
        actionHintAr: 'راجع البنود واعتمد العقد.',
        actionHintEn: 'Review the terms and approve the contract.',
      };
    }
    return {
      tone: 'info',
      labelAr: 'بانتظار موافقة الأطراف',
      labelEn: 'Waiting for parties to approve',
      descriptionAr: 'لم يتم استلام موافقة أي طرف بعد.',
      descriptionEn: 'No party has approved yet.',
      timestamp: c.updated_at ?? null,
      actionHintAr: 'ذكّر الأطراف بمراجعة العقد.',
      actionHintEn: 'Remind both parties to review the contract.',
    };
  }

  if (status === 'active') {
    return {
      tone: 'success',
      labelAr: 'العقد مفعل',
      labelEn: 'Contract is active',
      descriptionAr: 'العقد مقفل ضد التعديل المباشر.',
      descriptionEn: 'Contract is locked against direct edits.',
      timestamp: c.locked_at ?? c.updated_at ?? null,
      actionHintAr: 'أي تعديل رسمي يتم عبر ملحق.',
      actionHintEn: 'Formal changes go through an amendment.',
    };
  }

  if (status === 'completed') {
    return {
      tone: 'success',
      labelAr: 'العقد مكتمل',
      labelEn: 'Contract completed',
      descriptionAr: 'تم تنفيذ العقد بالكامل.',
      descriptionEn: 'Contract has been fully executed.',
      timestamp: c.completed_at ?? c.updated_at ?? null,
    };
  }

  if (status === 'cancelled') {
    return {
      tone: 'muted',
      labelAr: 'العقد ملغى',
      labelEn: 'Contract cancelled',
      descriptionAr: 'تم إلغاء العقد.',
      descriptionEn: 'Contract was cancelled.',
      timestamp: c.cancelled_at ?? c.updated_at ?? null,
    };
  }

  if (status === 'disputed') {
    return {
      tone: 'destructive',
      labelAr: 'العقد محل نزاع',
      labelEn: 'Contract disputed',
      descriptionAr: 'هناك نزاع مفتوح على هذا العقد.',
      descriptionEn: 'There is an open dispute on this contract.',
      timestamp: c.disputed_at ?? c.updated_at ?? null,
      actionHintAr: 'تواصل مع الطرف الآخر لحل النزاع.',
      actionHintEn: 'Coordinate with the other party to resolve the dispute.',
    };
  }

  // draft (default)
  return {
    tone: 'info',
    labelAr: 'مسودة',
    labelEn: 'Draft',
    descriptionAr: 'العقد لا يزال مسودة قابلة للتعديل.',
    descriptionEn: 'Contract is still an editable draft.',
    timestamp: c.updated_at ?? null,
    actionHintAr: 'راجع البيانات ثم أرسل العقد للموافقة.',
    actionHintEn: 'Review the details then send the contract for approval.',
  };
}