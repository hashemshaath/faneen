/**
 * BusinessIdentityStrip — unified pill row showing the three identity
 * basics: @username, primary phone, and membership tier.
 *
 * Used across the public business profile header, search cards, admin
 * lists, and notification detail pages. Always renders in the active
 * UI language and uses {@link getBusinessPrimaryPhone} for the phone
 * field so the value matches every other screen.
 */
import { AtSign, Crown, Phone } from 'lucide-react';
import { Link } from 'react-router-dom';
import { useLanguage } from '@/i18n/LanguageContext';
import { tierConfig } from '@/components/business-profile/business-profile.data';
import {
  getBusinessPrimaryPhone,
  type BusinessPhoneFields,
} from '@/lib/business/primaryPhone';

export interface BusinessIdentityStripBusiness extends BusinessPhoneFields {
  username?: string | null;
  membership_tier?: string | null;
}

interface Props {
  business: BusinessIdentityStripBusiness | null | undefined;
  /** `compact` ≈ search cards · `default` ≈ headers / detail pages. */
  size?: 'compact' | 'default';
  /** If false, the @username pill renders as plain text (no Link). */
  linkUsername?: boolean;
  className?: string;
}

export function BusinessIdentityStrip({
  business,
  size = 'default',
  linkUsername = true,
  className,
}: Props) {
  const { language } = useLanguage();
  if (!business) return null;

  const username = business.username?.trim() || null;
  const phone = getBusinessPrimaryPhone(business);
  const tier = business.membership_tier ? tierConfig[business.membership_tier] : null;

  if (!username && !phone && !tier) return null;

  const isAr = language === 'ar';
  const txt = size === 'compact' ? 'text-[10px]' : 'text-[10px] sm:text-[11px]';
  const pad = size === 'compact' ? 'px-1.5 py-0.5' : 'px-2 py-0.5';

  const usernamePill = username ? (
    <span
      className={`inline-flex items-center gap-1 rounded-full border border-border/40 bg-muted/40 ${pad} ${txt} text-foreground`}
      title={isAr ? 'اسم المستخدم' : 'Username'}
    >
      <AtSign className="h-3 w-3 text-accent" />
      <span className="tech-content font-medium">{username}</span>
    </span>
  ) : null;

  return (
    <div
      className={`flex flex-wrap items-center gap-1.5 sm:gap-2 ${className ?? ''}`}
      data-testid="business-identity-strip"
    >
      {username && (linkUsername ? (
        <Link
          to={`/${username}`}
          onClick={(e) => e.stopPropagation()}
          className="hover:opacity-80 transition-opacity"
          aria-label={isAr ? `الانتقال إلى صفحة ${username}` : `Open ${username} profile`}
        >
          {usernamePill}
        </Link>
      ) : usernamePill)}

      {phone && (
        <a
          href={`tel:${phone}`}
          onClick={(e) => e.stopPropagation()}
          className={`inline-flex items-center gap-1 rounded-full border border-border/40 bg-muted/40 ${pad} ${txt} text-foreground hover:bg-accent/10 hover:border-accent/30 transition-colors`}
          title={isAr ? 'الرقم الرئيسي' : 'Primary phone'}
        >
          <Phone className="h-3 w-3 text-accent" />
          <span className="tech-content font-medium" dir="ltr">{phone}</span>
        </a>
      )}

      {tier && (
        <span
          className={`inline-flex items-center gap-1 rounded-full border border-accent/30 bg-accent/10 ${pad} ${txt} text-accent font-semibold`}
          title={isAr ? 'نوع العضوية' : 'Membership tier'}
        >
          <Crown className="h-3 w-3" />
          {isAr ? tier.labelAr : tier.label}
        </span>
      )}
    </div>
  );
}

export default BusinessIdentityStrip;