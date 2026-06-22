/**
 * CLIENT WORKSPACE UNIFICATION — Phase 1 (read-only).
 *
 * Merges the user's `projects` and `client_sites` into a single
 * "Workspace" list/detail abstraction for the client dashboard.
 *
 * Hard rules for P1:
 *  - READ ONLY. No mutations, no RPCs, no edge calls.
 *  - No DB / RLS / migration changes are required — the queries below
 *    rely on existing RLS policies for `projects`, `client_sites`,
 *    `contracts` and `project_images`.
 *  - Does NOT call `create_contract_from_template` or any contract-
 *    creation RPC. Contract creation from a project is gated behind
 *    a future RPC approval (see Phase 4 plan).
 */
import { supabase } from '@/integrations/supabase/client';

export type ClientWorkspaceKind = 'project' | 'site';

export interface ClientWorkspace {
  kind: ClientWorkspaceKind;
  /** Stable composite id for routing: project.id or site.id */
  id: string;
  siteId: string | null;
  projectId: string | null;
  title: string;
  ownershipType: 'personal' | 'business';
  businessId: string | null;
  city: string | null;
  district: string | null;
  address: string | null;
  filesCount: number;
  latitude: number | null;
  longitude: number | null;
  mapUrl: string | null;
  contractsCount: number;
  reportsCount: number;
  violationsCount: number;
  updatedAt: string | null;
}

interface ProjectRow {
  id: string;
  business_id: string | null;
  owner_user_id: string | null;
  site_id: string | null;
  title_ar: string | null;
  title_en: string | null;
  description_ar: string | null;
  description_en: string | null;
  cover_image_url: string | null;
  updated_at: string | null;
  created_at: string | null;
}

interface SiteRow {
  id: string;
  owner_user_id: string | null;
  client_user_id: string | null;
  business_id: string | null;
  site_name: string | null;
  label: string | null;
  city_name: string | null;
  district: string | null;
  address_line1: string | null;
  address_line2: string | null;
  latitude: number | null;
  longitude: number | null;
  map_url: string | null;
  updated_at: string | null;
  created_at: string | null;
}

export interface ClientWorkspaceDetail {
  workspace: ClientWorkspace;
  project: ProjectRow | null;
  site: SiteRow | null;
}

/** Pick a non-empty title from project or site rows. */
function pickTitle(p: ProjectRow | null, s: SiteRow | null): string {
  return (
    p?.title_ar?.trim() ||
    p?.title_en?.trim() ||
    s?.site_name?.trim() ||
    s?.label?.trim() ||
    '—'
  );
}

function buildAddress(s: SiteRow | null): string | null {
  if (!s) return null;
  const parts = [s.address_line1, s.address_line2].filter(
    (v): v is string => typeof v === 'string' && v.trim().length > 0,
  );
  return parts.length > 0 ? parts.join(', ') : null;
}

/**
 * Returns the unified workspace list visible to the current user.
 * Combines:
 *   - every `project` they own (kind = "project")
 *   - every `client_site` they own that is NOT already attached to
 *     a project (kind = "site")
 *
 * Counts (files/contracts) are best-effort and degrade to zero on
 * permission errors — they are display-only in P1.
 */
export async function listClientWorkspaces(userId: string): Promise<ClientWorkspace[]> {
  const [projectsRes, sitesRes] = await Promise.all([
    supabase
      .from('projects')
      .select(
        'id, business_id, owner_user_id, site_id, title_ar, title_en, description_ar, description_en, cover_image_url, updated_at, created_at',
      )
      .eq('owner_user_id', userId)
      .order('updated_at', { ascending: false }),
    // RLS already restricts client_sites to rows the current user can
    // see (own sites, business-owned sites where they're owner/staff,
    // admin). Adding an extra .or() filter on owner_user_id /
    // client_user_id would hide business-owned sites where neither
    // column matches the user — exactly the bug reported in P1B.
    supabase
      .from('client_sites')
      .select(
        'id, owner_user_id, client_user_id, business_id, site_name, label, city_name, district, address_line1, address_line2, latitude, longitude, map_url, updated_at, created_at',
      )
      .is('archived_at', null)
      .order('updated_at', { ascending: false }),
  ]);

  const projects = (projectsRes.data ?? []) as ProjectRow[];
  const sites = (sitesRes.data ?? []) as SiteRow[];

  const sitesById = new Map<string, SiteRow>();
  for (const s of sites) sitesById.set(s.id, s);

  const projectWorkspaces: ClientWorkspace[] = projects.map((p) => {
    const site = p.site_id ? sitesById.get(p.site_id) ?? null : null;
    return {
      kind: 'project',
      id: p.id,
      projectId: p.id,
      siteId: p.site_id,
      title: pickTitle(p, site),
      ownershipType: p.business_id ? 'business' : 'personal',
      businessId: p.business_id,
      city: site?.city_name ?? null,
      district: site?.district ?? null,
      address: buildAddress(site),
      filesCount: 0,
      latitude: site?.latitude ?? null,
      longitude: site?.longitude ?? null,
      mapUrl: site?.map_url ?? null,
      contractsCount: 0,
      reportsCount: 0,
      violationsCount: 0,
      updatedAt: p.updated_at ?? p.created_at ?? null,
    };
  });

  const usedSiteIds = new Set(
    projects
      .map((p) => p.site_id)
      .filter((id): id is string => typeof id === 'string'),
  );

  const siteWorkspaces: ClientWorkspace[] = sites
    .filter((s) => !usedSiteIds.has(s.id))
    .map((s) => ({
      kind: 'site',
      id: s.id,
      projectId: null,
      siteId: s.id,
      title: pickTitle(null, s),
      ownershipType: s.business_id ? 'business' : 'personal',
      businessId: s.business_id,
      city: s.city_name,
      district: s.district,
      address: buildAddress(s),
      filesCount: 0,
      latitude: s.latitude,
      longitude: s.longitude,
      mapUrl: s.map_url,
      contractsCount: 0,
      reportsCount: 0,
      violationsCount: 0,
      updatedAt: s.updated_at ?? s.created_at ?? null,
    }));

  return [...projectWorkspaces, ...siteWorkspaces].sort((a, b) => {
    const ta = a.updatedAt ? Date.parse(a.updatedAt) : 0;
    const tb = b.updatedAt ? Date.parse(b.updatedAt) : 0;
    return tb - ta;
  });
}

