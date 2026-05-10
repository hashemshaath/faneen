import { useState } from 'react';
import { Copy, Check } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import { useLanguage } from '@/i18n/LanguageContext';
import { cn } from '@/lib/utils';

interface CopyButtonProps {
  /** Text to copy to clipboard. */
  value: string;
  /** Optional label override for tooltips/toasts (defaults to "Migration key"). */
  label?: string;
  /** Visual size of the button. Default: xs (h-5 w-5). */
  size?: 'xs' | 'sm';
  className?: string;
  /** Stop click propagation to avoid triggering parent handlers (e.g. row clicks). */
  stopPropagation?: boolean;
}

/**
 * Tiny inline copy-to-clipboard button used across admin tables and filters.
 * Shows a brief check-mark confirmation, falls back to a toast on error.
 *
 * Why a shared component: the migration telemetry card, filters, and rerun
 * history all surface the same "migration key" string and need a uniform
 * one-click copy affordance for incident triage.
 */
export const CopyButton = ({
  value,
  label,
  size = 'xs',
  className,
  stopPropagation = true,
}: CopyButtonProps) => {
  const { isRTL } = useLanguage();
  const { toast } = useToast();
  const [copied, setCopied] = useState(false);

  const handleCopy = async (e: React.MouseEvent) => {
    if (stopPropagation) {
      e.stopPropagation();
      e.preventDefault();
    }
    try {
      // Modern clipboard API; gracefully degrade if unavailable (e.g. insecure
      // contexts) by surfacing a toast so the admin knows nothing happened.
      if (!navigator.clipboard?.writeText) {
        throw new Error('Clipboard API unavailable');
      }
      await navigator.clipboard.writeText(value);
      setCopied(true);
      toast({
        title: isRTL ? 'تم النسخ' : 'Copied',
        description: `${label ?? (isRTL ? 'مفتاح الترحيل' : 'Migration key')}: ${value}`,
      });
      setTimeout(() => setCopied(false), 1500);
    } catch (err) {
      toast({
        title: isRTL ? 'تعذّر النسخ' : 'Copy failed',
        description: err instanceof Error ? err.message : String(err),
        variant: 'destructive',
      });
    }
  };

  const dims = size === 'xs' ? 'h-5 w-5' : 'h-7 w-7';
  const iconCls = size === 'xs' ? 'w-3 h-3' : 'w-3.5 h-3.5';

  return (
    <Button
      type="button"
      variant="ghost"
      size="icon"
      onClick={handleCopy}
      className={cn(dims, 'shrink-0 text-muted-foreground hover:text-foreground', className)}
      aria-label={
        copied
          ? (isRTL ? 'تم النسخ' : 'Copied')
          : `${isRTL ? 'نسخ' : 'Copy'} ${label ?? (isRTL ? 'مفتاح الترحيل' : 'migration key')}`
      }
      title={
        copied
          ? (isRTL ? 'تم النسخ ✓' : 'Copied ✓')
          : (isRTL ? 'نسخ إلى الحافظة' : 'Copy to clipboard')
      }
    >
      {copied
        ? <Check className={cn(iconCls, 'text-success')} />
        : <Copy className={iconCls} />}
    </Button>
  );
};
