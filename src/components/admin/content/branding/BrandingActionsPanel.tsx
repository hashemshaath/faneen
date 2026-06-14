import React from 'react';
import { Button } from '@/components/ui/button';
import { Loader2, RotateCcw, Save } from 'lucide-react';

export interface BrandingActionsPanelProps {
  isRTL: boolean;
  dirtyCount: number;
  isSaving: boolean;
  onSave: () => void;
  onResetDefaults: () => void;
}

/**
 * BrandingActionsPanel — Defaults + Save buttons. All side-effects come
 * from parent-supplied callbacks. No mutations or state are owned here.
 */
export const BrandingActionsPanel: React.FC<BrandingActionsPanelProps> = ({
  isRTL,
  dirtyCount,
  isSaving,
  onSave,
  onResetDefaults,
}) => (
  <div className="flex items-center gap-2">
    <Button variant="outline" onClick={onResetDefaults} disabled={isSaving}>
      <RotateCcw className="w-4 h-4 me-2" />
      {isRTL ? 'افتراضي' : 'Defaults'}
    </Button>
    <Button onClick={onSave} disabled={dirtyCount === 0 || isSaving}>
      {isSaving ? (
        <Loader2 className="w-4 h-4 animate-spin me-2" />
      ) : (
        <Save className="w-4 h-4 me-2" />
      )}
      {isRTL ? `حفظ (${dirtyCount})` : `Save (${dirtyCount})`}
    </Button>
  </div>
);

export default BrandingActionsPanel;