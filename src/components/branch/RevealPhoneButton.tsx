import { useState } from 'react';
import { Phone, MessageCircle, Eye } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useLanguage } from '@/i18n/LanguageContext';
import { recordBranchEvent } from '@/hooks/useBranchVisits';

interface Props {
  branchId: string;
  label: string;
  value: string;
  kind: 'phone' | 'whatsapp';
}

/**
 * Hides a phone number behind a "tap to reveal" gesture. On reveal we record
 * a `phone_reveal` / `whatsapp_click` analytics event so providers can
 * measure intent without the visitor needing an account.
 */
export function RevealPhoneButton({ branchId, label, value, kind }: Props) {
  const { isRTL } = useLanguage();
  const [revealed, setRevealed] = useState(false);

  const digits = value.replace(/[^0-9]/g, '');
  const masked = `${value.slice(0, kind === 'whatsapp' ? 4 : 3)}••••${value.slice(-2)}`;

  const reveal = () => {
    if (revealed) return;
    setRevealed(true);
    recordBranchEvent(branchId, kind === 'whatsapp' ? 'whatsapp_click' : 'phone_reveal');
  };

  const Icon = kind === 'whatsapp' ? MessageCircle : Phone;
  const href = kind === 'whatsapp'
    ? `https://wa.me/${digits}`
    : `tel:${value}`;

  if (!revealed) {
    return (
      <button
        type="button"
        onClick={reveal}
        className="group flex items-start gap-3 text-sm w-full text-start hover:bg-muted/30 rounded-lg px-2 py-1 -mx-2 transition"
      >
        <Icon className="w-4 h-4 text-muted-foreground shrink-0 mt-0.5" />
        <div className="flex-1 min-w-0">
          <p className="text-[11px] uppercase tracking-wide text-muted-foreground">{label}</p>
          <p className="font-medium tech-content truncate flex items-center gap-2" dir="ltr">
            <span className="blur-[3px] select-none">{masked}</span>
            <span className="inline-flex items-center gap-1 text-[10px] font-semibold uppercase text-primary opacity-90 group-hover:opacity-100">
              <Eye className="w-3 h-3" />
              {isRTL ? 'اضغط للإظهار' : 'Tap to reveal'}
            </span>
          </p>
        </div>
      </button>
    );
  }

  return (
    <a
      href={href}
      target={kind === 'whatsapp' ? '_blank' : undefined}
      rel={kind === 'whatsapp' ? 'noopener noreferrer' : undefined}
      className="flex items-start gap-3 text-sm hover:bg-muted/30 rounded-lg px-2 py-1 -mx-2 transition"
    >
      <Icon className="w-4 h-4 text-primary shrink-0 mt-0.5" />
      <div className="flex-1 min-w-0">
        <p className="text-[11px] uppercase tracking-wide text-muted-foreground">{label}</p>
        <p className="font-medium tech-content truncate text-primary" dir="ltr">{value}</p>
      </div>
      <Button asChild size="sm" variant="ghost" className="h-7 px-2 text-[11px]" tabIndex={-1}>
        <span>{kind === 'whatsapp' ? (isRTL ? 'مراسلة' : 'Chat') : (isRTL ? 'اتصال' : 'Call')}</span>
      </Button>
    </a>
  );
}

export default RevealPhoneButton;