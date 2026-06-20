import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Zap, ShieldCheck, Phone, Link2, Rocket } from 'lucide-react';
import { pickBi } from '@/components/common/Bilingual';
import type { BusinessOverviewMetrics } from '@/modules/admin/businesses/businessAdminMetrics';
import { ControlChip, type ChipTone } from './ControlChip';

export type QuickActionKey =
  | 'pilotReady'
  | 'pendingReview'
  | 'missingContact'
  | 'missingPublicLink';

interface QuickActionsCardProps {
  metrics: BusinessOverviewMetrics;
  isRTL: boolean;
  onAction: (key: QuickActionKey) => void;
}

/**
 * Executive quick-actions strip — turns the headline counts into
 * single-click operations (jump to filtered Businesses tab). Replaces
 * the old free-text "Action summary" paragraph and is the only place
 * where these ops counts are framed as actions.
 */
export const QuickActionsCard: React.FC<QuickActionsCardProps> = ({ metrics, isRTL, onAction }) => {
  const chips: ReadonlyArray<{ key: QuickActionKey; label: string; count: number; icon: React.ElementType; tone: ChipTone }> = [
    {
      key: 'pilotReady',
      label: pickBi(isRTL, 'عرض الجاهزين للتشغيل', 'Show pilot-ready'),
      count: metrics.pilotReady, icon: Rocket, tone: 'success',
    },
    {
      key: 'pendingReview',
      label: pickBi(isRTL, 'بحاجة للمراجعة', 'Needs review'),
      count: metrics.pendingReview, icon: ShieldCheck, tone: 'warning',
    },
    {
      key: 'missingContact',
      label: pickBi(isRTL, 'بدون تواصل', 'No contact'),
      count: metrics.missingContact, icon: Phone, tone: 'destructive',
    },
    {
      key: 'missingPublicLink',
      label: pickBi(isRTL, 'بدون رابط عام', 'No public link'),
      count: metrics.missingPublicLink, icon: Link2, tone: 'info',
    },
  ];

  return (
    <Card className="rounded-3xl border-border/60 bg-card/70" data-testid="control-center-quick-actions">
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-heading flex items-center gap-2">
          <Zap className="h-4 w-4 text-muted-foreground" />
          {pickBi(isRTL, 'إجراءات سريعة', 'Quick actions')}
        </CardTitle>
      </CardHeader>
      <CardContent className="flex flex-wrap gap-2">
        {chips.map((c) => (
          <ControlChip
            key={c.key}
            label={c.label}
            icon={c.icon as never}
            count={c.count}
            tone={c.tone}
            onClick={() => onAction(c.key)}
            testId={`quick-action-${c.key}`}
          />
        ))}
      </CardContent>
    </Card>
  );
};

export default QuickActionsCard;