/** Fetch a single workspace (project or site) for the detail page. */
export async function getClientWorkspace(
  kind: ClientWorkspaceKind,
  id: string,
): Promise<ClientWorkspaceDetail | null> {
  if (kind === 'project') {
    const { data: project } = await supabase
      .from('projects')
      .select(
        'id, business_id, owner_user_id, site_id, title_ar, title_en, description_ar, description_en, cover_image_url, updated_at, created_at',
      )
      .eq('id', id)
      .maybeSingle();
    if (!project) return null;
    const projectRow = project as ProjectRow;
    let siteRow: SiteRow | null = null;
    if (projectRow.site_id) {
      const { data: site } = await supabase
        .from('client_sites')
        .select(
          'id, owner_user_id, client_user_id, business_id, site_name, label, city_name, district, address_line1, address_line2, latitude, longitude, map_url, updated_at, created_at',
        )
        .eq('id', projectRow.site_id)
        .maybeSingle();
      siteRow = (site as SiteRow | null) ?? null;
    }
    return {
      workspace: {
        kind: 'project',
        id: projectRow.id,
        projectId: projectRow.id,
        siteId: projectRow.site_id,
        title: pickTitle(projectRow, siteRow),
        ownershipType: projectRow.business_id ? 'business' : 'personal',
        businessId: projectRow.business_id,
        city: siteRow?.city_name ?? null,
        district: siteRow?.district ?? null,
        address: buildAddress(siteRow),
        filesCount: 0,
        latitude: siteRow?.latitude ?? null,
        longitude: siteRow?.longitude ?? null,
        mapUrl: siteRow?.map_url ?? null,
        contractsCount: 0,
        reportsCount: 0,
        violationsCount: 0,
        updatedAt: projectRow.updated_at ?? projectRow.created_at ?? null,
      },
      project: projectRow,
      site: siteRow,
    };
  }

  const { data: site } = await supabase
    .from('client_sites')
    .select(
      'id, owner_user_id, client_user_id, business_id, site_name, label, city_name, district, address_line1, address_line2, latitude, longitude, map_url, updated_at, created_at',
    )
    .eq('id', id)
    .maybeSingle();
  if (!site) return null;
  const siteRow = site as SiteRow;
  return {
    workspace: {
      kind: 'site',
      id: siteRow.id,
      projectId: null,
      siteId: siteRow.id,
      title: pickTitle(null, siteRow),
      ownershipType: siteRow.business_id ? 'business' : 'personal',
      businessId: siteRow.business_id,
      city: siteRow.city_name,
      district: siteRow.district,
      address: buildAddress(siteRow),
      filesCount: 0,
      latitude: siteRow.latitude,
      longitude: siteRow.longitude,
      mapUrl: siteRow.map_url,
      contractsCount: 0,
      reportsCount: 0,
      violationsCount: 0,
      updatedAt: siteRow.updated_at ?? siteRow.created_at ?? null,
    },
    project: null,
    site: siteRow,
  };
}

export interface WorkspaceContractRow {
  id: string;
  contract_number: string | null;
  title_ar: string | null;
  title_en: string | null;
  status: string | null;
  total_amount: number | null;
  currency_code: string | null;
  updated_at: string | null;
  created_at: string | null;
}

/** Read-only contracts list scoped to the workspace's execution site. */
export async function listWorkspaceContracts(
  siteId: string | null,
): Promise<WorkspaceContractRow[]> {
  if (!siteId) return [];
  const { data } = await supabase
    .from('contracts')
    .select(
      'id, contract_number, title_ar, title_en, status, total_amount, currency_code, updated_at, created_at',
    )
    .eq('execution_site_id', siteId)
    .order('updated_at', { ascending: false });
  return (data ?? []) as WorkspaceContractRow[];
}

export interface WorkspaceProjectImageRow {
  id: string;
  image_url: string | null;
  created_at: string | null;
}

/** Read-only project gallery for the Files tab (project workspaces only). */
export async function listWorkspaceProjectImages(
  projectId: string | null,
): Promise<WorkspaceProjectImageRow[]> {
  if (!projectId) return [];
  const { data } = await supabase
    .from('project_images')
    .select('id, image_url, created_at')
    .eq('project_id', projectId)
    .order('created_at', { ascending: false });
  return (data ?? []) as WorkspaceProjectImageRow[];
}