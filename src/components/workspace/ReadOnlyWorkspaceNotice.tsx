/**
 * ORG-RBAC-STRUCTURE-2 — Phase C
 *
 * Inline bilingual banner explaining that the current workspace role grants
 * read-only access. Advisory only — callers must still disable their own
 * mutating controls. RLS remains authoritative.
 */
import React from 'react';
import { Eye } from 'lucide-react';
import { useBi } from '@/components/common/Bilingual';

export interface ReadOnlyWorkspaceNoticeProps {
  className?: string;
}

export const ReadOnlyWorkspaceNotice: React.FC<ReadOnlyWorkspaceNoticeProps> = ({ className }) => {
  const bi = useBi();
  return (
    <div
      role="status"
      data-testid="workspace-readonly-notice"
      className={
        'flex items-center gap-2 rounded-xl border border-amber-500/30 bg-amber-500/10 ' +
        'px-3 py-2 text-xs font-semibold text-amber-900 dark:text-amber-200 ' +
        (className ?? '')
      }
    >
      <Eye className="w-3.5 h-3.5 shrink-0" aria-hidden="true" />
      <span>
        {bi(
          'لديك صلاحية عرض فقط على هذا القسم. الإجراءات التعديلية معطلة.',
          'You have read-only access to this section. Edit actions are disabled.',
        )}
      </span>
    </div>
  );
};

export default ReadOnlyWorkspaceNotice;