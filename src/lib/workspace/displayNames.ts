/**
 * WORKSPACE DISPLAY NAMING — single source of truth for human-friendly
 * titles of projects, sites and unified workspaces.
 *
 * Hard rules:
 *  - Never return a raw UUID as a display title.
 *  - When no human name exists, fall back to city/district, then to a
 *    localized "unnamed" label (`موقع غير مسمى` / `Unnamed site`, etc.).
 *  - `shortReferenceId` produces the only allowed surface form of an id
 *    (first 8 chars), and only for small "reference" chips — never as a
 *    title.
 */

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

function clean(value: string | null | undefined): string | null {
  if (typeof value !== 'string') return null;
  const trimmed = value.trim();
  if (!trimmed) return null;
  // Guard against accidental UUIDs being passed in as "names".
  if (UUID_RE.test(trimmed)) return null;
  return trimmed;
}

export interface ProjectNameInput {
  title_ar?: string | null;
  title_en?: string | null;
  ref_id?: string | null;
}

export interface SiteNameInput {
  site_name?: string | null;
  label?: string | null;
  city_name?: string | null;
  district?: string | null;
  address_line1?: string | null;
}

export function formatSiteTitle(
  site: SiteNameInput | null | undefined,
  isRTL: boolean,
): string {
  if (!site) return isRTL ? 'موقع غير مسمى' : 'Unnamed site';
  const named = clean(site.site_name) ?? clean(site.label);
  if (named) return named;
  const place = clean(site.city_name) ?? clean(site.district);
  if (place) return isRTL ? `موقع في ${place}` : `Site in ${place}`;
  return isRTL ? 'موقع غير مسمى' : 'Unnamed site';
}

export function formatProjectTitle(
  project: ProjectNameInput | null | undefined,
  site: SiteNameInput | null | undefined,
  isRTL: boolean,
): string {
  if (!project) return isRTL ? 'مشروع غير مسمى' : 'Untitled project';
  const named = isRTL
    ? clean(project.title_ar) ?? clean(project.title_en)
    : clean(project.title_en) ?? clean(project.title_ar);
  if (named) return named;
  const siteNamed = clean(site?.site_name) ?? clean(site?.label);
  if (siteNamed) {
    return isRTL ? `مشروع مرتبط بـ ${siteNamed}` : `Project linked to ${siteNamed}`;
  }
  const place = clean(site?.city_name) ?? clean(site?.district);
  if (place) return isRTL ? `مشروع في ${place}` : `Project in ${place}`;
  return isRTL ? 'مشروع غير مسمى' : 'Untitled project';
}

export function formatWorkspaceTitle(
  kind: 'project' | 'site',
  project: ProjectNameInput | null | undefined,
  site: SiteNameInput | null | undefined,
  isRTL: boolean,
): string {
  return kind === 'project'
    ? formatProjectTitle(project, site, isRTL)
    : formatSiteTitle(site, isRTL);
}

/**
 * Short, masked reference form of a UUID — ONLY for use as a small
 * "ref: xxxxxxxx" chip. Never use as a title or primary heading.
 */
export function shortReferenceId(id: string | null | undefined): string {
  if (typeof id !== 'string') return '';
  const trimmed = id.trim();
  if (!trimmed) return '';
  return trimmed.slice(0, 8);
}

export function isUuidLike(value: string | null | undefined): boolean {
  return typeof value === 'string' && UUID_RE.test(value.trim());
}