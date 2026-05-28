/**
 * APP-SHELL-REARCHITECTURE-1 — Workspace ref launcher.
 *
 * Detects ref prefixes (WO-, CNT-, etc.) and routes to the right existing
 * dashboard page via query string. No DB lookups. Falls back to /search.
 */
import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Search } from 'lucide-react';
import { useLanguage } from '@/i18n/LanguageContext';
import { resolveRefRoute, parseRef } from '@/modules/workspace/shell/refRouteMap';

export interface WorkspaceSearchLauncherProps {
  className?: string;
}

export const WorkspaceSearchLauncher: React.FC<WorkspaceSearchLauncherProps> = ({ className }) => {
  const { isRTL } = useLanguage();
  const navigate = useNavigate();
  const [value, setValue] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = value.trim();
    if (!trimmed) return;
    if (parseRef(trimmed)) {
      const dest = resolveRefRoute(trimmed);
      if (dest) {
        navigate(dest);
        setValue('');
        return;
      }
    }
    navigate(`/search?q=${encodeURIComponent(trimmed)}`);
    setValue('');
  };

  return (
    <form
      role="search"
      onSubmit={handleSubmit}
      data-testid="workspace-search-launcher"
      className={`flex items-center gap-1.5 rounded-lg border border-border/40 bg-muted/30 ps-2 pe-1 h-8 ${className ?? ''}`}
    >
      <Search className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
      <input
        type="text"
        value={value}
        onChange={(e) => setValue(e.target.value)}
        placeholder={isRTL ? 'اكتب مرجعاً (WO-…، CNT-…)' : 'Type a ref (WO-…, CNT-…)'}
        className="bg-transparent border-0 outline-0 text-xs flex-1 min-w-0 placeholder:text-muted-foreground/70"
        dir="auto"
        aria-label={isRTL ? 'بحث بمراجع' : 'Search by reference'}
      />
    </form>
  );
};

export default WorkspaceSearchLauncher;