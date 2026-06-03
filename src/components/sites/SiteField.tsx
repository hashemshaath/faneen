import React from 'react';

/**
 * SiteField — unified read-only field for site detail page.
 * - Auto-hides when value is empty/whitespace.
 * - Forces LTR for technical content (phone, NAF short address).
 * - Uses dir="auto" for free text (name, district, address line) so
 *   Arabic and Latin both render correctly without flipping.
 * - Optional trailing action (e.g. tel: link).
 */
export type SiteFieldKind = 'text' | 'phone' | 'naf' | 'mono';

export interface SiteFieldProps {
  label: string;
  value: string | null | undefined;
  kind?: SiteFieldKind;
  multiline?: boolean;
  action?: { href: string; icon: React.ComponentType<{ className?: string }>; ariaLabel?: string };
}

function isBlank(v: string | null | undefined): boolean {
  return v == null || String(v).trim().length === 0;
}

export const SiteField: React.FC<SiteFieldProps> = ({ label, value, kind = 'text', multiline, action }) => {
  if (isBlank(value)) return null;
  const v = String(value).trim();
  const forceLtr = kind === 'phone' || kind === 'naf' || kind === 'mono';
  const mono = kind === 'phone' || kind === 'naf' || kind === 'mono';
  const Icon = action?.icon;

  return (
    <div className="flex items-start gap-4 text-sm">
      <span className="shrink-0 w-24 text-[11px] uppercase tracking-wide text-muted-foreground pt-0.5">
        {label}
      </span>
      <div className="flex-1 min-w-0 flex items-start justify-between gap-2">
        <span
          dir={forceLtr ? 'ltr' : 'auto'}
          className={[
            'font-medium leading-relaxed break-words text-start',
            mono ? 'tech-content font-mono text-[13px]' : '',
            multiline ? '' : 'truncate',
          ].join(' ')}
        >
          {v}
        </span>
        {action && Icon && (
          <a
            href={action.href}
            className="shrink-0 inline-flex h-7 w-7 items-center justify-center rounded-lg border border-border/60 text-muted-foreground hover:text-primary hover:border-primary/40 transition"
            aria-label={action.ariaLabel ?? label}
          >
            <Icon className="h-3.5 w-3.5" />
          </a>
        )}
      </div>
    </div>
  );
};

export default SiteField;