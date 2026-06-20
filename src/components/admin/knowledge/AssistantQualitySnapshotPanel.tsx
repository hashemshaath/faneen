/**
 * Phase 9 — Assistant Quality Snapshot Panel.
 *
 * Read-only quality view inside `/admin/knowledge`. All numbers come from
 * the static Phase 8 pilot fixture (`assistantInternalPilot.ts`) replayed
 * through `buildAssistantKnowledgeAnswerContext`. No DB, no logging, no
 * temporal tracking, no persistence, no question saving, no transport.
 *
 * If real-time tracking is ever needed it should be Phase 10.
 */
import React, { useMemo } from 'react';
import { BarChart3, CheckCircle2, ShieldAlert, AlertTriangle } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { computePilotQualitySnapshot } from '@/modules/knowledge/assistant/assistantPilotSummary';

const SNAPSHOT_NOTE =
  'لقطة من فيكسشر تجربة المساعد الداخلية (Phase 8). لا يوجد تتبع زمني ولا حفظ للأسئلة. التتبع الزمني الحقيقي مؤجل إلى مرحلة لاحقة.';

const AssistantQualitySnapshotPanel: React.FC = () => {
  const snapshot = useMemo(() => computePilotQualitySnapshot(), []);
  const { counters, gaps } = snapshot;

  return (
    <div className="space-y-4" data-testid="knowledge-assistant-quality-snapshot">
      <Card className="border-border/60">
        <CardContent className="p-3 sm:p-4 space-y-3">
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <BarChart3 className="h-4 w-4" />
            <span>{SNAPSHOT_NOTE}</span>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-2">
            <Tile label="إجمالي الأسئلة" value={counters.total} testid="quality-total" />
            <Tile label="answered" value={counters.answered} tone="success" testid="quality-answered" />
            <Tile label="fallback" value={counters.fallback} tone="warning" testid="quality-fallback" />
            <Tile label="blocked_internal" value={counters.blockedInternal} tone="muted" testid="quality-blocked-internal" />
            <Tile label="needs_knowledge" value={counters.inScopeFallback} tone="warning" testid="quality-needs-knowledge" />
            <Tile
              label="متوسط الثقة"
              value={`${(counters.averageConfidence * 100).toFixed(0)}%`}
              testid="quality-avg-confidence"
            />
          </div>
        </CardContent>
      </Card>

      <Card className="border-border/60">
        <CardContent className="p-3 sm:p-4 space-y-2">
          <p className="text-sm font-semibold flex items-center gap-2">
            <AlertTriangle className="h-4 w-4 text-warning" />
            أهم الفجوات
          </p>
          {gaps.length === 0 ? (
            <p className="text-xs text-muted-foreground flex items-center gap-1.5">
              <CheckCircle2 className="h-3.5 w-3.5 text-success" />
              لا توجد فجوات داخل النطاق.
            </p>
          ) : (
            <ul className="space-y-1.5" data-testid="quality-gaps">
              {gaps.map((g) => (
                <li
                  key={g.id}
                  className="text-xs flex flex-wrap items-center gap-1.5"
                  data-testid={`quality-gap-${g.id}`}
                >
                  <Badge variant="outline" className="tech-content text-[10px]">{g.id}</Badge>
                  <span className="truncate">{g.query}</span>
                  <Badge variant="secondary" className="text-[10px]">{g.audience}</Badge>
                  <Badge
                    variant="outline"
                    className={
                      g.reason === 'in_scope_fallback'
                        ? 'text-[10px] text-warning border-warning/40'
                        : 'text-[10px] text-muted-foreground'
                    }
                  >
                    {g.reason === 'in_scope_fallback' ? 'بحاجة معرفة' : 'خارج النطاق'}
                  </Badge>
                </li>
              ))}
            </ul>
          )}
          <p className="text-[11px] text-muted-foreground flex items-center gap-1.5 pt-2 border-t border-border/60">
            <ShieldAlert className="h-3 w-3" />
            هذه اللقطة لا تحفظ شيئًا، لا ترسل شيئًا، ولا تتصل بأي API خارجي.
          </p>
        </CardContent>
      </Card>
    </div>
  );
};

const Tile: React.FC<{
  label: string;
  value: number | string;
  tone?: 'success' | 'warning' | 'muted';
  testid: string;
}> = ({ label, value, tone, testid }) => {
  const toneClass =
    tone === 'success'
      ? 'bg-success/10 border-success/30 text-success'
      : tone === 'warning'
      ? 'bg-warning/10 border-warning/30 text-warning'
      : tone === 'muted'
      ? 'bg-muted/40 border-border text-foreground'
      : 'bg-card border-border';
  return (
    <div className={`rounded-2xl border p-3 ${toneClass}`} data-testid={testid}>
      <span className="text-[10px] uppercase tracking-wide opacity-80">{label}</span>
      <p className="mt-1 text-xl font-bold tabular-nums tech-content">{value}</p>
    </div>
  );
};

export default AssistantQualitySnapshotPanel;