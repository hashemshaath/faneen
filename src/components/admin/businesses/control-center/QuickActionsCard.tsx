import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Zap, ShieldCheck, Phone, Link2, Rocket } from 'lucide-react';
import { pickBi } from '@/components/common/Bilingual';
import type { BusinessOverviewMetrics } from '@/modules/admin/businesses/businessAdminMetrics';

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
  const chips: ReadonlyArray<{ key: QuickActionKey; label: string; count: number; icon: React.ElementType; tone: string }> = [
    {
      key: 'pilotReady',
      label: pickBi(isRTL, 'عرض الجاهزين للتشغيل', 'Show pilot-ready'),
      count: metrics.pilotReady, icon: Rocket,
      tone: 'bg-success/10 text-success-foreground border-success/30 hover:bg-success/20',
    },
    {
      key: 'pendingReview',
      label: pickBi(isRTL, 'بحاجة للمراجعة', 'Needs review'),
      count: metrics.pendingReview, icon: ShieldCheck,
      tone: 'bg-warning/10 text-warning-foreground border-warning/30 hover:bg-warning/20',
    },
    {
      key: 'missingContact',
      label: pickBi(isRTL, 'بدون تواصل', 'No contact'),
      count: metrics.missingContact, icon: Phone,
      tone: 'bg-destructive/10 text-destructive border-destructive/30 hover:bg-destructive/20',
    },
    {
      key: 'missingPublicLink',
      label: pickBi(isRTL, 'بدون رابط عام', 'No public link'),
      count: metrics.missingPublicLink, icon: Link2,
      tone: 'bg-info/10 text-info-foreground border-info/30 hover:bg-info/20',
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
        {chips.map((c) => {
          const Icon = c.icon;
          return (
            <button
              key={c.key}
              type="button"
              onClick={() => onAction(c.key)}
              className={`inline-flex items-center gap-2 px-3 h-9 rounded-full border text-xs font-medium transition-colors ${c.tone}`}
              data-testid={`quick-action-${c.key}`}
            >
              <Icon className="h-3.5 w-3.5" />
              <span>{c.label}</span>
              <span className="tabular-nums text-[11px] opacity-80">· {c.count}</span>
            </button>
          );
        })}
      </CardContent>
    </Card>
  );
};

export default QuickActionsCard;