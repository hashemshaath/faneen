/**
 * APP-SHELL-STABILIZATION-1 — Shell visual tokens.
 *
 * Centralizes shell-only design tokens (heights, sticky offsets, radii,
 * backdrop intensity, motion durations) so every shell primitive renders
 * with the same vertical rhythm. Tailwind class strings only — no CSS
 * variables added; the design-tokens system in index.css remains canonical.
 *
 * Pure module: no React, no DB. Safe to import anywhere.
 */

export const SHELL_HEADER_HEIGHT = 'h-14 sm:h-[4.25rem]';
export const SHELL_CTX_BAR_OFFSET = 'top-14 sm:top-[4.25rem]';
export const SHELL_CTX_BAR_MIN_HEIGHT = 'min-h-[36px]';

export const SHELL_PAGE_PADDING = 'p-3 sm:p-5 md:p-7';
export const SHELL_PAGE_PADDING_X = 'px-3 sm:px-5 md:px-7';
export const SHELL_PAGE_PADDING_Y = 'py-3 sm:py-5 md:py-7';

export const SHELL_SECTION_GAP = 'gap-3 sm:gap-4 md:gap-5';
export const SHELL_SECTION_STACK = 'space-y-3 sm:space-y-4 md:space-y-5';

export const SHELL_CARD_PADDING = 'p-3 sm:p-4 md:p-5';
export const SHELL_CARD_RADIUS = 'rounded-xl';
export const SHELL_CARD_BORDER = 'border border-border/30';
export const SHELL_CARD_SURFACE = 'bg-card';

export const SHELL_BREADCRUMB_GAP = 'gap-1';
export const SHELL_BREADCRUMB_TEXT = 'text-xs text-muted-foreground';

export const SHELL_TOUCH_TARGET = 'min-h-[44px]';
export const SHELL_TOUCH_TARGET_COMPACT = 'min-h-[36px]';

export const SHELL_BACKDROP = 'bg-card/95 backdrop-blur-xl';
export const SHELL_BACKDROP_LIGHT = 'bg-card/60 backdrop-blur-sm';

export const SHELL_MOTION_FAST = 'transition-colors duration-150';
export const SHELL_MOTION_BASE = 'transition-all duration-200 ease-out';

export const SHELL_FOCUS_RING = 'focus:outline-none focus-visible:ring-2 focus-visible:ring-accent/50 focus-visible:ring-offset-1 focus-visible:ring-offset-background';

/** Compact-mode multiplier helpers for downstream UIs that want to
 *  honour the user's "compact" preference without re-importing every token. */
export interface CompactAwareClasses {
  page: string;
  card: string;
  stack: string;
  touch: string;
}

export function shellClassesFor(compact: boolean): CompactAwareClasses {
  return compact
    ? {
        page:  'p-2 sm:p-3 md:p-4',
        card:  'p-2 sm:p-3',
        stack: 'space-y-2 sm:space-y-3',
        touch: SHELL_TOUCH_TARGET_COMPACT,
      }
    : {
        page:  SHELL_PAGE_PADDING,
        card:  SHELL_CARD_PADDING,
        stack: SHELL_SECTION_STACK,
        touch: SHELL_TOUCH_TARGET,
      };
}