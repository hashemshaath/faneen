import { maskEmail } from '@/lib/masking';

export interface EmailLogRow {
  id: string;
  message_id: string | null;
  template_name: string | null;
  recipient_email: string | null;
  status: string;
  error_message: string | null;
  metadata: Record<string, unknown> | null;
  created_at: string;
}

/**
 * Deduplicate email_send_log rows by message_id, keeping the latest by created_at.
 * Rows without a message_id are kept as-is (cannot be correlated).
 */
export function dedupeByMessageId(rows: EmailLogRow[]): EmailLogRow[] {
  const latest = new Map<string, EmailLogRow>();
  const orphans: EmailLogRow[] = [];
  for (const row of rows) {
    if (!row.message_id) {
      orphans.push(row);
      continue;
    }
    const current = latest.get(row.message_id);
    if (!current || new Date(row.created_at).getTime() > new Date(current.created_at).getTime()) {
      latest.set(row.message_id, row);
    }
  }
  return [...latest.values(), ...orphans].sort(
    (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime(),
  );
}

export function maskRecipient(email: string | null | undefined, reveal: boolean): string {
  if (!email) return '—';
  return reveal ? email : maskEmail(email);
}

export function recipientDomain(email: string | null | undefined): string {
  if (!email || !email.includes('@')) return '—';
  return email.split('@')[1].toLowerCase();
}

/** Bucket a recipient email into a coarse provider/domain group (no PII). */
export function recipientDomainBucket(email: string | null | undefined): string {
  const d = recipientDomain(email);
  if (d === '—') return 'unknown';
  if (d === 'gmail.com' || d.endsWith('.gmail.com')) return 'gmail.com';
  if (
    d === 'outlook.com' || d === 'hotmail.com' || d === 'live.com' ||
    d === 'msn.com' || d.endsWith('.outlook.com')
  ) return 'outlook/hotmail';
  if (d === 'yahoo.com' || d.endsWith('.yahoo.com')) return 'yahoo.com';
  if (d === 'icloud.com' || d === 'me.com' || d === 'mac.com') return 'icloud.com';
  if (d.endsWith('.qitaat.com') || d === 'qitaat.com') return 'qitaat.com';
  if (d.endsWith('.sa')) return 'corporate (.sa)';
  if (d.endsWith('.gov') || d.endsWith('.gov.sa')) return 'government';
  if (d.endsWith('.edu') || d.endsWith('.edu.sa')) return 'education';
  return 'other corporate';
}

export const STATUS_TONE: Record<string, string> = {
  sent: 'bg-success/10 text-success border-success/30',
  pending: 'bg-info/10 text-info border-info/30',
  failed: 'bg-destructive/10 text-destructive border-destructive/30',
  dlq: 'bg-destructive/15 text-destructive border-destructive/40',
  bounced: 'bg-warning/10 text-warning border-warning/30',
  complained: 'bg-secondary/10 text-secondary border-secondary/30',
  suppressed: 'bg-muted text-muted-foreground border-border',
  rate_limited: 'bg-warning/10 text-warning border-warning/30',
};

export function statusTone(status: string): string {
  return STATUS_TONE[status] ?? 'bg-muted text-muted-foreground border-border';
}

export const DLQ_RECOMMENDATIONS: Record<string, { ar: string; en: string }> = {
  no_matching_sender: {
    ar: 'تحقّق من أن qitaat.com موثّق في Resend وأن عنوان الإرسال noreply@qitaat.com.',
    en: 'Verify qitaat.com is verified in Resend and the sender is noreply@qitaat.com.',
  },
  no_matching_sender_fresh: {
    ar: 'إذا تكرّر هذا الخطأ حديثاً، أعد نشر دوال البريد وتحقق من إعداد نطاق qitaat.com في Resend.',
    en: 'If fresh no_matching_sender recurs, redeploy email functions and verify qitaat.com in Resend.',
  },
  suppressed: {
    ar: 'المستلم في قائمة المنع (ارتداد/شكوى/إلغاء اشتراك). لا يُعاد الإرسال تلقائياً.',
    en: 'Recipient is suppressed (bounce/complaint/unsub). Will not auto-resend.',
  },
  unsubscribe: {
    ar: 'المستلم ألغى الاشتراك. يجب احترام التفضيل ولا تتم إعادة المحاولة.',
    en: 'Recipient unsubscribed. Respect preference; do not retry.',
  },
  rejected: {
    ar: 'المزود رفض الرسالة (محتوى/سمعة). راجع السبب في error_message.',
    en: 'Provider rejected (content/reputation). Inspect error_message.',
  },
  missing_template: {
    ar: 'القالب غير مسجّل في registry.ts — أضفه وأعد النشر.',
    en: 'Template missing from registry.ts — add and redeploy.',
  },
  rate_limited: {
    ar: 'تم تجاوز معدل الإرسال. سيتم إعادة المحاولة تلقائياً بعد فترة Retry-After.',
    en: 'Rate limit hit. Auto-retry after Retry-After window.',
  },
};

export function classifyError(message: string | null | undefined): keyof typeof DLQ_RECOMMENDATIONS | 'other' {
  if (!message) return 'other';
  const m = message.toLowerCase();
  if (m.includes('no_matching_sender') || m.includes('no email domain record')) return 'no_matching_sender';
  if (m.includes('suppress')) return 'suppressed';
  if (m.includes('unsubscrib')) return 'unsubscribe';
  if (m.includes('reject')) return 'rejected';
  if (m.includes('unknown email type') || m.includes('missing template') || m.includes('not found')) return 'missing_template';
  if (m.includes('429') || m.includes('rate')) return 'rate_limited';
  return 'other';
}

export const CURRENT_SENDER_DOMAIN = 'qitaat.com';
export const LEGACY_SENDER_DOMAINS = ['notify.qitaat.com', 'mail.qitaat.com'];
/** Window (hours) within which a no_matching_sender row is treated as a FRESH active issue. */
export const FRESH_NMS_WINDOW_HOURS = 48;

export type DlqDisposition =
  | 'retryable'
  | 'not_retryable_suppressed'
  | 'not_retryable_unsubscribed'
  | 'not_retryable_missing_template'
  | 'not_retryable_historical_sender'
  | 'not_retryable_other';

export interface DlqClassification {
  errorKind: keyof typeof DLQ_RECOMMENDATIONS | 'other';
  isHistorical: boolean;
  /** True when errorKind is no_matching_sender AND created within FRESH_NMS_WINDOW_HOURS. */
  isFreshNoMatchingSender: boolean;
  disposition: DlqDisposition;
  retryable: boolean;
  reasonAr: string;
  reasonEn: string;
}

/** Extract sender_domain from the raw error_message JSON if present. */
function extractSenderDomain(row: EmailLogRow): string | null {
  const meta = row.metadata as Record<string, unknown> | null;
  const fromMeta =
    (meta?.sender_domain as string | undefined) ??
    (meta?.senderDomain as string | undefined);
  if (fromMeta) return fromMeta;
  // best-effort scan of error message for known legacy domains
  const msg = (row.error_message ?? '').toLowerCase();
  for (const d of LEGACY_SENDER_DOMAINS) if (msg.includes(d)) return d;
  return null;
}

export function classifyDlqRow(row: EmailLogRow): DlqClassification {
  const errorKind = classifyError(row.error_message);
  const senderDomain = extractSenderDomain(row);
  const isLegacySender = senderDomain ? LEGACY_SENDER_DOMAINS.includes(senderDomain) : false;
  const ageHours = (Date.now() - new Date(row.created_at).getTime()) / 3_600_000;
  const isFreshNoMatchingSender =
    errorKind === 'no_matching_sender' &&
    !isLegacySender &&
    ageHours <= FRESH_NMS_WINDOW_HOURS;

  if (errorKind === 'no_matching_sender' || isLegacySender) {
    if (isFreshNoMatchingSender) {
      return {
        errorKind,
        isHistorical: false,
        isFreshNoMatchingSender: true,
        disposition: 'not_retryable_historical_sender',
        retryable: false,
        reasonAr: 'خطأ نشط: لم يُطابق مرسل موثّق (آخر 48 ساعة). أعد نشر دوال الإرسال وتأكد من qitaat.com في Resend.',
        reasonEn: 'Active issue: no matching verified sender (last 48h). Redeploy email functions and verify qitaat.com in Resend.',
      };
    }
    return {
      errorKind,
      isHistorical: true,
      isFreshNoMatchingSender: false,
      disposition: 'not_retryable_historical_sender',
      retryable: false,
      reasonAr: 'سجل تاريخي من نطاق مرسل قديم أو قبل التحقق — لا تتم إعادة المحاولة.',
      reasonEn: 'Historical record from a legacy/pre-verification sender — not retryable.',
    };
  }
  const isHistorical = false;
  if (errorKind === 'suppressed') {
    return {
      errorKind, isHistorical, isFreshNoMatchingSender: false, disposition: 'not_retryable_suppressed', retryable: false,
      reasonAr: 'المستلم في قائمة المنع — أزل المنع قبل المحاولة.',
      reasonEn: 'Recipient is suppressed — clear suppression first.',
    };
  }
  if (errorKind === 'unsubscribe') {
    return {
      errorKind, isHistorical, isFreshNoMatchingSender: false, disposition: 'not_retryable_unsubscribed', retryable: false,
      reasonAr: 'المستلم ألغى الاشتراك — لا تُعد المحاولة.',
      reasonEn: 'Recipient unsubscribed — do not retry.',
    };
  }
  if (errorKind === 'missing_template') {
    return {
      errorKind, isHistorical, isFreshNoMatchingSender: false, disposition: 'not_retryable_missing_template', retryable: false,
      reasonAr: 'القالب غير موجود في السجل — أصلح التسجيل أولاً.',
      reasonEn: 'Template missing from registry — fix registration first.',
    };
  }
  // rate_limited, rejected, other → safe to retry once
  return {
    errorKind,
    isHistorical,
    isFreshNoMatchingSender: false,
    disposition: 'retryable',
    retryable: true,
    reasonAr: 'يبدو خطأ مؤقتاً — يمكن إعادة المحاولة بحذر.',
    reasonEn: 'Looks transient — single retry is safe.',
  };
}