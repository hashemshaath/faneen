import { useEffect } from 'react';
import { useThemeColors, buildCssVars } from '@/hooks/useThemeColors';

/** Injects (or updates) a single <style id="theme-overrides"> element on
 *  document head, overriding the design-token CSS variables according to the
 *  admin's saved theme. Renders nothing. */
export const ThemeApplier = () => {
  const { theme } = useThemeColors();

  useEffect(() => {
    const css = buildCssVars(theme);
    if (!css) return;
    const id = 'theme-overrides';
    let el = document.getElementById(id) as HTMLStyleElement | null;
    if (!el) {
      el = document.createElement('style');
      el.id = id;
      document.head.appendChild(el);
    }
    el.textContent = css;
  }, [theme]);

  return null;
};

export default ThemeApplier;