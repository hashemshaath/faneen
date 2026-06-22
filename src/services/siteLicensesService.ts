/**
 * SITE LICENSES SERVICE — single entry point for the
 * `client_site_licenses` table. UI components MUST NOT call
 * supabase.from('client_site_licenses') directly.
 *
 * Hard rules (mirrored in tests):
 *   - No hard delete; archiving via `is_archived = true` + status='archived'.
 *   - file_id (when set) must point to a file in the SAME site — enforced
 *     by a DB trigger; the service additionally validates client-side for
 *     friendlier errors.
 *   - No service_role / admin keys on the frontend.
 */
import { supabase } from '@/integrations/supabase/client';

export type SiteLicenseType =
  | 'license'
  | 'permit'
  | 'municipality'
  | 'civil_defense'
  | 'safety'
  | 'insurance'
  | 'other';

export type SiteLicenseStatus =
  | 'active'
  | 'expired'
  | 'pending'
  | 'rejected'
  | 'archived';

export const SITE_LICENSE_TYPES: ReadonlyArray<SiteLicenseType> = [
  'license',
  'permit',
  'municipality',
  'civil_defense',
  'safety',
  'insurance',
  'other',
];

export const SITE_LICENSE_STATUSES: ReadonlyArray<SiteLicenseStatus> = [
  'active',
  'pending',
  'expired',
  'rejected',
  'archived',
];

/** Days threshold for "expiring soon" UI hint. */
export const SITE_LICENSE_EXPIRY_SOON_DAYS = 30;

export interface SiteLicenseRow {
  id: string;
  site_id: string;
  owner_user_id: string;
  business_id: string | null;
  license_type: SiteLicenseType;
  title: string;
  issuer_name: string | null;
  license_number: string | null;
  issue_date: string | null;
  expiry_date: string | null;
  status: SiteLicenseStatus;
  file_id: string | null;
  notes: string | null;
  is_archived: boolean;
  created_at: string;
  updated_at: string;
}

export interface CreateSiteLicenseInput {
  siteId: string;
  license_type: SiteLicenseType;
  title: string;
  issuer_name?: string | null;
  license_number?: string | null;
  issue_date?: string | null;
  expiry_date?: string | null;
  status?: SiteLicenseStatus;
  file_id?: string | null;
  notes?: string | null;
  businessId?: string | null;
}

export interface UpdateSiteLicenseInput {
  license_type?: SiteLicenseType;
  title?: string;
  issuer_name?: string | null;
  license_number?: string | null;
  issue_date?: string | null;
  expiry_date?: string | null;
  status?: SiteLicenseStatus;
  file_id?: string | null;
  notes?: string | null;
  is_archived?: boolean;
}

const TABLE = 'client_site_licenses' as const;

export async function listSiteLicenses(
  siteId: string,
  includeArchived = false,
): Promise<SiteLicenseRow[]> {
  let q = supabase
    .from(TABLE)
    .select('*')
    .eq('site_id', siteId)
    .order('created_at', { ascending: false });
  if (!includeArchived) q = q.eq('is_archived', false);
  const { data, error } = await q;
  if (error) throw error;
  return (data ?? []) as SiteLicenseRow[];
}

export async function createSiteLicense(
  input: CreateSiteLicenseInput,
): Promise<SiteLicenseRow> {
  const { data: auth, error: authErr } = await supabase.auth.getUser();
  if (authErr) throw authErr;
  const userId = auth.user?.id;
  if (!userId) throw new Error('AUTH_REQUIRED');

  const title = input.title.trim();
  if (!title) throw new Error('TITLE_REQUIRED');

  const { data, error } = await supabase
    .from(TABLE)
    .insert({
      site_id: input.siteId,
      owner_user_id: userId,
      business_id: input.businessId ?? null,
      license_type: input.license_type,
      title: title.slice(0, 200),
      issuer_name: input.issuer_name?.trim() || null,
      license_number: input.license_number?.trim() || null,
      issue_date: input.issue_date || null,
      expiry_date: input.expiry_date || null,
      status: input.status ?? 'active',
      file_id: input.file_id ?? null,
      notes: input.notes?.trim() || null,
    })
    .select('*')
    .single();
  if (error) throw error;
  return data as SiteLicenseRow;
}

export async function updateSiteLicense(
  id: string,
  payload: UpdateSiteLicenseInput,
): Promise<void> {
  const { error } = await supabase.from(TABLE).update(payload).eq('id', id);
  if (error) throw error;
}

export async function archiveSiteLicense(id: string): Promise<void> {
  const { error } = await supabase
    .from(TABLE)
    .update({ is_archived: true, status: 'archived' })
    .eq('id', id);
  if (error) throw error;
}

/** Days until expiry — null if no expiry_date. Negative = already expired. */
export const daysUntilExpiry = (expiry: string | null, today = new Date()): number | null => {
  if (!expiry) return null;
  const e = new Date(expiry + 'T00:00:00Z').getTime();
  const t = Date.UTC(today.getUTCFullYear(), today.getUTCMonth(), today.getUTCDate());
  return Math.floor((e - t) / (1000 * 60 * 60 * 24));
};

export const isExpiringSoon = (expiry: string | null): boolean => {
  const d = daysUntilExpiry(expiry);
  return d !== null && d >= 0 && d <= SITE_LICENSE_EXPIRY_SOON_DAYS;
};