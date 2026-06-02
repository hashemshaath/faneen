import { useEffect } from 'react';
import { useBranding } from '@/hooks/useBranding';

/**
 * Syncs the browser-tab favicon and the iOS home-screen icon with the
 * brand mark configured in Admin → Identity (Branding) →
 * `brand_logo_mark` in `platform_settings`. Without this, the static
 * `/favicon.ico` shipped at build time never reflects what the admin
 * uploaded, so the tab continues to show the old icon.
 *
 * Renders nothing.
 */
export const BrandFaviconApplier = () => {
  const { branding } = useBranding();

  useEffect(() => {
    const markUrl = branding?.markUrl;
    if (!markUrl) return;

    const setLink = (rel: string, id: string, type?: string) => {
      let el = document.querySelector<HTMLLinkElement>(`link#${id}`);
      if (!el) {
        el = document.querySelector<HTMLLinkElement>(`link[rel="${rel}"]`);
      }
      if (!el) {
        el = document.createElement('link');
        el.rel = rel;
        document.head.appendChild(el);
      }
      el.id = id;
      el.rel = rel;
      if (type) el.type = type;
      if (el.href !== markUrl) el.href = markUrl;
    };

    // Primary tab favicon (overrides /favicon.ico for JS-capable browsers).
    setLink('icon', 'brand-favicon-icon', 'image/png');
    // iOS / iPadOS home-screen icon.
    setLink('apple-touch-icon', 'brand-favicon-apple');
  }, [branding?.markUrl]);

  return null;
};

export default BrandFaviconApplier;