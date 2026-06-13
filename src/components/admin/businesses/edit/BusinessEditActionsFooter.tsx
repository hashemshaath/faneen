import React from 'react';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { Save, Loader2 } from 'lucide-react';
import { pickBi } from '@/components/common/Bilingual';

type Props = {
  isRTL: boolean;
  canSave: boolean;
  saving: boolean;
  onSave: () => void;
  onCancel: () => void;
};

export const BusinessEditActionsFooter: React.FC<Props> = ({
  isRTL,
  canSave,
  saving,
  onSave,
  onCancel,
}) => (
  <>
    <Separator className="my-4" />
    <div className="flex gap-2">
      <Button onClick={onSave} disabled={!canSave || saving} className="flex-1 gap-1.5 rounded-xl">
        <Save className="w-3.5 h-3.5" />
        {saving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : (pickBi(isRTL, 'حفظ التعديلات', 'Save Changes'))}
      </Button>
      <Button variant="outline" onClick={onCancel} className="rounded-xl">{pickBi(isRTL, 'إلغاء', 'Cancel')}</Button>
    </div>
  </>
);