import React from 'react';
import { Lock } from 'lucide-react';

export const ReadOnlyNotice: React.FC<{ isRTL: boolean }> = ({ isRTL }) => (
  <div className="flex items-center gap-2 rounded-md bg-amber-50 border border-amber-200 px-3 py-2 text-sm text-amber-800 mb-3">
    <Lock className="h-4 w-4" />
    <span>
      {isRTL
        ? 'هذه النسخة قيد المراجعة أو معتمدة، ولا يمكن تعديلها إلا بعد إعادتها إلى مسودة.'
        : 'This version is under review or approved, and cannot be edited until it is reverted to draft.'}
    </span>
  </div>
);