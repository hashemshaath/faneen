/**
 * Opportunity lifecycle messaging catalog (bilingual AR/EN).
 *
 * Single source of truth for non-email channels (in-app fallback text,
 * WhatsApp template body, SMS body). The in-app notifications themselves
 * are created by the database function `notify_admins_opportunity_event`
 * (see migration 20260620). This catalog mirrors those strings so that
 * when WhatsApp / SMS providers are wired (Meta WhatsApp Cloud API,
 * GatewayAPI) the message bodies are already approved and bilingual.
 *
 * Channels:
 *   - whatsapp: short, friendly, with CTA URL
 *   - sms:      compact (≤ 160 chars in each language) for cost control
 *
 * Recipient roles:
 *   - client:   the user that submitted the opportunity (quote_requests.user_id)
 *   - provider: the business owner that is matched / bid / awarded
 *   - admin:    operations team
 */

export type OpportunityEventType =
  | 'created'
  | 'provider_matched'
  | 'assigned'
  | 'bid_submitted'
  | 'bid_revised'
  | 'awarded'
  | 'award_lost'
  | 'contract_created'
  | 'opportunity_cancelled'
  | 'opportunity_expired';

export type OpportunityRecipientRole = 'client' | 'provider' | 'admin';

export type OpportunityChannel = 'whatsapp' | 'sms';

export interface OpportunityMessageContext {
  /** Public reference id of the opportunity (e.g. OPP-1000123). */
  ref: string;
  /** Absolute or app-relative URL the user should open. */
  url?: string;
  /** Optional friendly display name (client name, provider name). */
  name?: string;
}

export interface BilingualMessage {
  ar: string;
  en: string;
}

type Builder = (ctx: OpportunityMessageContext) => BilingualMessage;

const trim = (s: string) => s.replace(/\s+/g, ' ').trim();
const withUrl = (body: BilingualMessage, url?: string): BilingualMessage =>
  url
    ? { ar: trim(`${body.ar} ${url}`), en: trim(`${body.en} ${url}`) }
    : { ar: trim(body.ar), en: trim(body.en) };

/** Compact registry: builder per (event, role, channel). Missing entries
 *  fall back to the SMS body for that event+role. */
type Key = `${OpportunityEventType}:${OpportunityRecipientRole}:${OpportunityChannel}`;

