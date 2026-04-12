import { useEffect } from 'react';

interface PageMetaOptions {
  title: string;
  description?: string;
  canonical?: string;
  ogTitle?: string;
  ogDescription?: string;
  ogImage?: string;
  ogType?: string;
  noindex?: boolean;
  keywords?: string;
}

const BASE_URL = 'https://faneen.com';
const DEFAULT_OG_IMAGE = 'https://faneen.com/og-image.jpg';
const SITE_NAME = 'فنيين Faneen';

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

export function usePageMeta(options: PageMetaOptions) {
  useEffect(() => {
    const fullTitle = options.title.includes('فنيين') ? options.title : `${options.title} | ${SITE_NAME}`;
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

    // Open Graph
    setMeta('og:title', options.ogTitle || fullTitle, 'property');
    setMeta('og:description', options.ogDescription || options.description || '', 'property');
    setMeta('og:image', options.ogImage || DEFAULT_OG_IMAGE, 'property');
    setMeta('og:type', options.ogType || 'website', 'property');
    setMeta('og:url', canonicalUrl, 'property');
    setMeta('og:site_name', SITE_NAME, 'property');
    setMeta('og:locale', 'ar_SA', 'property');

    // Twitter
    setMeta('twitter:title', options.ogTitle || fullTitle, 'name');
    setMeta('twitter:description', options.ogDescription || options.description || '', 'name');
    setMeta('twitter:image', options.ogImage || DEFAULT_OG_IMAGE, 'name');
    setMeta('twitter:card', 'summary_large_image', 'name');

    // Robots
    if (options.noindex) {
      setMeta('robots', 'noindex, nofollow');
    } else {
      setMeta('robots', 'index, follow, max-image-preview:large, max-snippet:-1, max-video-preview:-1');
    }
  }, [options.title, options.description, options.canonical, options.ogTitle, options.ogDescription, options.ogImage, options.ogType, options.noindex, options.keywords]);
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
    const containerId = 'json-ld-multi';
    // Remove old
    document.querySelectorAll(`script[data-multi-ld]`).forEach(el => el.remove());
    
    dataArray.forEach((data, i) => {
      const script = document.createElement('script');
      script.type = 'application/ld+json';
      script.setAttribute('data-multi-ld', String(i));
      script.textContent = JSON.stringify(data);
      document.head.appendChild(script);
    });

    return () => {
      document.querySelectorAll(`script[data-multi-ld]`).forEach(el => el.remove());
    };
  }, [dataArray]);
}
