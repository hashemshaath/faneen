import React from 'react';
import { X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import { useLanguage } from '@/i18n/LanguageContext';

export interface BulkAction {
  id: string;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  variant?: 'default' | 'destructive' | 'outline' | 'secondary';
  onClick: () => void | Promise<void>;
  disabled?: boolean;
}

interface BulkActionBarProps {
  count: number;
  actions: BulkAction[];
  onClear: () => void;
  className?: string;
}

/**
 * Floating bar that surfaces bulk actions when one or more items are selected.
 */
export const BulkActionBar: React.FC<BulkActionBarProps> = ({ count, actions, onClear, className }) => {
  const { isRTL } = useLanguage();
  if (count === 0) return null;

  return (
    <div
      role="region"
      aria-label={isRTL ? 'إجراءات مجمّعة' : 'Bulk actions'}
      className={cn(
        'fixed inset-x-0 bottom-4 z-40 mx-auto flex w-[calc(100%-1.5rem)] max-w-3xl items-center justify-between gap-3 rounded-2xl border border-border/60 bg-card/95 px-3 py-2 shadow-lg backdrop-blur supports-[backdrop-filter]:bg-card/80 sm:px-4',
        'animate-in slide-in-from-bottom-4 duration-200',
        className,
      )}
      style={{ paddingBottom: 'env(safe-area-inset-bottom, 0.5rem)' }}
    >
      <div className="flex items-center gap-2 min-w-0">
        <Badge variant="secondary" className="tech-content text-[11px] font-semibold px-2 h-6">
          {count}
        </Badge>
        <span className="text-xs text-muted-foreground truncate">
          {isRTL ? 'عنصر محدد' : count === 1 ? 'item selected' : 'items selected'}
        </span>
      </div>

      <div className="flex items-center gap-1.5 flex-wrap justify-end">
        {actions.map((a) => (
          <Button
            key={a.id}
            variant={a.variant ?? 'outline'}
            size="sm"
            disabled={a.disabled}
            onClick={() => { void a.onClick(); }}
            className="gap-1.5 text-xs h-8"
          >
            <a.icon className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">{a.label}</span>
          </Button>
        ))}
        <Button
          variant="ghost"
          size="icon"
          onClick={onClear}
          className="w-8 h-8 text-muted-foreground"
          aria-label={isRTL ? 'إلغاء التحديد' : 'Clear selection'}
        >
          <X className="w-3.5 h-3.5" />
        </Button>
      </div>
    </div>
  );
};

export default BulkActionBar;
