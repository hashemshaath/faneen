/**
 * CODEBASE AUDIT PASS 2A — Central HTML/SVG sanitizer.
 *
 * All `dangerouslySetInnerHTML` call sites that render blog content, QR SVG,
 * or embeddable badge HTML MUST route through these helpers. This keeps the
 * DOMPurify allowlist in one auditable place and prevents drift if the
 * upstream default policy changes.
 *
 * Policies (all profiles):
 *  - No `<script>`
 *  - No inline event handlers (`onload`, `onclick`, ...)
 *  - No `javascript:` URLs
 *  - No `<iframe>` / `<object>` / `<embed>`
 */
import DOMPurify from 'dompurify';

const BLOG_ALLOWED_TAGS = [
  'a', 'p', 'br', 'hr', 'span', 'div', 'blockquote', 'pre', 'code',
  'strong', 'em', 'b', 'i', 'u', 's', 'sub', 'sup',
  'h1', 'h2', 'h3', 'h4', 'h5', 'h6',
  'ul', 'ol', 'li',
  'table', 'thead', 'tbody', 'tfoot', 'tr', 'th', 'td',
  'img', 'figure', 'figcaption',
] as const;

const BLOG_ALLOWED_ATTR = [
  'href', 'target', 'rel', 'title', 'alt', 'src', 'srcset', 'sizes',
  'class', 'id', 'dir', 'lang', 'name', 'colspan', 'rowspan',
  'width', 'height', 'loading',
] as const;

/**
 * Sanitize untrusted blog/markdown HTML for safe rendering via
 * `dangerouslySetInnerHTML`. Strips scripts, event handlers, javascript: URLs,
 * iframes, and any tag/attribute outside the explicit allowlist.
 */
export function sanitizeBlogHtml(input: string): string {
  if (!input) return '';
  return DOMPurify.sanitize(input, {
    ALLOWED_TAGS: [...BLOG_ALLOWED_TAGS],
    ALLOWED_ATTR: [...BLOG_ALLOWED_ATTR],
    ALLOWED_URI_REGEXP: /^(?:(?:https?|mailto|tel):|[#/])/i,
    FORBID_TAGS: ['script', 'style', 'iframe', 'object', 'embed', 'form'],
    FORBID_ATTR: ['style'],
    KEEP_CONTENT: true,
    USE_PROFILES: { html: true },
  });
}

/**
 * Sanitize SVG markup (QR codes, badges) for safe rendering via
 * `dangerouslySetInnerHTML`. Uses DOMPurify's SVG profile and explicitly
 * forbids scripts and event handlers.
 */
export function sanitizeSvgMarkup(input: string): string {
  if (!input) return '';
  return DOMPurify.sanitize(input, {
    USE_PROFILES: { svg: true, svgFilters: true },
    FORBID_TAGS: ['script', 'foreignObject'],
    FORBID_ATTR: ['onload', 'onerror', 'onclick', 'onmouseover', 'onfocus'],
  });
}

/**
 * Sanitize embeddable badge HTML snippets (links + inline SVG) for preview
 * rendering. Allows the structural tags badge snippets need while still
 * blocking scripts, event handlers, and javascript: URLs.
 */
export function sanitizeBadgeHtml(input: string): string {
  if (!input) return '';
  return DOMPurify.sanitize(input, {
    ADD_TAGS: ['svg', 'path', 'g', 'rect', 'circle', 'defs', 'use', 'title', 'desc', 'linearGradient', 'stop'],
    ADD_ATTR: ['viewBox', 'fill', 'd', 'transform', 'stroke', 'stroke-width', 'xmlns'],
    ALLOWED_URI_REGEXP: /^(?:(?:https?|mailto|tel):|[#/])/i,
    FORBID_TAGS: ['script', 'iframe', 'object', 'embed', 'form'],
    FORBID_ATTR: ['onload', 'onerror', 'onclick', 'onmouseover', 'onfocus'],
  });
}