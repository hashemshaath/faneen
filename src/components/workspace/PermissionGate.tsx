/**
 * WORKSPACE-RBAC-6C — UI-only permission affordances.
 *
 * These helpers are advisory. RLS + server RPCs remain the authoritative
 * authorization layer. Use them to hide or visually disable secondary
 * UI actions when the active workspace role lacks the requested
 * permission. Never rely on them for security.
 *
 * - <PermissionGate permission="..."> children </PermissionGate>
 *     Renders children when permitted; otherwise renders `fallback`
 *     (default null).
 *
 * - <PermissionHint permission="..."> children </PermissionHint>
 *     Renders children when permitted; otherwise renders a disabled
 *     wrapper with a bilingual tooltip explaining the missing permission.
 *     The wrapped element must accept pointer events being blocked via
 *     a containing span (we set aria-disabled + pointer-events-none on
 *     a wrapping span, so the original button visuals are preserved).
 */
import React from 'react';
import { useCan } from '@/hooks/useCan';
import { useBi } from '@/components/common/Bilingual';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';

export const PERMISSION_DENIED_COPY = {
  ar: 'لا تملك صلاحية تنفيذ هذا الإجراء',
  en: 'You do not have permission to perform this action',
} as const;

interface GateProps {
  permission: string;
  children: React.ReactNode;
  fallback?: React.ReactNode;
}

export const PermissionGate: React.FC<GateProps> = ({ permission, children, fallback = null }) => {
  const allowed = useCan(permission);
  return <>{allowed ? children : fallback}</>;
};

interface HintProps {
  permission: string;
  children: React.ReactNode;
  /** Optional override for the denial message. */
  message?: { ar: string; en: string };
  className?: string;
}

export const PermissionHint: React.FC<HintProps> = ({ permission, children, message, className }) => {
  const allowed = useCan(permission);
  const bi = useBi();
  if (allowed) return <>{children}</>;
  const copy = message ?? PERMISSION_DENIED_COPY;
  return (
    <TooltipProvider delayDuration={150}>
      <Tooltip>
        <TooltipTrigger asChild>
          <span
            aria-disabled="true"
            data-permission-denied="true"
            className={`inline-flex pointer-events-none opacity-50 ${className ?? ''}`}
          >
            {children}
          </span>
        </TooltipTrigger>
        <TooltipContent>{bi(copy.ar, copy.en)}</TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
};

export default PermissionGate;