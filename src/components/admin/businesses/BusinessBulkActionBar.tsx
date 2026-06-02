import React from 'react';
import { CheckSquare, CheckCircle, Ban, Shield, XCircle, Crown, X } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';

interface TierOption { value: string; label_ar: string; label_en: string; icon: string }

interface Props {
  count: number;
  language: 'ar' | 'en';
  isRTL: boolean;
  tiers: TierOption[];
  onSetActive: (active: boolean) => void;
  onSetVerified: (verified: boolean) => void;
  onChangeTier: (tier: string) => void;
  onClear: () => void;
}

/**
 * Sticky bulk-action bar shown when 1+ businesses are selected. Pure
 * presentation — all mutations are handled by the parent.
 */
export const BusinessBulkActionBar: React.FC<Props> = ({
  count, language, isRTL, tiers,
  onSetActive, onSetVerified, onChangeTier, onClear,
}) => {
  if (count === 0) return null;
  return (
    <div className="rounded-2xl border border-accent/40 bg-accent/5 p-3 flex flex-wrap items-center gap-2 sticky top-[80px] z-10 backdrop-blur-md">
      <Badge className="bg-accent text-accent-foreground gap-1 rounded-lg">
        <CheckSquare className="w-3 h-3" />
        {isRTL ? `محدد: ${count}` : `${count} selected`}
      </Badge>
      <Button size="sm" variant="outline" className="h-8 text-xs gap-1.5 rounded-xl" onClick={() => onSetActive(true)}>
        <CheckCircle className="w-3.5 h-3.5" />{isRTL ? 'تفعيل' : 'Activate'}
      </Button>
      <Button size="sm" variant="outline" className="h-8 text-xs gap-1.5 rounded-xl" onClick={() => onSetActive(false)}>
        <Ban className="w-3.5 h-3.5" />{isRTL ? 'تعطيل' : 'Deactivate'}
      </Button>
      <Button size="sm" variant="outline" className="h-8 text-xs gap-1.5 rounded-xl" onClick={() => onSetVerified(true)}>
        <Shield className="w-3.5 h-3.5" />{isRTL ? 'توثيق' : 'Verify'}
      </Button>
      <Button size="sm" variant="outline" className="h-8 text-xs gap-1.5 rounded-xl" onClick={() => onSetVerified(false)}>
        <XCircle className="w-3.5 h-3.5" />{isRTL ? 'إلغاء التوثيق' : 'Unverify'}
      </Button>
      <Select onValueChange={onChangeTier}>
        <SelectTrigger className="h-8 w-36 text-xs rounded-xl">
          <Crown className="w-3.5 h-3.5 me-1" />
          <SelectValue placeholder={isRTL ? 'تغيير العضوية' : 'Change tier'} />
        </SelectTrigger>
        <SelectContent>
          {tiers.map((t) => (
            <SelectItem key={t.value} value={t.value}>
              {t.icon} {language === 'ar' ? t.label_ar : t.label_en}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
      <Button size="sm" variant="ghost" className="h-8 text-xs gap-1.5 ms-auto rounded-xl" onClick={onClear}>
        <X className="w-3.5 h-3.5" />{isRTL ? 'إلغاء التحديد' : 'Clear'}
      </Button>
    </div>
  );
};

export default BusinessBulkActionBar;