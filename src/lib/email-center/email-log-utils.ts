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
    ar: 'تحقّق من أن SENDER_DOMAIN في الدالة يطابق نطاقاً موثّقاً (e.qitaat.com).',
    en: 'Verify SENDER_DOMAIN matches a verified domain (e.qitaat.com).',
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