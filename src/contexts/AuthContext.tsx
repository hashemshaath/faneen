/* eslint-disable react-refresh/only-export-components */
import React, { createContext, useContext, useEffect, useState, useCallback, useRef } from 'react';
import { User, Session } from '@supabase/supabase-js';
import { supabase } from '@/integrations/supabase/client';
import { queryClient } from '@/lib/queryClient';
import { getOwnerBusiness, getActiveBusinessStaffMembership } from '@/modules/businesses';
import { getProfileByUserId } from '@/modules/users';
import { getUserRoles } from '@/modules/identity';

interface UserProfile {
  id: string;
  user_id: string;
  full_name: string | null;
  phone: string | null;
  email: string | null;
  account_type: string;
  is_onboarded: boolean;
  phone_verified: boolean;
  country_code: string;
  avatar_url: string | null;
  account_number: number | null; // @deprecated – use ref_id only
  ref_id: string | null;
  membership_tier: string;
  username: string | null;
  preferred_language: string | null;
  country_id: string | null;
  city_id: string | null;
  full_name_ar: string | null;
  full_name_en: string | null;
  national_id_type: string | null;
  national_id: string | null;
  vat_number: string | null;
  short_national_address: string | null;
  region_name: string | null;
  district: string | null;
  street: string | null;
  building_number: string | null;
  additional_number: string | null;
  postal_code: string | null;
  address_line: string | null;
}

interface AuthContextType {
  user: User | null;
  session: Session | null;
  loading: boolean;
  signOut: () => Promise<void>;
  isAdmin: boolean;
  isSuperAdmin: boolean;
  isProvider: boolean;
  roles: string[];
  profile: UserProfile | null;
  refreshProfile: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  const [roles, setRoles] = useState<string[]>([]);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [providerAccess, setProviderAccess] = useState(false);
  const [dataLoaded, setDataLoaded] = useState(false);
  const initRef = useRef(false);
  const loadingRef = useRef(false);
  const lastUserIdRef = useRef<string | null>(null);

  // Clear all React Query cache whenever the signed-in user identity changes
  // (sign-out, sign-in, or switching accounts). Prevents previously-fetched
  // data of the old user from leaking into the new user's session via cache.
  const resetForUser = useCallback((nextUserId: string | null) => {
    if (lastUserIdRef.current !== nextUserId) {
      try { queryClient.clear(); } catch { /* noop */ }
      lastUserIdRef.current = nextUserId;
    }
  }, []);

  const fetchRoles = useCallback(async (userId: string) => {
    try {
      const fetchedRoles = await getUserRoles(userId);
      setRoles(fetchedRoles);
      return fetchedRoles;
    } catch {
      setRoles([]);
      return [];
    }
  }, []);

  const fetchProfile = useCallback(async (userId: string) => {
    try {
      const { data } = await getProfileByUserId<UserProfile>({
        userId,
        select: 'id, user_id, full_name, phone, email, account_type, is_onboarded, phone_verified, country_code, avatar_url, account_number, ref_id, membership_tier, username, preferred_language, country_id, city_id, full_name_ar, full_name_en, national_id_type, national_id, vat_number, short_national_address, region_name, district, street, building_number, additional_number, postal_code, address_line',
        terminal: 'single',
      });
      setProfile(data as UserProfile | null);
      return data;
    } catch {
      setProfile(null);
      return null;
    }
  }, []);

  const fetchProviderAccess = useCallback(async (userId: string) => {
    try {
      const [bizResult, staffResult] = await Promise.allSettled([
        getOwnerBusiness<{ id: string }>({ userId, select: 'id', limit: 1 }),
        getActiveBusinessStaffMembership<{ id: string }>({ userId, select: 'id' }),
      ]);
      const ownedBusiness = bizResult.status === 'fulfilled' ? bizResult.value.data : null;
      const staffMembership = staffResult.status === 'fulfilled' ? staffResult.value.data : null;
      const hasProviderAccess = Boolean(ownedBusiness?.id || staffMembership?.id);
      setProviderAccess(hasProviderAccess);
      return hasProviderAccess;
    } catch {
      setProviderAccess(false);
      return false;
    }
  }, []);

  const refreshProfile = useCallback(async () => {
    if (user) {
      await Promise.all([fetchProfile(user.id), fetchRoles(user.id), fetchProviderAccess(user.id)]);
    }
  }, [user, fetchProfile, fetchRoles, fetchProviderAccess]);

  const loadUserData = useCallback(async (userId: string) => {
    if (loadingRef.current) return;
    loadingRef.current = true;
    try {
      await Promise.all([fetchRoles(userId), fetchProfile(userId), fetchProviderAccess(userId)]);
      setDataLoaded(true);
    } catch {
      // Individual fetchers handle their own errors
      setDataLoaded(true);
    } finally {
      setLoading(false);
      loadingRef.current = false;
    }
  }, [fetchProviderAccess, fetchRoles, fetchProfile]);

  useEffect(() => {
    let mounted = true;

    // Set up auth listener FIRST, then get initial session
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, newSession) => {
      if (!mounted) return;

      const nextUserId = newSession?.user?.id ?? null;
      resetForUser(nextUserId);

      setSession(newSession);
      setUser(newSession?.user ?? null);

      if (newSession?.user) {
        // Use setTimeout to avoid Supabase deadlock with parallel requests during auth state change
        setTimeout(() => {
          if (mounted) loadUserData(newSession.user.id);
        }, 0);
      } else {
        setRoles([]);
        setProfile(null);
        setProviderAccess(false);
        setDataLoaded(false);
        if (initRef.current) setLoading(false);
      }
    });

    // Get initial session
    supabase.auth.getSession().then(({ data: { session: initialSession } }) => {
      if (!mounted) return;
      const nextUserId = initialSession?.user?.id ?? null;
      resetForUser(nextUserId);
      setSession(initialSession);
      setUser(initialSession?.user ?? null);
      if (initialSession?.user) {
        loadUserData(initialSession.user.id);
      } else {
        setLoading(false);
      }
      initRef.current = true;
    });

    return () => {
      mounted = false;
      subscription.unsubscribe();
    };
  }, [loadUserData]);

  const signOut = useCallback(async () => {
    setRoles([]);
    setProfile(null);
    setProviderAccess(false);
    setDataLoaded(false);
    try { queryClient.clear(); } catch { /* noop */ }
    lastUserIdRef.current = null;
    await supabase.auth.signOut();
  }, []);

  const isSuperAdmin = roles.includes('super_admin');
  const isAdmin = isSuperAdmin || roles.includes('admin');
  const isProvider = providerAccess || ['business', 'company', 'provider'].includes(profile?.account_type ?? '');

  return (
    <AuthContext.Provider value={{ user, session, loading, signOut, isAdmin, isSuperAdmin, isProvider, roles, profile, refreshProfile }}>
      {children}
    </AuthContext.Provider>
  );
};

const defaultAuthContext: AuthContextType = {
  user: null,
  session: null,
  loading: true,
  signOut: async () => {},
  isAdmin: false,
  isSuperAdmin: false,
  isProvider: false,
  roles: [],
  profile: null,
  refreshProfile: async () => {},
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  return context ?? defaultAuthContext;
};
