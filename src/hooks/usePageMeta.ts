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
}

const BASE_URL = 'https://faneen.com';
const DEFAULT_OG_IMAGE = 'https://pub-bb2e103a32db4e198524a2e9ed8f35b4.r2.dev/0262d291-fd10-4347-a69d-2b3087be7f84/id-preview-3203244e--d320e6b5-e4e8-444e-8ccf-7c6ff9bd67d7.lovable.app-1775753375295.png';
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

    // Twitter
    setMeta('twitter:title', options.ogTitle || fullTitle, 'name');
    setMeta('twitter:description', options.ogDescription || options.description || '', 'name');
    setMeta('twitter:image', options.ogImage || DEFAULT_OG_IMAGE, 'name');
    setMeta('twitter:card', 'summary_large_image', 'name');

    // Robots
    if (options.noindex) {
      setMeta('robots', 'noindex, nofollow');
    } else {
      setMeta('robots', 'index, follow');
    }
  }, [options.title, options.description, options.canonical, options.ogTitle, options.ogDescription, options.ogImage, options.ogType, options.noindex]);
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
