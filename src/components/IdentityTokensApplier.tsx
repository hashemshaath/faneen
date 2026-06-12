/**
 * ADMIN-REDESIGN PHASE 2 — Identity tokens runtime applier.
 *
 * Injects (or updates) a single `<style id="identity-tokens">` element on
 * `<head>`, overriding CSS custom properties on `:root` from the
 * `admin_identity_tokens` table. Runs AFTER `<ThemeApplier />` so identity
 * overrides win, but is fully additive: empty token map = no-op.
 */
import { useEffect } from 'react';
import { useIdentityTokens } from '@/hooks/useIdentityTokens';

const STYLE_ID = 'identity-tokens';

export const IdentityTokensApplier = () => {
  const { tokens } = useIdentityTokens();

  useEffect(() => {
    const entries = Object.entries(tokens);
    let el = document.getElementById(STYLE_ID) as HTMLStyleElement | null;
    if (entries.length === 0) {
      if (el) el.textContent = '';
      return;
    }
    if (!el) {
      el = document.createElement('style');
      el.id = STYLE_ID;
      document.head.appendChild(el);
    }
    const body = entries.map(([k, v]) => `${k}:${v}`).join(';');
    el.textContent = `:root{${body}}`;
  }, [tokens]);

  return null;
};

export default IdentityTokensApplier;
