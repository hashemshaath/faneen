/**
 * Shared helpers + constants for `AdminBusinesses` and its extracted
 * sub-panels. Pure presentation/data helpers only — no React state,
 * no Supabase calls, no React-Query hooks. This keeps the file
 * importable from both the parent page and any child panel without
 * circular dependencies.
 */
import type { AdminBusinessCsvRow } from '../adminBusinesses.types';

/** Membership tier metadata used by selects, badges, and tier filters. */
export interface TierMeta {
  value: 'free' | 'basic' | 'premium' | 'enterprise';
  label_ar: string;
  label_en: string;
  color: string;
  icon: string;
}

export const TIERS: TierMeta[] = [
  { value: 'free',       label_ar: 'مجاني',  label_en: 'Free',       color: 'bg-muted text-muted-foreground',          icon: '🆓' },
  { value: 'basic',      label_ar: 'أساسي',  label_en: 'Basic',      color: 'bg-info/10 text-info',                    icon: '⭐' },
  { value: 'premium',    label_ar: 'مميز',   label_en: 'Premium',    color: 'bg-accent/20 text-accent-foreground',     icon: '👑' },
  { value: 'enterprise', label_ar: 'مؤسسات', label_en: 'Enterprise', color: 'bg-secondary/10 text-secondary',          icon: '🏢' },
];

/** Result shape returned by the Nominatim reverse-geocode helper. */
export interface ReverseGeocodeAddress {
  region: string;
  district: string;
  street_name: string;
  building_number: string;
  address: string;
}

/**
 * Reverse-geocode a lat/lng pair via OpenStreetMap Nominatim. Returns
 * `null` on any network/parse failure — callers should treat null as
 * "leave fields blank and let the operator fill manually".
 */
export const reverseGeocode = async (
  lat: number,
  lng: number,
): Promise<ReverseGeocodeAddress | null> => {
  try {
    const res = await fetch(
      `https://nominatim.openstreetmap.org/reverse?lat=${lat}&lon=${lng}&format=json&accept-language=ar&addressdetails=1`,
    );
    const data = await res.json();
    const a = data.address || {};
    return {
      region: a.state || a.county || '',
      district: a.suburb || a.neighbourhood || a.quarter || '',
      street_name: a.road || a.pedestrian || '',
      building_number: a.house_number || '',
      address: data.display_name || '',
    };
  } catch {
    return null;
  }
};

/**
 * Download the filtered admin business list as a UTF-8 CSV with BOM
 * (Excel-safe). The `language` argument is currently unused but kept
 * in the signature so we can localize headers in a follow-up without
 * touching every caller.
 */
export const exportBusinessesCsv = (
  businesses: ReadonlyArray<AdminBusinessCsvRow>,
  _language: string,
): void => {
  // Phase 18f — legacy `category_id` removed from CSV. Activity
  // classification now lives in `business_taxonomy_categories` and is
  // admin-managed inline.
  const headers = ['Ref ID', 'Name (AR)', 'Name (EN)', 'Username', 'Phone', 'Email', 'Tier', 'Verified', 'Active', 'Rating', 'Created'];
  const rows = businesses.map((b) => [
    b.ref_id,
    b.name_ar,
    b.name_en || '',
    `@${b.username}`,
    b.phone || '',
    b.email || '',
    b.membership_tier,
    b.is_verified ? 'Yes' : 'No',
    b.is_active ? 'Yes' : 'No',
    `${b.rating_avg} (${b.rating_count})`,
    new Date(b.created_at ?? '').toLocaleDateString(),
  ]);
  const csv = [headers, ...rows].map((r) => r.map((c) => `"${c}"`).join(',')).join('\n');
  const blob = new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `businesses_${new Date().toISOString().slice(0, 10)}.csv`;
  a.click();
  URL.revokeObjectURL(url);
};