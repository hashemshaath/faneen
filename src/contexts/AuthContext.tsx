import React, { createContext, useContext, useEffect, useState, useCallback } from 'react';
import { User, Session } from '@supabase/supabase-js';
import { supabase } from '@/integrations/supabase/client';

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
  account_number: number | null;
  ref_id: string | null;
  membership_tier: string;
}

interface AuthContextType {
  user: User | null;
  session: Session | null;
  loading: boolean;
  signOut: () => Promise<void>;
  isAdmin: boolean;
  isSuperAdmin: boolean;
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

  const fetchRoles = useCallback(async (userId: string) => {
    const { data } = await supabase
      .from('user_roles')
      .select('role')
      .eq('user_id', userId);
    const fetchedRoles = data?.map(r => r.role) || [];
    setRoles(fetchedRoles);
    return fetchedRoles;
  }, []);

  const fetchProfile = useCallback(async (userId: string) => {
    const { data } = await supabase
      .from('profiles')
      .select('id, user_id, full_name, phone, email, account_type, is_onboarded, phone_verified, country_code, avatar_url, account_number, ref_id, membership_tier')
      .eq('user_id', userId)
      .single();
    setProfile(data as UserProfile | null);
    return data;
  }, []);

  const refreshProfile = useCallback(async () => {
    if (user) {
      await fetchProfile(user.id);
    }
  }, [user, fetchProfile]);

  const loadUserData = useCallback(async (userId: string) => {
    try {
      await Promise.all([fetchRoles(userId), fetchProfile(userId)]);
    } catch {
      // silent fail
    } finally {
      setLoading(false);
    }
  }, [fetchRoles, fetchProfile]);

  useEffect(() => {
    let mounted = true;

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      if (!mounted) return;
      setSession(session);
      setUser(session?.user ?? null);
      if (session?.user) {
        // Don't set loading=false here — wait for loadUserData
        loadUserData(session.user.id);
      } else {
        setRoles([]);
        setProfile(null);
        setLoading(false);
      }
    });

    supabase.auth.getSession().then(({ data: { session } }) => {
      if (!mounted) return;
      setSession(session);
      setUser(session?.user ?? null);
      if (session?.user) {
        loadUserData(session.user.id);
      } else {
        setLoading(false);
      }
    });

    return () => {
      mounted = false;
      subscription.unsubscribe();
    };
  }, [loadUserData]);

  const signOut = async () => {
    await supabase.auth.signOut();
    setRoles([]);
    setProfile(null);
  };

  const isSuperAdmin = roles.includes('super_admin');
  const isAdmin = isSuperAdmin || roles.includes('admin');

  return (
    <AuthContext.Provider value={{ user, session, loading, signOut, isAdmin, isSuperAdmin, roles, profile, refreshProfile }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth must be used within AuthProvider');
  return context;
};
