import { isSyntheticPhoneEmail } from '@/lib/auth-email';
import type { Tables } from '@/integrations/supabase/types';

/**
 * Phase 6C — pure adapter for the read-only `UserDetailsDrawer`.
 *
 * Takes a profile row plus the parent's `roleMap` / `businessLinksMap`
 * and returns a flat prop bag matching the drawer's interface. No
 * Supabase access, no React state, no mutations — strictly data-shape
 * conversion so the parent page can render the drawer with a single
 * spread.
 */

type Profile = Tables<'profiles'>;

export interface DrawerRoleEntry {
  role: string;
}

export interface DrawerBusinessLink {
  business: {
    id: string;
    name_ar: string;
    name_en: string | null;
    ref_id: string;
    username: string;
  };
  role: string;
}

export interface UserDetailsDrawerProps {
  user: {
    id: string;
    user_id: string;
    ref_id: string | null;
    full_name: string | null;
    full_name_ar: string | null;
    full_name_en: string | null;
    username: string | null;
    email: string | null;
    phone: string | null;
    account_type: string | null;
    membership_tier: string | null;
    is_banned: boolean | null;
    is_onboarded: boolean | null;
    phone_verified: boolean | null;
    created_at: string;
  };
  roles: string[];
  linkedEntities: Array<{
    id: string;
    name_ar: string;
    name_en: string | null;
    ref_id: string;
    username: string;
    role: string;
  }>;
  officialEmail: string | null;
}

export function buildUserDetailsDrawerProps(args: {
  profile: Profile;
  roles: DrawerRoleEntry[];
  businessLinks: DrawerBusinessLink[];
}): UserDetailsDrawerProps {
  const { profile, roles, businessLinks } = args;
  return {
    user: {
      id: profile.id,
      user_id: profile.user_id,
      ref_id: profile.ref_id ?? null,
      full_name: profile.full_name ?? null,
      full_name_ar: profile.full_name_ar ?? null,
      full_name_en: profile.full_name_en ?? null,
      username: profile.username ?? null,
      email: profile.email ?? null,
      phone: profile.phone ?? null,
      account_type: profile.account_type ?? null,
      membership_tier: profile.membership_tier ?? null,
      is_banned: profile.is_banned ?? null,
      is_onboarded: profile.is_onboarded ?? null,
      phone_verified: profile.phone_verified ?? null,
      created_at: profile.created_at,
    },
    roles: roles.map((r) => r.role),
    linkedEntities: businessLinks.map((l) => ({
      id: l.business.id,
      name_ar: l.business.name_ar,
      name_en: l.business.name_en,
      ref_id: l.business.ref_id,
      username: l.business.username,
      role: l.role,
    })),
    officialEmail:
      profile.email && !isSyntheticPhoneEmail(profile.email) ? profile.email : null,
  };
}