const REGISTRY: Partial<Record<Key, Builder>> = {
  // created — client confirmation
  'created:client:whatsapp': ({ ref, url }) =>
    withUrl({
      ar: `استلمنا طلبك للفرصة ${ref}. جاري مطابقتك مع أفضل المزودين وسنُعلمك عند وصول أول عرض.`,
      en: `We received opportunity ${ref}. We're matching you with top providers and will notify you on the first bid.`,
    }, url),
  'created:client:sms': ({ ref }) => ({
    ar: `قِطاعات: استلمنا طلب الفرصة ${ref}. سنرسل لك أول عرض قريباً.`,
    en: `Qitaat: opportunity ${ref} received. We'll send the first bid shortly.`,
  }),

  // provider_matched
  'provider_matched:provider:whatsapp': ({ ref, url, name }) =>
    withUrl({
      ar: `${name ? name + '، ' : ''}فرصة جديدة مطابقة لنشاطك: ${ref}. سارع بتقديم عرضك لزيادة فرص الفوز.`,
      en: `${name ? name + ', ' : ''}new opportunity matched: ${ref}. Submit your bid quickly to maximize your chance.`,
    }, url),
  'provider_matched:provider:sms': ({ ref }) => ({
    ar: `قِطاعات: فرصة جديدة ${ref} مطابقة لنشاطك. قدّم عرضك الآن.`,
    en: `Qitaat: new matching opportunity ${ref}. Submit your bid now.`,
  }),

  // bid_submitted — client
  'bid_submitted:client:whatsapp': ({ ref, url }) =>
    withUrl({
      ar: `وصلك عرض جديد على الفرصة ${ref}. راجع التفاصيل واتخذ قرارك.`,
      en: `A new bid arrived on opportunity ${ref}. Review the details and decide.`,
    }, url),
  'bid_submitted:client:sms': ({ ref }) => ({
    ar: `قِطاعات: عرض جديد على الفرصة ${ref}.`,
    en: `Qitaat: new bid on opportunity ${ref}.`,
  }),

  // bid_revised — client
  'bid_revised:client:whatsapp': ({ ref, url }) =>
    withUrl({
      ar: `تم تحديث أحد العروض على الفرصة ${ref}. قارن وتحقق من النسخة الأحدث.`,
      en: `A bid on opportunity ${ref} was updated. Compare and review the latest version.`,
    }, url),
  'bid_revised:client:sms': ({ ref }) => ({
    ar: `قِطاعات: تم تحديث عرض على الفرصة ${ref}.`,
    en: `Qitaat: a bid on opportunity ${ref} was revised.`,
  }),

  // awarded — provider winner
  'awarded:provider:whatsapp': ({ ref, url, name }) =>
    withUrl({
      ar: `${name ? name + '، ' : ''}مبروك! تم تعميد عرضك على الفرصة ${ref}. الخطوة التالية: مراجعة العقد المبدئي.`,
      en: `${name ? name + ', ' : ''}congratulations — your bid was awarded on opportunity ${ref}. Next step: review the draft contract.`,
    }, url),
  'awarded:provider:sms': ({ ref }) => ({
    ar: `قِطاعات: مبروك، تم تعميد عرضك على ${ref}.`,
    en: `Qitaat: congrats, your bid was awarded on ${ref}.`,
  }),

  // award_lost — losing providers
  'award_lost:provider:whatsapp': ({ ref, url }) =>
    withUrl({
      ar: `لم يقع الاختيار على عرضك في الفرصة ${ref}. شكراً لمشاركتك، نتمنى لك التوفيق في الفرص القادمة.`,
      en: `Your bid was not selected for opportunity ${ref}. Thank you for participating — wishing you luck on upcoming opportunities.`,
    }, url),
  'award_lost:provider:sms': ({ ref }) => ({
    ar: `قِطاعات: لم يقع الاختيار على عرضك في الفرصة ${ref}.`,
    en: `Qitaat: your bid on ${ref} was not selected.`,
  }),

  // contract_created — client & provider
  'contract_created:client:whatsapp': ({ ref, url }) =>
    withUrl({
      ar: `تم إنشاء عقد مبدئي من الفرصة ${ref}. راجع البنود وقم بالتوقيع.`,
      en: `A draft contract was created from opportunity ${ref}. Review the terms and sign.`,
    }, url),
  'contract_created:client:sms': ({ ref }) => ({
    ar: `قِطاعات: تم إنشاء عقد مبدئي من ${ref}.`,
    en: `Qitaat: draft contract created from ${ref}.`,
  }),
  'contract_created:provider:whatsapp': ({ ref, url }) =>
    withUrl({
      ar: `تم إنشاء عقد مبدئي من الفرصة ${ref}. راجع البنود وأكمل الإجراءات مع العميل.`,
      en: `A draft contract was created from opportunity ${ref}. Review the terms and proceed with the client.`,
    }, url),
  'contract_created:provider:sms': ({ ref }) => ({
    ar: `قِطاعات: تم إنشاء عقد مبدئي من ${ref}.`,
    en: `Qitaat: draft contract created from ${ref}.`,
  }),

  // opportunity_cancelled
  'opportunity_cancelled:client:whatsapp': ({ ref }) => ({
    ar: `تم إلغاء الفرصة ${ref}. إذا كان ذلك بالخطأ تواصل مع الدعم.`,
    en: `Opportunity ${ref} was cancelled. If this was a mistake please contact support.`,
  }),
  'opportunity_cancelled:client:sms': ({ ref }) => ({
    ar: `قِطاعات: تم إلغاء الفرصة ${ref}.`,
    en: `Qitaat: opportunity ${ref} was cancelled.`,
  }),
  'opportunity_cancelled:provider:whatsapp': ({ ref }) => ({
    ar: `تم إلغاء الفرصة ${ref} من قِبل العميل. لا حاجة لإجراء إضافي.`,
    en: `Opportunity ${ref} was cancelled by the client. No further action needed.`,
  }),
  'opportunity_cancelled:provider:sms': ({ ref }) => ({
    ar: `قِطاعات: تم إلغاء الفرصة ${ref}.`,
    en: `Qitaat: opportunity ${ref} was cancelled.`,
  }),

  // opportunity_expired
  'opportunity_expired:client:whatsapp': ({ ref, url }) =>
    withUrl({
      ar: `انتهت صلاحية الفرصة ${ref} دون تعميد. يمكنك إعادة فتحها أو إنشاء فرصة جديدة.`,
      en: `Opportunity ${ref} expired without an award. You can reopen it or create a new one.`,
    }, url),
  'opportunity_expired:client:sms': ({ ref }) => ({
    ar: `قِطاعات: انتهت صلاحية الفرصة ${ref}.`,
    en: `Qitaat: opportunity ${ref} expired.`,
  }),
  'opportunity_expired:provider:whatsapp': ({ ref }) => ({
    ar: `انتهت صلاحية الفرصة ${ref} دون تعميد.`,
    en: `Opportunity ${ref} expired without an award.`,
  }),
  'opportunity_expired:provider:sms': ({ ref }) => ({
    ar: `قِطاعات: انتهت صلاحية الفرصة ${ref}.`,
    en: `Qitaat: opportunity ${ref} expired.`,
  }),
};

/**
 * Build a bilingual message body for the given event + role + channel.
 * Returns `null` when there is no template (caller should silently skip).
 */
export function buildOpportunityMessage(
  event: OpportunityEventType,
  role: OpportunityRecipientRole,
  channel: OpportunityChannel,
  ctx: OpportunityMessageContext,
): BilingualMessage | null {
  const direct = REGISTRY[`${event}:${role}:${channel}` as Key];
  if (direct) return direct(ctx);
  // Fallback: try the SMS variant for the same event+role.
  const fallback = REGISTRY[`${event}:${role}:sms` as Key];
  return fallback ? fallback(ctx) : null;
}

/** All event types covered by this catalog. Used by tests. */
export const OPPORTUNITY_EVENT_TYPES: readonly OpportunityEventType[] = [
  'created',
  'provider_matched',
  'assigned',
  'bid_submitted',
  'bid_revised',
  'awarded',
  'award_lost',
  'contract_created',
  'opportunity_cancelled',
  'opportunity_expired',
] as const;