import React from 'react';
import { useParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import BusinessProfile from './BusinessProfile';
import PublicUserProfile from './PublicUserProfile';

/**
 * Resolves `/:username` to either a business profile or a public user profile.
 * Businesses take precedence over users when both share the same handle.
 */
export const UsernameResolver: React.FC = () => {
  const { username = '' } = useParams<{ username: string }>();

  const { data, isLoading } = useQuery({
    queryKey: ['username-kind', username.toLowerCase()],
    queryFn: async () => {
      const { data } = await supabase
        .from('businesses')
        .select('id')
        .eq('username', username)
        .maybeSingle();
      return data?.id ? 'business' : 'user';
    },
    enabled: !!username,
    staleTime: 60_000,
  });

  if (isLoading) {
    return <div className="min-h-screen bg-background" aria-busy="true" />;
  }
  return data === 'business' ? <BusinessProfile /> : <PublicUserProfile />;
};

export default UsernameResolver;