import { useEffect } from 'react';

interface PageMetaOptions {
  title: string;
  description?: string;
  canonical?: string;
  ogTitle?: string;
  ogDescription?: string;
  ogImage?: string;
  ogImageAlt?: string;
  ogImageWidth?: number;
  ogImageHeight?: number;
  ogType?: string;
  noindex?: boolean;
  keywords?: string;
}

const BASE_URL = 'https://qitaat.com';
const DEFAULT_OG_IMAGE = 'https://qitaat.com/og-image.jpg';
const SITE_NAME = 'قِطاعات Qitaat';

function setMeta(name: string, content: string, attr: 'name' | 'property' = 'name') {
  let el = document.querySelector(`meta[${attr}="${name}"]`) as HTMLMetaElement | null;
  if (!el) {
    el = document.createElement('meta');
    el.setAttribute(attr, name);
    document.head.appendChild(el);
  }
  el.setAttribute('content', content);
}

function setCanonical(href: string) {
  let el = document.querySelector('link[rel="canonical"]') as HTMLLinkElement | null;
  if (!el) {
    el = document.createElement('link');
    el.setAttribute('rel', 'canonical');
    document.head.appendChild(el);
  }
  el.setAttribute('href', href);
}

function setHreflang(href: string) {
  // Always point alternates to the canonical qitaat.com URL for the current path
  const langs: Array<{ hreflang: string; href: string }> = [
    { hreflang: 'ar', href },
    { hreflang: 'en', href },
    { hreflang: 'x-default', href },
  ];
  // Remove any stale alternates first
  document.querySelectorAll('link[rel="alternate"][hreflang]').forEach(el => el.remove());
  for (const l of langs) {
    const el = document.createElement('link');
    el.setAttribute('rel', 'alternate');
    el.setAttribute('hreflang', l.hreflang);
    el.setAttribute('href', l.href);
    document.head.appendChild(el);
  }
}

export function usePageMeta(options: PageMetaOptions) {
  useEffect(() => {
    const fullTitle = options.title.includes('قِطاعات') ? options.title : `${options.title} | ${SITE_NAME}`;
    document.title = fullTitle;

    if (options.description) {
      setMeta('description', options.description);
    }

    if (options.keywords) {
      setMeta('keywords', options.keywords);
    }

    // Canonical
    const canonicalUrl = options.canonical || `${BASE_URL}${window.location.pathname}`;
    setCanonical(canonicalUrl);
    setHreflang(canonicalUrl);

    // Open Graph
    setMeta('og:title', options.ogTitle || fullTitle, 'property');
    setMeta('og:description', options.ogDescription || options.description || '', 'property');
    setMeta('og:image', options.ogImage || DEFAULT_OG_IMAGE, 'property');
    setMeta('og:image:alt', options.ogImageAlt || options.ogTitle || fullTitle, 'property');
    setMeta('og:image:width', String(options.ogImageWidth ?? 1200), 'property');
    setMeta('og:image:height', String(options.ogImageHeight ?? 630), 'property');
    setMeta('og:type', options.ogType || 'website', 'property');
    setMeta('og:url', canonicalUrl, 'property');
    setMeta('og:site_name', SITE_NAME, 'property');
    setMeta('og:locale', 'ar_SA', 'property');
    setMeta('og:locale:alternate', 'en_US', 'property');

    // Twitter
    setMeta('twitter:title', options.ogTitle || fullTitle, 'name');
    setMeta('twitter:description', options.ogDescription || options.description || '', 'name');
    setMeta('twitter:image', options.ogImage || DEFAULT_OG_IMAGE, 'name');
    setMeta('twitter:image:alt', options.ogImageAlt || options.ogTitle || fullTitle, 'name');
    setMeta('twitter:card', 'summary_large_image', 'name');

    // Robots
    if (options.noindex) {
      setMeta('robots', 'noindex, nofollow');
    } else {
      setMeta('robots', 'index, follow, max-image-preview:large, max-snippet:-1, max-video-preview:-1');
    }
  }, [options.title, options.description, options.canonical, options.ogTitle, options.ogDescription, options.ogImage, options.ogImageAlt, options.ogImageWidth, options.ogImageHeight, options.ogType, options.noindex, options.keywords]);
}

// JSON-LD helper
export function useJsonLd(data: Record<string, any> | null) {
  useEffect(() => {
    if (!data) return;
    const id = 'json-ld-seo';
    let script = document.getElementById(id) as HTMLScriptElement | null;
    if (!script) {
      script = document.createElement('script');
      script.id = id;
      script.type = 'application/ld+json';
      document.head.appendChild(script);
    }
    script.textContent = JSON.stringify(data);
    return () => {
      script?.remove();
    };
  }, [data]);
}

// Multiple JSON-LD blocks helper
export function useMultiJsonLd(dataArray: Record<string, any>[] | null) {
  useEffect(() => {
    if (!dataArray || dataArray.length === 0) return;
    // Defer writing JSON-LD blocks until the browser is idle so they
    // never compete with the LCP paint (search engines still see them
    // on first JS execution; social crawlers don't read JSON-LD anyway).
    const writeBlocks = () => {
      document.querySelectorAll('script[data-multi-ld]').forEach((el) => el.remove());
      const frag = document.createDocumentFragment();
      dataArray.forEach((data, i) => {
        const script = document.createElement('script');
        script.type = 'application/ld+json';
        script.setAttribute('data-multi-ld', String(i));
        script.textContent = JSON.stringify(data);
        frag.appendChild(script);
      });
      document.head.appendChild(frag);
    };

    const ric = (window as unknown as {
      requestIdleCallback?: (cb: () => void, opts?: { timeout: number }) => number;
      cancelIdleCallback?: (id: number) => void;
    }).requestIdleCallback;
    let idleId: number | null = null;
    let timeoutId: number | null = null;
    if (typeof ric === 'function') {
      idleId = ric(writeBlocks, { timeout: 1500 });
    } else {
      timeoutId = window.setTimeout(writeBlocks, 0);
    }

    return () => {
      if (idleId !== null) {
        const cic = (window as unknown as { cancelIdleCallback?: (id: number) => void }).cancelIdleCallback;
        cic?.(idleId);
      }
      if (timeoutId !== null) window.clearTimeout(timeoutId);
      document.querySelectorAll('script[data-multi-ld]').forEach((el) => el.remove());
    };
  }, [dataArray]);
}
