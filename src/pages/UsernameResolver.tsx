import React from 'react';
import { useParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { getBusinessIdByUsername } from '@/modules/businesses';
import BusinessProfile from './BusinessProfile';
import PublicUserProfile from './PublicUserProfile';
import NotFound from './NotFound';
import { isReservedUsername, normalizeUsername } from '@/lib/business/profileHref';

/**
 * Resolves `/:username` to either a business profile or a public user profile.
 * Businesses take precedence over users when both share the same handle.
 */
export const UsernameResolver: React.FC = () => {
  const { username = '' } = useParams<{ username: string }>();
  const normalized = normalizeUsername(username);

  const { data, isLoading } = useQuery({
    queryKey: ['username-kind', normalized],
    queryFn: async () => {
      const { data } = await getBusinessIdByUsername({ username: normalized });
      return data?.id ? 'business' : 'user';
    },
    enabled: !!normalized && !isReservedUsername(normalized),
    // Keep the kind decision fresh enough that newly-published profiles
    // become reachable without forcing a hard reload, while still
    // de-duplicating bursts of tab switches.
    staleTime: 30_000,
    refetchOnMount: 'always',
  });

  // Reserved top-level slugs (admin, dashboard, quote, ...) must never
  // resolve as a username — happens when the URL case differs from the
  // declared route (e.g. /Admin) and falls through to /:username.
  if (isReservedUsername(normalized)) {
    return <NotFound />;
  }

  if (isLoading) {
    return <div className="min-h-dvh bg-background" aria-busy="true" />;
  }
  return data === 'business' ? <BusinessProfile /> : <PublicUserProfile />;
};

export default UsernameResolver;