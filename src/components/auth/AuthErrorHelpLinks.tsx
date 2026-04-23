import React from 'react';
import { HelpCircle, LifeBuoy, UserPlus, KeyRound, Mail } from 'lucide-react';
import type { AuthHelpLink } from '@/services/auth/errorMessages';

interface AuthErrorHelpLinksProps {
  links: AuthHelpLink[];
  onAction?: (action: string) => void;
}

const ACTION_ICONS: Record<string, React.ElementType> = {
  contact: LifeBuoy,
  'forgot-password': KeyRound,
  register: UserPlus,
  'resend-confirmation': Mail,
};

export const AuthErrorHelpLinks: React.FC<AuthErrorHelpLinksProps> = ({ links, onAction }) => {
  if (!links.length) return null;

  return (
    <div className="flex flex-wrap items-center gap-x-3 gap-y-1 mt-1.5">
      {links.map((link, i) => {
        const Icon = (link.action && ACTION_ICONS[link.action]) || HelpCircle;

        if (link.href) {
          return (
            <a
              key={i}
              href={link.href}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1 text-[11px] text-accent hover:underline font-medium transition-colors"
            >
              <Icon className="w-3 h-3 shrink-0" />
              {link.label}
            </a>
          );
        }

        return (
          <button
            key={i}
            type="button"
            onClick={() => link.action && onAction?.(link.action)}
            className="inline-flex items-center gap-1 text-[11px] text-accent hover:underline font-medium transition-colors"
          >
            <Icon className="w-3 h-3 shrink-0" />
            {link.label}
          </button>
        );
      })}
    </div>
  );
};