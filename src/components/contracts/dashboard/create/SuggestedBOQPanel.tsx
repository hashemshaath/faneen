/**
 * Phase 3C — Presentational "Suggested BOQ" trigger button.
 * Pure UI: parent owns the addStarterBoqMutation and category resolution.
 */
import React from 'react';
import { ClipboardList, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface Props {
  isRTL: boolean;
  isPending: boolean;
  onAdd: () => void;
}

export const SuggestedBOQPanel: React.FC<Props> = ({ isRTL, isPending, onAdd }) => (
  <Button
    variant="outline" size="sm" className="h-8 text-xs gap-1.5"
    disabled={isPending}
    onClick={onAdd}
    title={isRTL ? 'إضافة مجموعة بنود مقترحة حسب نوع العمل' : 'Add suggested BOQ groups for this work type'}
  >
    {isPending ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <ClipboardList className="w-3.5 h-3.5" />}
    {isRTL ? 'مجموعة بنود مقترحة' : 'Suggested BOQ'}
  </Button>
);

export default SuggestedBOQPanel;