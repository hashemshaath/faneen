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

export interface ContractNameInput {
  title?: string | null;
  contract_number?: string | null;
  reference_number?: string | null;
}

export interface RequestNameInput {
  title?: string | null;
  reference_number?: string | null;
  service_name?: string | null;
  category_name?: string | null;
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

/**
 * Sub-line under a site title: "{city} — {district}", or address, or a
 * localized generic "execution site". Never echoes the site id.
 */
export function formatSiteSubtitle(
  site: SiteNameInput | null | undefined,
  isRTL: boolean,
): string {
  if (!site) return isRTL ? 'موقع تنفيذ' : 'Execution site';
  const city = clean(site.city_name);
  const district = clean(site.district);
  if (city && district) return isRTL ? `${city} — ${district}` : `${city} — ${district}`;
  if (city) return city;
  if (district) return district;
  const addr = clean(site.address_line1);
  if (addr) return addr;
  return isRTL ? 'موقع تنفيذ' : 'Execution site';
}

/**
 * Sub-line under a project title: linked site name, then city, then a
 * localized generic "project" label.
 */
export function formatProjectSubtitle(
  project: ProjectNameInput | null | undefined,
  site: SiteNameInput | null | undefined,
  isRTL: boolean,
): string {
  const siteNamed = clean(site?.site_name) ?? clean(site?.label);
  if (siteNamed) return siteNamed;
  const place = clean(site?.city_name) ?? clean(site?.district);
  if (place) return place;
  return isRTL ? 'مشروع' : 'Project';
}

export interface ContractContext {
  projectTitle?: string | null;
  siteTitle?: string | null;
}

export function formatContractTitle(
  contract: ContractNameInput | null | undefined,
  context: ContractContext | null | undefined,
  isRTL: boolean,
): string {
  if (!contract) return isRTL ? 'عقد غير مسمى' : 'Untitled contract';
  const named =
    clean(contract.title) ??
    clean(contract.contract_number) ??
    clean(contract.reference_number);
  if (named) return named;
  const proj = clean(context?.projectTitle);
  if (proj) return isRTL ? `عقد ${proj}` : `Contract — ${proj}`;
  const siteT = clean(context?.siteTitle);
  if (siteT) return isRTL ? `عقد مرتبط بـ ${siteT}` : `Contract linked to ${siteT}`;
  return isRTL ? 'عقد غير مسمى' : 'Untitled contract';
}

export function formatContractSubtitle(
  contract: ContractNameInput | null | undefined,
  context: ContractContext | null | undefined,
  isRTL: boolean,
): string {
  const siteT = clean(context?.siteTitle);
  if (siteT) return siteT;
  const proj = clean(context?.projectTitle);
  if (proj) return proj;
  const ref = clean(contract?.reference_number);
  if (ref) return ref;
  return isRTL ? 'عقد' : 'Contract';
}

export interface RequestContext {
  siteTitle?: string | null;
}

export function formatRequestTitle(
  request: RequestNameInput | null | undefined,
  context: RequestContext | null | undefined,
  isRTL: boolean,
): string {
  if (!request) return isRTL ? 'طلب غير مسمى' : 'Untitled request';
  const named = clean(request.title) ?? clean(request.reference_number);
  if (named) return named;
  const svc = clean(request.service_name) ?? clean(request.category_name);
  if (svc) return isRTL ? `طلب ${svc}` : `Request — ${svc}`;
  const siteT = clean(context?.siteTitle);
  if (siteT) return isRTL ? `طلب مرتبط بـ ${siteT}` : `Request linked to ${siteT}`;
  return isRTL ? 'طلب غير مسمى' : 'Untitled request';
}

/**
 * Render a UUID as a small "ref: xxxxxxxx" chip — never as a primary
 * heading. Returns empty string for invalid input.
 */
export function formatEntityReference(
  id: string | null | undefined,
  isRTL = true,
): string {
  const short = shortReferenceId(id);
  if (!short) return '';
  return isRTL ? `مرجع: ${short}` : `Ref: ${short}`;
}