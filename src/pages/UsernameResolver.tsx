import React from 'react';
import { useParams } from 'react-router-dom';
import BusinessProfile from './BusinessProfile';
import PublicUserProfile from './PublicUserProfile';
import NotFound from './NotFound';
import { isReservedUsername, normalizeUsername } from '@/lib/business/profileHref';
import { useBusinessByUsername } from '@/components/business-profile/business-profile.data';

/**
 * Resolves `/:username` to either a business profile or a public user profile.
 * Businesses take precedence over users when both share the same handle.
 */
export const UsernameResolver: React.FC = () => {
  const { username = '' } = useParams<{ username: string }>();
  const normalized = normalizeUsername(username);

  // PERF — collapse the 2-stage waterfall (kind lookup → full row fetch)
  // into a single query. `useBusinessByUsername` selects the full public
  // business row; if it returns null we fall through to PublicUserProfile
  // (the /:username handle belongs to a user, not a business). This
  // removes an entire round-trip from provider profile opens.
  const { data: businessRow, isLoading } = useBusinessByUsername(
    isReservedUsername(normalized) ? '' : normalized,
  );

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