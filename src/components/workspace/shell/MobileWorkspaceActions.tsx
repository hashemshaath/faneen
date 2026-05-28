/**
 * APP-SHELL-REARCHITECTURE-2 — Mobile sticky workspace actions.
 *
 * Bottom-anchored quick-action bar shown only on small screens. Offers:
 *  - quick create (context-aware default)
 *  - search (focuses the workspace search launcher / opens palette)
 *  - recent refs (jump to last visited)
 *  - command palette (opens via window event)
 *  - back-to-context (jumps to last_context path)
 *
 * No DB calls. Uses workspace-state + context engine only.
 */
import React, { useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { Plus, Search, Clock, Command, ArrowLeft, ArrowRight } from 'lucide-react';
import { useIsMobile } from '@/hooks/use-mobile';
import { useLanguage } from '@/i18n/LanguageContext';
import { useWorkspaceState } from '@/hooks/useWorkspaceState';
import { useWorkspaceContext } from '@/hooks/useWorkspaceContext';

export const MOBILE_WORKSPACE_ACTIONS_EVENT = 'qitaat:open-command-palette';

export interface MobileWorkspaceActionsProps {
  className?: string;
}

export const MobileWorkspaceActions: React.FC<MobileWorkspaceActionsProps> = ({ className }) => {
  const isMobile = useIsMobile();
  const { isRTL } = useLanguage();
  const state = useWorkspaceState();
  const ctx = useWorkspaceContext();
  const navigate = useNavigate();

  const openPalette = useCallback(() => {
    try { window.dispatchEvent(new CustomEvent(MOBILE_WORKSPACE_ACTIONS_EVENT)); } catch { /* noop */ }
  }, []);

  const lastRef = state.recent_refs[0];
  const lastCtxPath = state.last_context?.ref
    ? state.recent_refs.find((r) => r.ref === state.last_context?.ref)?.path
    : null;

  // Quick-create destination based on current module.
  const createTarget =
    ctx.module === 'work-orders' ? '/dashboard/work-orders?create=1'
    : ctx.module === 'contracts' ? '/dashboard/contracts?create=1'
    : ctx.module === 'leads'     ? '/dashboard/leads?create=1'
    : '/dashboard/work-orders?create=1';

  if (!isMobile) return null;

  const BackIcon = isRTL ? ArrowRight : ArrowLeft;

  return (
    <nav
      data-testid="mobile-workspace-actions"
      aria-label={isRTL ? 'إجراءات سريعة' : 'Quick actions'}
      className={`fixed bottom-0 inset-x-0 z-30 md:hidden border-t border-border/30 bg-card/95 backdrop-blur-xl ${className ?? ''}`}
      style={{
        paddingBottom: 'env(safe-area-inset-bottom, 0px)',
        paddingInlineStart: 'env(safe-area-inset-left, 0px)',
        paddingInlineEnd: 'env(safe-area-inset-right, 0px)',
      }}
    >
      <div className="grid grid-cols-5 gap-0.5">
        <button
          onClick={() => navigate(createTarget)}
          className="flex flex-col items-center justify-center min-h-[48px] gap-0.5 text-[10px] text-foreground hover:bg-muted/40 transition-colors"
          aria-label={isRTL ? 'إنشاء' : 'Create'}
        >
          <Plus className="w-4 h-4" />
          <span>{isRTL ? 'إنشاء' : 'Create'}</span>
        </button>
        <button
          onClick={openPalette}
          className="flex flex-col items-center justify-center min-h-[48px] gap-0.5 text-[10px] text-foreground hover:bg-muted/40 transition-colors"
          aria-label={isRTL ? 'بحث' : 'Search'}
        >
          <Search className="w-4 h-4" />
          <span>{isRTL ? 'بحث' : 'Search'}</span>
        </button>
        <button
          onClick={() => lastRef && navigate(lastRef.path)}
          disabled={!lastRef}
          className="flex flex-col items-center justify-center min-h-[48px] gap-0.5 text-[10px] text-foreground hover:bg-muted/40 transition-colors disabled:opacity-40"
          aria-label={isRTL ? 'الأخير' : 'Recent'}
        >
          <Clock className="w-4 h-4" />
          <span>{isRTL ? 'الأخير' : 'Recent'}</span>
        </button>
        <button
          onClick={openPalette}
          className="flex flex-col items-center justify-center min-h-[48px] gap-0.5 text-[10px] text-foreground hover:bg-muted/40 transition-colors"
          aria-label={isRTL ? 'لوحة الأوامر' : 'Command palette'}
        >
          <Command className="w-4 h-4" />
          <span>{isRTL ? 'الأوامر' : 'Palette'}</span>
        </button>
        <button
          onClick={() => lastCtxPath && navigate(lastCtxPath)}
          disabled={!lastCtxPath}
          className="flex flex-col items-center justify-center min-h-[48px] gap-0.5 text-[10px] text-foreground hover:bg-muted/40 transition-colors disabled:opacity-40"
          aria-label={isRTL ? 'عودة للسياق' : 'Back to context'}
        >
          <BackIcon className="w-4 h-4" />
          <span>{isRTL ? 'سياق' : 'Context'}</span>
        </button>
      </div>
    </nav>
  );
};

export default MobileWorkspaceActions;