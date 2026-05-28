/**
 * APP-SHELL-REARCHITECTURE-2 — Recent operational journeys.
 *
 * Synthesizes the user's last operational flow (e.g. Lead → Quote →
 * Contract → WO) from the recent refs already stored in localStorage.
 * No DB joins, no network. Pure derivation + render.
 */
import React, { useMemo } from 'react';
import { Link } from 'react-router-dom';
import { ArrowRight, Workflow } from 'lucide-react';
import { useLanguage } from '@/i18n/LanguageContext';
import { useWorkspaceState } from '@/hooks/useWorkspaceState';
import { parseRef } from '@/modules/workspace/shell/refRouteMap';
import type { RecentRefEntry } from '@/modules/workspace/state';

const FLOW_ORDER = ['LED', 'QTE', 'CNT', 'WO'] as const;

function buildFlow(refs: RecentRefEntry[]): RecentRefEntry[] {
  // Take the most recent ref per prefix (latest visited first), then
  // re-order them along the canonical operational flow LED→QTE→CNT→WO.
  const byPrefix = new Map<string, RecentRefEntry>();
  for (const e of refs) {
    const parsed = parseRef(e.ref);
    if (!parsed) continue;
    if (!byPrefix.has(parsed.prefix)) byPrefix.set(parsed.prefix, e);
  }
  return FLOW_ORDER.map((p) => byPrefix.get(p)).filter(Boolean) as RecentRefEntry[];
}

export interface RecentWorkspaceFlowsProps {
  className?: string;
}

export const RecentWorkspaceFlows: React.FC<RecentWorkspaceFlowsProps> = ({ className }) => {
  const { isRTL } = useLanguage();
  const state = useWorkspaceState();

  const flow = useMemo(() => buildFlow(state.recent_refs), [state.recent_refs]);

  if (flow.length < 2) return null;

  return (
    <div
      data-testid="recent-workspace-flows"
      className={`flex items-center gap-1.5 min-w-0 overflow-x-auto no-scrollbar text-xs ${className ?? ''}`}
      aria-label={isRTL ? 'الرحلات التشغيلية الأخيرة' : 'Recent operational flow'}
    >
      <Workflow className="w-3.5 h-3.5 text-muted-foreground shrink-0" aria-hidden="true" />
      {flow.map((e, i) => (
        <React.Fragment key={`${e.ref}-${i}`}>
          {i > 0 && (
            <ArrowRight className={`w-3 h-3 text-muted-foreground shrink-0 ${isRTL ? 'rotate-180' : ''}`} />
          )}
          <Link
            to={e.path}
            className="inline-flex items-center gap-1 rounded-md border border-border/30 bg-card/60 px-1.5 py-0.5 hover:bg-muted/60 transition-colors shrink-0"
            title={e.label}
          >
            <span className="tech-content font-mono text-[10px] text-muted-foreground">{e.ref}</span>
            <span className="truncate max-w-[100px]">{e.label}</span>
          </Link>
        </React.Fragment>
      ))}
    </div>
  );
};

export default RecentWorkspaceFlows;