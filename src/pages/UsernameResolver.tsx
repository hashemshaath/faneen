import React from 'react';
import { useParams } from 'react-router-dom';
import BusinessProfile from './BusinessProfile';
import PublicUserProfile from './PublicUserProfile';
import NotFound from './NotFound';
import { isReservedUsername, normalizeUsername } from '@/lib/business/profileHref';
import { usePublicBusinessProfile } from '@/lib/publicBusinessProfile';

/**
 * Resolves `/:username` to either a business profile or a public user profile.
 * Businesses take precedence over users when both share the same handle.
 */
export const UsernameResolver: React.FC = () => {
  const { username = '' } = useParams<{ username: string }>();
  const normalized = normalizeUsername(username);

  // PROFILE-AGGREGATE — the resolver now fetches the WHOLE public profile
  // (business + branches + services + certifications + awards + offers count)
  // in a single RPC round-trip, and seeds every per-collection cache used
  // by BusinessProfile.tsx. This removes the post-chunk fetch waterfall
  // that made sections pop in after the header. Falls through to the
  // public user profile when no business matches the handle.
  const { data: aggregate, isLoading } = usePublicBusinessProfile(
    isReservedUsername(normalized) ? '' : normalized,
  );
  const businessRow = aggregate?.business ?? null;

  // Reserved top-level slugs (admin, dashboard, quote, ...) must never
  // resolve as a username — happens when the URL case differs from the
  // declared route (e.g. /Admin) and falls through to /:username.
  if (isReservedUsername(normalized)) {
    return <NotFound />;
  }

  if (isLoading) {
    return <div className="min-h-dvh bg-background" aria-busy="true" />;
  }
  return businessRow ? <BusinessProfile /> : <PublicUserProfile />;
};

export default UsernameResolver;