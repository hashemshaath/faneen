/**
 * Phase 7G — Presentational card wrapper for provider credit actions
 * (grant / refund / adjust). Pure UI: no Supabase, no queries, no
 * mutations, no RPCs. Actions execute exclusively through the
 * `onAction` callback supplied by the parent.
 */
import React from 'react';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';

export interface ProviderCreditActionCardProps {
  title: string;
  icon?: React.ReactNode;
  children: React.ReactNode;
  actionLabel: string;
  onAction: () => void;
  disabled?: boolean;
  withDivider?: boolean;
}

export const ProviderCreditActionCard: React.FC<ProviderCreditActionCardProps> = ({
  title,
  icon,
  children,
  actionLabel,
  onAction,
  disabled,
  withDivider = true,
}) => {
  return (
    <div className={`${withDivider ? 'border-t pt-4 ' : ''}space-y-2`}>
      <Label className="text-xs flex items-center gap-1">
        {icon}
        {title}
      </Label>
      {children}
      <Button
        size="sm"
        variant="outline"
        className="w-full h-9 text-xs"
        onClick={onAction}
        disabled={disabled}
      >
        {actionLabel}
      </Button>
    </div>
  );
};

export default ProviderCreditActionCard;