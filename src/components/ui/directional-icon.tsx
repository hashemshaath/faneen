import { useLanguage } from '@/i18n/LanguageContext';
import {
  ArrowLeft, ArrowRight, ChevronLeft, ChevronRight, MoveLeft, MoveRight,
  type LucideIcon,
} from 'lucide-react';
import type { ComponentProps } from 'react';

/**
 * Direction-aware navigational icons. Pass `kind` and we render the icon
 * pointing toward the *natural* destination in the active direction.
 * Logos and non-directional icons should NOT use this helper.
 */
export type DirectionalIconKind = 'back' | 'next' | 'prev' | 'forward';

const map: Record<DirectionalIconKind, { ltr: LucideIcon; rtl: LucideIcon }> = {
  back:    { ltr: ArrowLeft,    rtl: ArrowRight   },
  next:    { ltr: ChevronRight, rtl: ChevronLeft  },
  prev:    { ltr: ChevronLeft,  rtl: ChevronRight },
  forward: { ltr: MoveRight,    rtl: MoveLeft     },
};

export interface DirectionalIconProps extends ComponentProps<LucideIcon> {
  kind: DirectionalIconKind;
}

export const DirectionalIcon = ({ kind, ...rest }: DirectionalIconProps) => {
  const { isRTL } = useLanguage();
  const Icon = map[kind][isRTL ? 'rtl' : 'ltr'];
  return <Icon {...rest} />;
};