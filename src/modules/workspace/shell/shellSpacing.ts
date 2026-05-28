/**
 * APP-SHELL-STABILIZATION-1 — Composed spacing presets.
 *
 * Pre-assembled className bundles for common shell containers so pages
 * don't drift in padding / radius / gap. Built on top of shellTokens.
 */
import {
  SHELL_CARD_BORDER,
  SHELL_CARD_PADDING,
  SHELL_CARD_RADIUS,
  SHELL_CARD_SURFACE,
  SHELL_PAGE_PADDING,
  SHELL_SECTION_STACK,
} from './shellTokens';

export const SHELL_PAGE_CONTAINER = `${SHELL_PAGE_PADDING} ${SHELL_SECTION_STACK}`;
export const SHELL_CARD = `${SHELL_CARD_SURFACE} ${SHELL_CARD_BORDER} ${SHELL_CARD_RADIUS} ${SHELL_CARD_PADDING}`;
export const SHELL_SECTION_HEADER = 'flex items-center justify-between gap-2 mb-2 sm:mb-3';
export const SHELL_SECTION_TITLE = 'text-sm sm:text-base font-semibold text-foreground';
export const SHELL_SECTION_SUBTITLE = 'text-[11px] sm:text-xs text-muted-foreground';