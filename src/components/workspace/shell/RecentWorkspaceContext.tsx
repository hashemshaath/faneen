/**
 * APP-SHELL-REARCHITECTURE-1 — Recent context dock.
 *
 * Renders the user's recent refs from localStorage. Tiny, read-only,
 * no network. Hidden when empty.
 */
import React, { useEffect, useState, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { Clock } from 'lucide-react';
import { useLanguage } from '@/i18n/LanguageContext';
import { readRecentContext, type RecentContextEntry } from '@/modules/workspace/shell/recentContextStore';

export interface RecentWorkspaceContextProps {
  limit?: number;
  className?: string;
}

export const RecentWorkspaceContext: React.FC<RecentWorkspaceContextProps> = ({ limit = 6, className }) => {
  const { isRTL } = useLanguage();
  const [entries, setEntries] = useState<RecentContextEntry[]>([]);

  const refresh = useCallback(() => setEntries(readRecentContext()), []);

  useEffect(() => {
    refresh();
    const onStorage = (e: StorageEvent) => {
      if (e.key === 'qitaat_shell_recent_v1') refresh();
    };
    window.addEventListener('storage', onStorage);
    return () => window.removeEventListener('storage', onStorage);
  }, [refresh]);

  if (entries.length === 0) return null;
  const shown = entries.slice(0, limit);

  return (
    <div data-testid="recent-workspace-context" className={`flex items-center gap-1.5 min-w-0 ${className ?? ''}`}>
      <Clock className="w-3 h-3 text-muted-foreground shrink-0" aria-hidden="true" />
      <span className="sr-only">{isRTL ? 'العناصر الأخيرة' : 'Recent items'}</span>
      <ul className="flex items-center gap-1 min-w-0 overflow-x-auto no-scrollbar">
        {shown.map((e) => (
          <li key={`${e.path}|${e.ref ?? ''}|${e.visited_at}`} className="shrink-0">
            <Link
              to={e.path}
              className="inline-flex items-center gap-1 text-[11px] rounded-md border border-border/30 bg-card/60 px-1.5 py-0.5 hover:bg-muted/60 transition-colors"
              title={e.label}
            >
              {e.ref && <span className="tech-content font-mono text-muted-foreground">{e.ref}</span>}
              <span className="truncate max-w-[120px]">{e.label}</span>
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
};

export default RecentWorkspaceContext;