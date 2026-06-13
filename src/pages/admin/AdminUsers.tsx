import React, { useState, useMemo, useCallback, useTransition, useEffect, useRef } from 'react';
import { useSearchParams } from 'react-router-dom';
import { MaybeDashboardLayout as DashboardLayout } from '@/components/admin/MaybeDashboardLayout';
import { useLanguage } from '@/i18n/LanguageContext';
import { pickBi } from '@/components/common/Bilingual';
import { useAuth } from '@/contexts/AuthContext';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { adminCreateUser, type AdminCreateUserPayload } from '@/modules/admin';
import {
  listAdminBusinesses,
  listAllBusinessStaffForAdmin,
  updateBusinessStaffRole,
  removeBusinessStaff,
  insertBusinessStaff,
} from '@/modules/businesses';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';
import { Progress } from '@/components/ui/progress';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { toast } from 'sonner';
import {
  Users, UserPlus, Loader2, Send, Lock, Eye, EyeOff, X, AlertTriangle,
  Download, Sparkles, BarChart3, RefreshCw,
} from 'lucide-react';
import { isSyntheticPhoneEmail } from '@/lib/auth-email';
import { listAllUserRoles, grantRole, revokeRoleById, adminResetPassword, adminDeleteUser, logAdminActivity } from '@/modules/identity';
import { listProfiles, updateProfileById, updateProfilesByIds } from '@/modules/users';
import { parsePhoneValue } from '@/components/forms/PhoneField';
import type { Tables } from '@/integrations/supabase/types';
import type { UsernameCheckReason } from '@/components/common/UsernamePicker';
import {
  EmailLiveHint,
  type SortKey, type SortDir, type Density,
  type FilterScope, type FilterBusinessLink,
  type CreateUserForm,
} from './users/_shared';
import { AdminListPageTemplate } from '@/components/admin/AdminListPageTemplate';
import { AdminUsersStatsStrip, buildAdminUserStats } from '@/components/admin/users/AdminUsersStatsStrip';
import { AdminUsersPageShell } from '@/components/admin/users/AdminUsersPageShell';
import { UserDetailsDrawer } from '@/components/admin/users/UserDetailsDrawer';
import { buildUserDetailsDrawerProps } from '@/components/admin/users/buildUserDetailsDrawerProps';
import { OverviewTab } from './users/OverviewTab';
import { AnalyticsTab } from './users/AnalyticsTab';
import { UserFiltersBar } from './users/UserFiltersBar';
import { CreateUserPanel } from './users/CreateUserPanel';
import { UserEditPanel } from './users/UserEditPanel';
import { UsersListSection } from './users/UsersListSection';
import {
  tierConfig, accountTypeConfig, roleConfig, staffRoleConfig,
  type Profile, type UserRole,
} from './users/userConfigs';
import type { StaffRole, BusinessLink, BusinessInfo } from './users/_shared';

/**
 * Parse a raw save-mutation error into a structured `{ field, reason, rawCode, friendly }`.
 *
 * Recognised wire formats (case-insensitive):
 *   - `username_unavailable: taken`
 *   - `username_unavailable: invalid_format`
 *   - `email_unavailable: taken`
 *   - `phone_unavailable: taken`
 *   - generic text mentioning `username` / `email` / `phone`
 *
 * Exported (named export hoisted via `export function`) so tests can import it.
 */
export type ProfileSaveErrorField = 'username' | 'email' | 'phone' | null;
export interface ParsedProfileSaveError {
  field: ProfileSaveErrorField;
  /** Reason token compatible with UsernameCheckReason where applicable. */
  reason: string;
  /** Raw machine token (whatever the server emitted after the colon, or the prefix). */
  rawCode: string;
  /** Localized friendly message for inline + toast. */
  friendly: string | null;
}

export function parseProfileSaveError(raw: string, isRTL: boolean): ParsedProfileSaveError {
  const lower = (raw || '').toLowerCase();
  // Structured "prefix: code" form, e.g. `username_unavailable: taken`.
  const m = lower.match(/(username|email|phone)[_-]?unavailable\s*:\s*([a-z_]+)/);
  if (m) {
    const field = m[1] as 'username' | 'email' | 'phone';
    const code = m[2];
    return {
      field,
      reason: code,
      rawCode: `${m[1]}_unavailable: ${code}`,
      friendly: friendlyFor(field, code, isRTL),
    };
  }
  if (lower.includes('username_taken') || lower.includes('username')) {
    return { field: 'username', reason: 'taken', rawCode: 'username_taken',
      friendly: friendlyFor('username', 'taken', isRTL) };
  }
  if (lower.includes('email')) {
    return { field: 'email', reason: 'invalid', rawCode: 'email_invalid_or_taken',
      friendly: friendlyFor('email', 'invalid', isRTL) };
  }
  if (lower.includes('phone')) {
    return { field: 'phone', reason: 'invalid', rawCode: 'phone_invalid_or_taken',
      friendly: friendlyFor('phone', 'invalid', isRTL) };
  }
  return { field: null, reason: 'unknown', rawCode: raw || 'unknown', friendly: null };
}

function friendlyFor(field: 'username' | 'email' | 'phone', code: string, isRTL: boolean): string {
  const ar: Record<string, string> = {
    'username:taken': 'اسم المستخدم محجوز — جرّب اسماً آخر',
    'username:invalid_format': 'تنسيق اسم المستخدم غير صحيح',
    'username:reserved': 'هذا الاسم محجوز للنظام',
    'username:too_short': 'اسم المستخدم قصير جداً',
    'username:too_long': 'اسم المستخدم طويل جداً',
    'email:taken': 'البريد الإلكتروني مستخدم في حساب آخر',
    'email:invalid': 'البريد الإلكتروني غير صالح أو مستخدم',
    'phone:taken': 'رقم الهاتف مستخدم في حساب آخر',
    'phone:invalid': 'رقم الهاتف غير صالح أو مستخدم',
  };
  const en: Record<string, string> = {
    'username:taken': 'Username already taken — pick another',
    'username:invalid_format': 'Username format is invalid',
    'username:reserved': 'This username is reserved',
    'username:too_short': 'Username is too short',
    'username:too_long': 'Username is too long',
    'email:taken': 'Email is already used by another account',
    'email:invalid': 'Email is invalid or already in use',
    'phone:taken': 'Phone is already used by another account',
    'phone:invalid': 'Phone is invalid or already in use',
  };
  const key = `${field}:${code}`;
  return (isRTL ? ar[key] : en[key]) ?? (pickBi(isRTL, 'تعذّر الحفظ', 'Could not save'));
}
import type { NormalizedRpcError } from '@/services/rpc';

import { useNoIndex } from "@/hooks/useNoIndex";
type ActivePanel =
  | null
  | { type: 'edit'; profile: Profile }
  | { type: 'password'; userId: string; userName: string }
  | { type: 'delete'; userId: string; userName: string }
  | { type: 'create' };


const getPasswordValidationMessage = (password: string, isRTL: boolean): string | null => {
  if (!password) return null;
  if (password.length < 8) return pickBi(isRTL, 'كلمة المرور يجب أن تكون 8 حروف على الأقل', 'Password must be at least 8 characters');
  if (/\s/.test(password)) return pickBi(isRTL, 'كلمة المرور يجب ألا تحتوي على مسافات', 'Password must not contain spaces');
  const cnt = [/[a-z]/, /[A-Z]/, /\d/, /[^A-Za-z0-9\s]/].filter(r => r.test(password)).length;
  if (cnt < 3) return pickBi(isRTL, 'استخدم 3 أنواع على الأقل: كبيرة، صغيرة، أرقام، رموز', 'Use at least 3 of: upper, lower, numbers, symbols');
  if (['password', 'qwerty', 'admin', '123456', 'qitaat'].some(w => password.toLowerCase().includes(w)))
    return pickBi(isRTL, 'تجنب الكلمات الشائعة', 'Avoid common words');
  return null;
};

/* ─── Main Component ─── */
const PAGE_SIZE = 20;

const AdminUsers = () => {
  useNoIndex();
  const { isRTL, language } = useLanguage();
  const { user, isSuperAdmin, isAdmin } = useAuth();
  const queryClient = useQueryClient();
  const [, startTransition] = useTransition();

  const [tab, setTab] = useState<'overview' | 'users' | 'analytics'>('overview');
  const [searchTerm, setSearchTerm] = useState('');
  const [deferredSearch, setDeferredSearch] = useState('');
  const [filterRole, setFilterRole] = useState('all');
  const [filterAccountType, setFilterAccountType] = useState('all');
  const [filterTier, setFilterTier] = useState('all');
  const [filterBusinessLink, setFilterBusinessLink] = useState<'all' | 'multi' | 'none' | 'single'>('all');
  const [filterScope, setFilterScope] = useState<'all' | 'staff' | 'disabled'>('all');
  const [sortKey, setSortKey] = useState<SortKey>('created_at');
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('desc');
  const [page, setPage] = useState(1);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [expanded, setExpanded] = useState<Set<string>>(new Set());
  const [density, setDensity] = useState<Density>(() => (localStorage.getItem('qitaat_admin_users_density') as Density) || 'comfortable');
  const searchInputRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => { localStorage.setItem('qitaat_admin_users_density', density); }, [density]);

  const [activePanel, setActivePanel] = useState<ActivePanel>(null);
  const panelRef = useRef<HTMLDivElement | null>(null);
  // Phase 6B — read-only quick-view drawer state. Independent from
  // `activePanel` so opening the drawer never closes the edit/create
  // panels and never alters mutation state.
  const [viewingUser, setViewingUser] = useState<Profile | null>(null);
  const closeViewingUser = useCallback(() => setViewingUser(null), []);

  // Open create panel and ensure it is visible: switch to a tab that renders panels,
  // then scroll the panel into view.
  const openCreatePanel = (preset?: 'individual' | 'business' | 'company') => {
    if (preset) setCreateForm(p => ({ ...p, account_type: preset }));
    if (tab !== 'users') setTab('users');
    setActivePanel({ type: 'create' });
    setTimeout(() => panelRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' }), 80);
  };
  const [editForm, setEditForm] = useState({
    full_name: '', full_name_ar: '', full_name_en: '', username: '',
    account_type: '', membership_tier: '',
    phone: '', phone_country_code: '+966', phone_national: '',
    email: '',
  });
  /**
   * Inline field-level errors for the edit panel. Cleared whenever the user
   * edits the corresponding field, scrolls into view when set, and rendered
   * directly under each input so the admin sees exactly which field failed.
   */
  const [editFieldErrors, setEditFieldErrors] = useState<{
    full_name_ar?: string;
    full_name_en?: string;
    username?: string;
    email?: string;
    phone?: string;
  }>({});
  /**
   * Raw machine token surfaced inline next to the friendly message (e.g. `taken`,
   * `invalid_format`, `username_unavailable`). Lets the admin see exactly which
   * server rule rejected the save without opening devtools.
   */
  const [editFieldRawCodes, setEditFieldRawCodes] = useState<{
    username?: string;
    email?: string;
    phone?: string;
  }>({});
  /** Server-side username rejection forwarded to UsernamePicker. */
  const [usernameServerError, setUsernameServerError] = useState<{
    forValue: string;
    reason: UsernameCheckReason;
    rawCode?: string | null;
  } | null>(null);
  const clearEditFieldError = useCallback((key: keyof typeof editFieldErrors) => {
    setEditFieldErrors(prev => {
      if (!prev[key]) return prev;
      const next = { ...prev };
      delete next[key];
      return next;
    });
    setEditFieldRawCodes(prev => {
      if (!(key in prev)) return prev;
      const next = { ...prev };
      delete next[key as 'username' | 'email' | 'phone'];
      return next;
    });
    if (key === 'username') setUsernameServerError(null);
  }, []);
  const [newPassword, setNewPassword] = useState('');
  const [showNewPassword, setShowNewPassword] = useState(false);
  // Suspension form (temporary/permanent disable)
  const [suspendForm, setSuspendForm] = useState<{
    mode: 'temporary' | 'permanent';
    until: string; // datetime-local value
    reason: string;
  }>({ mode: 'temporary', until: '', reason: '' });
  // Add-business-link form
  const [linkForm, setLinkForm] = useState<{ businessId: string; role: StaffRole }>({ businessId: '', role: 'viewer' });
  const [linkSearch, setLinkSearch] = useState('');
  const [createForm, setCreateForm] = useState<CreateUserForm>({
    email: '', password: '',
    full_name: '', full_name_ar: '', full_name_en: '', username: '',
    phone: '', phone_country_code: '+966', phone_national: '',
    account_type: 'individual', membership_tier: 'free', role: 'none',
  });
  const passwordValidationMessage = useMemo(() => getPasswordValidationMessage(newPassword, isRTL), [newPassword, isRTL]);

  // Auto-open create panel when navigated with ?create=provider|business|company|individual
  const [searchParams, setSearchParams] = useSearchParams();
  const openCreatePanelRef = useRef<(t: 'individual' | 'business' | 'company') => void>(() => {});
  const lastConsumedParamsRef = useRef<string>('');
  useEffect(() => { openCreatePanelRef.current = openCreatePanel; });
  useEffect(() => {
    const sig = searchParams.toString();
    if (lastConsumedParamsRef.current === sig) return;
    const createParam = searchParams.get('create');
    const typeParam = searchParams.get('type');
    const roleParam = searchParams.get('role');
    const focusParam = searchParams.get('focus');
    const tabParam = searchParams.get('tab');
    let mutated = false;
    const next = new URLSearchParams(searchParams);

    if (tabParam) {
      // Map legacy tabs (staff/disabled) into Users tab + scope filter
      if (tabParam === 'staff') {
        setTab('users'); setFilterScope('staff');
      } else if (tabParam === 'disabled') {
        setTab('users'); setFilterScope('disabled');
      } else if (['overview', 'users', 'analytics'].includes(tabParam)) {
        setTab(tabParam as 'overview' | 'users' | 'analytics');
      }
      next.delete('tab');
      mutated = true;
    }

    if (typeParam) {
      if (['individual', 'business', 'company', 'all'].includes(typeParam)) {
        setFilterAccountType(typeParam);
      }
      next.delete('type');
      mutated = true;
    }
    if (roleParam) {
      if (['super_admin', 'admin', 'moderator', 'user', 'no_role', 'all'].includes(roleParam)) {
        setFilterRole(roleParam);
      }
      next.delete('role');
      mutated = true;
    }

    if (createParam && isAdmin) {
      const preset = createParam === 'provider' ? 'business' : createParam;
      const allowed = ['individual', 'business', 'company'];
      if (allowed.includes(preset)) {
        openCreatePanelRef.current(preset as 'individual' | 'business' | 'company');
      }
      next.delete('create');
      mutated = true;
    }

    if (focusParam && isAdmin) {
      // Defer until profiles load; handled in a separate effect below.
      next.delete('focus');
      mutated = true;
      sessionStorage.setItem('qitaat_admin_users_pending_focus', focusParam);
    }

    if (mutated) {
      lastConsumedParamsRef.current = next.toString();
      setSearchParams(next, { replace: true });
    } else {
      lastConsumedParamsRef.current = sig;
    }
  }, [isAdmin, searchParams, setSearchParams]);

  const closePanel = () => {
    setActivePanel(null); setNewPassword(''); setShowNewPassword(false);
    setCreateForm({
      email: '', password: '',
      full_name: '', full_name_ar: '', full_name_en: '', username: '',
      phone: '', phone_country_code: '+966', phone_national: '',
      account_type: 'individual', membership_tier: 'free', role: 'none',
    });
  };

  const createUserMutation = useMutation({
    mutationFn: async (payload: typeof createForm) => {
      const { data, error } = await adminCreateUser(payload as AdminCreateUserPayload);
      if (error) throw error;
      if (data?.error) throw new Error(data.error);
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-profiles'] });
      queryClient.invalidateQueries({ queryKey: ['admin-user-roles'] });
      closePanel();
      toast.success(pickBi(isRTL, 'تم إنشاء المستخدم', 'User created'));
    },
    onError: (e: unknown) => toast.error(e instanceof Error ? e.message : (pickBi(isRTL, 'فشل الإنشاء', 'Failed to create'))),
  });

  // Keyboard shortcuts: ⌘K / Ctrl+K to focus search, Esc to clear panel/selection
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement | null;
      const isTyping = target && (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.isContentEditable);
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        searchInputRef.current?.focus();
        searchInputRef.current?.select();
      } else if (e.key === 'Escape' && !isTyping) {
        if (activePanel) closePanel();
        else if (selected.size > 0) setSelected(new Set());
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [activePanel, selected]);

  const handleSearchChange = useCallback((val: string) => {
    setSearchTerm(val); setPage(1);
    startTransition(() => setDeferredSearch(val));
  }, []);

  // ─── Queries ───
  const { data: profiles = [], isLoading: loadingProfiles, refetch: refetchProfiles } = useQuery({
    queryKey: ['admin-profiles'],
    queryFn: async () => {
      const { data, error } = await listProfiles<Profile>({
        select: '*',
        orderBy: { column: 'created_at', ascending: false },
      });
      if (error) throw error;
      return data as Profile[];
    },
    enabled: !!user,
    staleTime: 2 * 60_000,
  });

  // Consume pending ?focus=<user_id> after profiles load: switch to users tab,
  // expand the row, jump to the page containing it, and open the edit panel.
  const openEditRef = useRef<(p: Profile) => void>(() => {});
  const isRTLRef = useRef(isRTL);
  useEffect(() => { isRTLRef.current = isRTL; }, [isRTL]);
  useEffect(() => {
    const pending = sessionStorage.getItem('qitaat_admin_users_pending_focus');
    if (!pending || profiles.length === 0) return;
    const target = profiles.find(p => p.user_id === pending);
    sessionStorage.removeItem('qitaat_admin_users_pending_focus');
    if (!target) {
      toast.error(pickBi(isRTLRef.current, 'المستخدم غير موجود في القائمة', 'User not found in list'));
      return;
    }
    setTab('users');
    setExpanded(prev => new Set(prev).add(target.id));
    openEditRef.current(target);
    setTimeout(() => {
      document.getElementById(`user-row-${target.id}`)?.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }, 200);
  }, [profiles]);

  const { data: userRoles = [], isLoading: loadingRoles } = useQuery({
    queryKey: ['admin-user-roles'],
    queryFn: () => listAllUserRoles() as Promise<UserRole[]>,
    enabled: !!user,
    staleTime: 5 * 60_000,
  });

  const { data: businesses = [] } = useQuery({
    queryKey: ['admin-businesses-map'],
    queryFn: async () => {
      const { data, error } = await listAdminBusinesses<BusinessInfo>({
        select: 'id, user_id, name_ar, name_en, ref_id, username, is_active, is_verified, membership_tier, business_number',
      });
      if (error) throw error;
      return (data ?? []) as BusinessInfo[];
    },
    enabled: !!user,
    staleTime: 5 * 60_000,
  });

  const { data: businessStaff = [] } = useQuery({
    queryKey: ['admin-business-staff'],
    queryFn: async () => {
      const { data, error } = await listAllBusinessStaffForAdmin<{
        id: string;
        business_id: string;
        user_id: string;
        role: StaffRole;
        is_active: boolean;
      }>({ select: 'id, business_id, user_id, role, is_active' });
      if (error) throw error;
      return data ?? [];
    },
    enabled: !!user,
    staleTime: 5 * 60_000,
  });

  const { data: recentAdminActivity = [] } = useQuery({
    queryKey: ['admin-recent-activity'],
    queryFn: async () => {
      const { data, error } = await supabase.from('admin_activity_log')
        .select('id, user_id, action, entity_type, entity_id, created_at, details')
        .order('created_at', { ascending: false }).limit(30);
      if (error) throw error;
      return data ?? [];
    },
    enabled: !!user && (tab === 'overview' || tab === 'analytics'),
    staleTime: 60_000,
  });

  const businessMap = useMemo(() => {
    const m = new Map<string, BusinessInfo[]>();
    businesses.forEach(b => { const arr = m.get(b.user_id) || []; arr.push(b); m.set(b.user_id, arr); });
    return m;
  }, [businesses]);

  // Per-user list of business links (combining ownership and staff rows, de-duplicated by business_id).
  const businessLinksMap = useMemo(() => {
    const bizById = new Map(businesses.map(b => [b.id, b]));
    const m = new Map<string, BusinessLink[]>();
    // Seed with ownership (businesses.user_id)
    businesses.forEach(b => {
      const arr = m.get(b.user_id) || [];
      arr.push({ business: b, role: 'owner', staffId: null, isOwnerByEntity: true, isActive: b.is_active });
      m.set(b.user_id, arr);
    });
    // Add staff rows (skip duplicates per (user, business))
    businessStaff.forEach(s => {
      const biz = bizById.get(s.business_id);
      if (!biz) return;
      const arr = m.get(s.user_id) || [];
      const existing = arr.find(l => l.business.id === s.business_id);
      if (existing) {
        // If user is the entity owner, keep it locked but record the staffId for the underlying row.
        if (existing.isOwnerByEntity) {
          existing.staffId = s.id;
          existing.isActive = existing.isActive && s.is_active;
          return;
        }
        return;
      }
      arr.push({ business: biz, role: s.role, staffId: s.id, isOwnerByEntity: false, isActive: s.is_active });
      m.set(s.user_id, arr);
    });
    return m;
  }, [businesses, businessStaff]);

  const roleMap = useMemo(() => {
    const m = new Map<string, UserRole[]>();
    userRoles.forEach(r => { const arr = m.get(r.user_id) || []; arr.push(r); m.set(r.user_id, arr); });
    return m;
  }, [userRoles]);

  // ─── Mutations ───
  const addRoleMutation = useMutation({
    mutationFn: ({ userId, role }: { userId: string; role: string }) =>
      grantRole(userId, role as Tables<'user_roles'>['role']),
    onSuccess: (_d, v) => {
      void logAdminActivity({ action: 'user.role.grant', entityType: 'profile', entityId: v.userId, details: { role: v.role } });
      queryClient.invalidateQueries({ queryKey: ['admin-user-roles'] });
      toast.success(pickBi(isRTL, 'تم إضافة الصلاحية', 'Role added'));
    },
    onError: (err: unknown) => {
      const code = (err as { normalized?: NormalizedRpcError })?.normalized?.code;
      toast.error(
        code === 'DUPLICATE_KEY'
          ? (pickBi(isRTL, 'الصلاحية موجودة', 'Role exists'))
          : (pickBi(isRTL, 'فشل إضافة الصلاحية', 'Failed to add role'))
      );
    },
  });

  const removeRoleMutation = useMutation({
    mutationFn: (id: string) => revokeRoleById(id),
    onSuccess: (_d, id) => {
      void logAdminActivity({ action: 'user.role.revoke', entityType: 'user_roles', entityId: id });
      queryClient.invalidateQueries({ queryKey: ['admin-user-roles'] });
      toast.success(pickBi(isRTL, 'تم إزالة الصلاحية', 'Role removed'));
    },
    onError: () => toast.error(pickBi(isRTL, 'فشل الإزالة', 'Failed to remove')),
  });

  const updateStaffRoleMutation = useMutation({
    mutationFn: async ({ staffId, role }: { staffId: string; role: StaffRole }) => {
      await updateBusinessStaffRole(staffId, role);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-business-staff'] });
      toast.success(pickBi(isRTL, 'تم تحديث الصلاحية', 'Permission updated'));
    },
    onError: (e: unknown) => toast.error(e instanceof Error ? e.message : (pickBi(isRTL, 'فشل التحديث', 'Failed to update'))),
  });

  const removeStaffMutation = useMutation({
    mutationFn: async (staffId: string) => {
      await removeBusinessStaff(staffId);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-business-staff'] });
      toast.success(pickBi(isRTL, 'تمت الإزالة من المنشأة', 'Removed from business'));
    },
    onError: (e: unknown) => toast.error(e instanceof Error ? e.message : (pickBi(isRTL, 'فشل الإزالة', 'Failed to remove'))),
  });

  const updateProfileMutation = useMutation({
    mutationFn: async ({ profileId, data }: { profileId: string; data: Partial<Profile> }) => {
      const { error } = await updateProfileById({ id: profileId, values: data });
      if (error) throw error;
    },
    onSuccess: (_d, v) => {
      void logAdminActivity({ action: 'user.profile.update', entityType: 'profile', entityId: v.profileId, details: { fields: Object.keys(v.data) } });
      queryClient.invalidateQueries({ queryKey: ['admin-profiles'] });
      closePanel();
      toast.success(pickBi(isRTL, 'تم التحديث', 'Updated'));
    },
    onError: (err: unknown) => {
      const raw = err instanceof Error ? err.message : (typeof err === 'object' && err && 'message' in err ? String((err as { message: unknown }).message) : '');
      const parsed = parseProfileSaveError(raw, isRTL);
      let friendly = parsed.friendly ?? (pickBi(isRTL, 'فشل التحديث', 'Failed to update'));
      const next: typeof editFieldErrors = {};
      const rawNext: typeof editFieldRawCodes = {};
      if (parsed.field === 'username') {
        next.username = parsed.friendly!;
        rawNext.username = parsed.rawCode;
        // Pin the live picker into a "taken" state with stable suggestions.
        setUsernameServerError({
          forValue: editForm.username.trim().toLowerCase(),
          reason: parsed.reason as UsernameCheckReason,
          rawCode: parsed.rawCode,
        });
      } else if (parsed.field === 'email') {
        next.email = parsed.friendly!;
        rawNext.email = parsed.rawCode;
      } else if (parsed.field === 'phone') {
        next.phone = parsed.friendly!;
        rawNext.phone = parsed.rawCode;
      } else if (raw) {
        friendly = (pickBi(isRTL, 'فشل التحديث: ', 'Update failed: ')) + raw;
      }
      if (Object.keys(next).length > 0) setEditFieldErrors(prev => ({ ...prev, ...next }));
      if (Object.keys(rawNext).length > 0) setEditFieldRawCodes(prev => ({ ...prev, ...rawNext }));
      // Top-center toast (Sonner is configured at top-center) — always surface the
      // raw reason token (e.g. `username_unavailable: taken`) in the description.
      toast.error(friendly, raw ? { description: raw } : undefined);
      // Auto-focus the first failing field for quick correction.
      requestAnimationFrame(() => {
        const firstKey = Object.keys(next)[0];
        if (!firstKey) return;
        const el = document.querySelector<HTMLElement>(`[data-field-error="${firstKey}"]`);
        if (el) {
          el.scrollIntoView({ behavior: 'smooth', block: 'center' });
          const focusable = el.querySelector<HTMLElement>('input, select, textarea, button');
          focusable?.focus();
        }
      });
    },
  });

  const toggleBanMutation = useMutation({
    mutationFn: async ({ profileId, isBanned }: { profileId: string; isBanned: boolean }) => {
      // When toggling off, clear the temporary-ban metadata so the row is fully reset.
      const values: Partial<Profile> & { banned_until?: string | null; ban_reason?: string | null } = isBanned
        ? { is_banned: true }
        : { is_banned: false, banned_until: null, ban_reason: null };
      const { error } = await updateProfileById({ id: profileId, values: values as Partial<Profile> });
      if (error) throw error;
    },
    onSuccess: (_, v) => {
      void logAdminActivity({ action: v.isBanned ? 'user.disable' : 'user.enable', entityType: 'profile', entityId: v.profileId });
      queryClient.invalidateQueries({ queryKey: ['admin-profiles'] });
      toast.success(v.isBanned ? (pickBi(isRTL, 'تم التعطيل', 'Disabled')) : (pickBi(isRTL, 'تم التفعيل', 'Enabled')));
    },
    onError: () => toast.error(pickBi(isRTL, 'فشل', 'Failed')),
  });

  // Apply a structured suspension (permanent or until a given timestamp + optional reason).
  const suspendMutation = useMutation({
    mutationFn: async (args: {
      profileId: string;
      mode: 'permanent' | 'temporary';
      until: string | null;
      reason: string | null;
    }) => {
      const values: Partial<Profile> & { banned_until?: string | null; ban_reason?: string | null } = {
        is_banned: true,
        banned_until: args.mode === 'temporary' ? args.until : null,
        ban_reason: args.reason && args.reason.trim().length > 0 ? args.reason.trim() : null,
      };
      const { error } = await updateProfileById({ id: args.profileId, values: values as Partial<Profile> });
      if (error) throw error;
    },
    onSuccess: (_d, v) => {
      void logAdminActivity({
        action: v.mode === 'temporary' ? 'user.suspend.temporary' : 'user.suspend.permanent',
        entityType: 'profile',
        entityId: v.profileId,
        details: { until: v.until, reason: v.reason },
      });
      queryClient.invalidateQueries({ queryKey: ['admin-profiles'] });
      toast.success(pickBi(isRTL, 'تم تطبيق الإيقاف', 'Suspension applied'));
    },
    onError: (e: unknown) => toast.error(e instanceof Error ? e.message : (pickBi(isRTL, 'فشل الإيقاف', 'Failed to suspend'))),
  });

  // Link an existing business to the user via business_staff with a selected role.
  const linkBusinessMutation = useMutation({
    mutationFn: async (args: { businessId: string; userId: string; role: StaffRole }) => {
      const { error } = await insertBusinessStaff({
        payload: { business_id: args.businessId, user_id: args.userId, role: args.role, is_active: true },
      });
      if (error) throw error;
    },
    onSuccess: (_d, v) => {
      void logAdminActivity({
        action: 'user.business.link',
        entityType: 'business_staff',
        entityId: v.businessId,
        details: { user_id: v.userId, role: v.role },
      });
      queryClient.invalidateQueries({ queryKey: ['admin-business-staff'] });
      setLinkForm({ businessId: '', role: 'viewer' });
      setLinkSearch('');
      toast.success(pickBi(isRTL, 'تم ربط المنشأة', 'Business linked'));
    },
    onError: (e: unknown) => {
      const msg = e instanceof Error ? e.message : '';
      toast.error(msg.includes('duplicate') || msg.includes('unique')
        ? (pickBi(isRTL, 'هذا المستخدم مرتبط بالفعل بهذه المنشأة', 'User is already linked to this business'))
        : (pickBi(isRTL, 'فشل ربط المنشأة', 'Failed to link business')));
    },
  });

  const bulkBanMutation = useMutation({
    mutationFn: async ({ ids, isBanned }: { ids: string[]; isBanned: boolean }) => {
      const { error } = await updateProfilesByIds({ ids, values: { is_banned: isBanned } });
      if (error) throw error;
    },
    onSuccess: (_, v) => {
      void logAdminActivity({ action: v.isBanned ? 'user.disable.bulk' : 'user.enable.bulk', entityType: 'profile', details: { ids: v.ids, count: v.ids.length } });
      queryClient.invalidateQueries({ queryKey: ['admin-profiles'] });
      setSelected(new Set());
      toast.success(isRTL ? `تم ${v.isBanned ? 'تعطيل' : 'تفعيل'} ${v.ids.length} حساب` : `${v.ids.length} accounts ${v.isBanned ? 'disabled' : 'enabled'}`);
    },
    onError: () => toast.error(pickBi(isRTL, 'فشلت العملية الجماعية', 'Bulk action failed')),
  });

  const changePasswordMutation = useMutation({
    mutationFn: async ({ targetUserId, password }: { targetUserId: string; password: string }) => {
      const res = await adminResetPassword({ target_user_id: targetUserId, action: 'change_password', new_password: password });
      if (res.error) throw res.error;
      if (res.data?.error) throw new Error(res.data.error);
    },
    onSuccess: (_d, v) => {
      void logAdminActivity({ action: 'user.password.change', entityType: 'auth.users', entityId: v.targetUserId });
      closePanel();
      toast.success(pickBi(isRTL, 'تم تغيير كلمة المرور', 'Password changed'));
    },
    onError: (err: unknown) => toast.error(err instanceof Error ? err.message : (pickBi(isRTL, 'فشل', 'Failed'))),
  });

  const sendResetLinkMutation = useMutation({
    mutationFn: async (targetUserId: string) => {
      const res = await adminResetPassword({ target_user_id: targetUserId, action: 'send_reset_link' });
      if (res.error) throw res.error;
      if (res.data?.error) throw new Error(res.data.error);
    },
    onSuccess: (_d, targetUserId) => {
      void logAdminActivity({ action: 'user.password.reset_link', entityType: 'auth.users', entityId: targetUserId });
      toast.success(pickBi(isRTL, 'تم إرسال الرابط', 'Link sent'));
    },
    onError: (err: unknown) => toast.error(err instanceof Error ? err.message : (pickBi(isRTL, 'فشل', 'Failed'))),
  });

  const deleteUserMutation = useMutation({
    mutationFn: async (targetUserId: string) => {
      const res = await adminDeleteUser({ target_user_id: targetUserId });
      if (res.error) throw res.error;
      if (res.data?.error) throw new Error(res.data.error);
    },
    onSuccess: (_d, targetUserId) => {
      void logAdminActivity({ action: 'user.delete', entityType: 'auth.users', entityId: targetUserId });
      queryClient.invalidateQueries({ queryKey: ['admin-profiles'] });
      queryClient.invalidateQueries({ queryKey: ['admin-user-roles'] });
      closePanel();
      toast.success(pickBi(isRTL, 'تم الحذف', 'Deleted'));
    },
    onError: () => toast.error(pickBi(isRTL, 'فشل الحذف', 'Failed to delete')),
  });

  const openEdit = useCallback((profile: Profile) => {
    setActivePanel({ type: 'edit', profile });
    setEditFieldErrors({});
    const parsed = parsePhoneValue(isSuperAdmin ? profile.phone : '');
    setEditForm({
      full_name: profile.full_name || '',
      full_name_ar: profile.full_name_ar || '',
      full_name_en: profile.full_name_en || '',
      username: profile.username || '',
      account_type: profile.account_type || 'individual',
      membership_tier: profile.membership_tier || 'free',
      // PII fields are only prefilled for Super Admin. Non-super admins see empty
      // placeholders so masked values are never leaked through the edit form.
      phone: isSuperAdmin ? (profile.phone || '') : '',
      phone_country_code: parsed.countryCode,
      phone_national: parsed.national,
      // Never pre-fill an edit field with a synthetic phone-login email.
      email: isSuperAdmin && profile.email && !isSyntheticPhoneEmail(profile.email)
        ? profile.email
        : '',
    });
    // Reset suspension + link forms whenever a different user is opened.
    const bu = (profile as Profile & { banned_until?: string | null }).banned_until ?? null;
    setSuspendForm({
      mode: bu ? 'temporary' : 'permanent',
      until: bu ? new Date(bu).toISOString().slice(0, 16) : '',
      reason: (profile as Profile & { ban_reason?: string | null }).ban_reason ?? '',
    });
    setLinkForm({ businessId: '', role: 'viewer' });
    setLinkSearch('');
  }, [isSuperAdmin]);
  useEffect(() => { openEditRef.current = openEdit; });

  const handleSaveProfile = () => {
    if (activePanel?.type !== 'edit') return;
    setEditFieldErrors({});
    const nameAr = editForm.full_name_ar.trim();
    const nameEn = editForm.full_name_en.trim();
    const combined = nameAr || nameEn || editForm.full_name.trim();
    if (!combined) {
      const msg = pickBi(isRTL, 'الاسم مطلوب (عربي أو إنجليزي)', 'Name required (AR or EN)');
      setEditFieldErrors({ full_name_ar: msg, full_name_en: msg });
      toast.error(msg);
      return;
    }
    const data: Partial<Profile> = {
      full_name: combined,
      full_name_ar: nameAr || null,
      full_name_en: nameEn || null,
      account_type: editForm.account_type as Profile['account_type'],
      membership_tier: editForm.membership_tier as Profile['membership_tier'],
    };
    // Only send `username` when it actually changed (case-insensitive). Sending an
    // unchanged value would re-trigger the global-uniqueness trigger and can
    // surface as `username_unavailable: taken` when there is a cross-table match.
    const nextUsername = editForm.username.trim().toLowerCase() || null;
    const currentUsername = (activePanel.profile.username || '').toLowerCase() || null;
    if (nextUsername !== currentUsername) {
      data.username = nextUsername;
    }
    // Only Super Admin may write PII fields; for others we keep existing values.
    if (isSuperAdmin) {
      data.phone_country_code = editForm.phone_national ? editForm.phone_country_code : null;
      data.phone_national = editForm.phone_national || null;
      const nextEmail = editForm.email.trim();
      if (nextEmail && isSyntheticPhoneEmail(nextEmail)) {
        const msg = pickBi(isRTL, 'البريد الرسمي لا يمكن أن ينتهي بـ @phone.qitaat.local — هذا معرّف داخلي لتسجيل الدخول بالهاتف.', 'Official email cannot end with @phone.qitaat.local — that is an internal phone-login identifier.');
        setEditFieldErrors({ email: msg });
        toast.error(msg);
        return;
      }
      data.email = nextEmail || null;
    }
    updateProfileMutation.mutate({ profileId: activePanel.profile.id, data });
  };

  // ─── Filtering ───
  const baseFiltered = useMemo(() => {
    const lower = deferredSearch.toLowerCase();
    return profiles.filter(p => {
      const bizList = businessMap.get(p.user_id) || [];
      const matchesSearch = !deferredSearch
        || p.full_name?.toLowerCase().includes(lower)
        || (p.email && !isSyntheticPhoneEmail(p.email) ? p.email.toLowerCase().includes(lower) : false)
        || p.phone?.includes(deferredSearch)
        || p.ref_id?.toLowerCase().includes(lower)
        || bizList.some(b => b.ref_id?.toLowerCase().includes(lower) || b.name_ar?.toLowerCase().includes(lower) || b.username?.toLowerCase().includes(lower));
      const roles = roleMap.get(p.user_id) || [];
      const matchesRole = filterRole === 'all' || (filterRole === 'no_role' && roles.length === 0) || roles.some(r => r.role === filterRole);
      const matchesType = filterAccountType === 'all' || p.account_type === filterAccountType;
      const matchesTier = filterTier === 'all' || p.membership_tier === filterTier;
      const linkCount = (businessLinksMap.get(p.user_id) || []).length;
      const matchesBizLink =
        filterBusinessLink === 'all'
        || (filterBusinessLink === 'none' && linkCount === 0)
        || (filterBusinessLink === 'single' && linkCount === 1)
        || (filterBusinessLink === 'multi' && linkCount > 1);
      return matchesSearch && matchesRole && matchesType && matchesTier && matchesBizLink;
    });
  }, [profiles, deferredSearch, filterRole, filterAccountType, filterTier, filterBusinessLink, roleMap, businessMap, businessLinksMap]);

  const tabFiltered = useMemo(() => {
    if (filterScope === 'staff') return baseFiltered.filter(p => {
      const r = roleMap.get(p.user_id) || [];
      return r.some(x => x.role === 'super_admin' || x.role === 'admin' || x.role === 'moderator');
    });
    if (filterScope === 'disabled') return baseFiltered.filter(p => p.is_banned);
    return baseFiltered;
  }, [baseFiltered, filterScope, roleMap]);

  const sorted = useMemo(() => {
    const copy = [...tabFiltered];
    copy.sort((a, b) => {
      let av: string | number = '', bv: string | number = '';
      if (sortKey === 'created_at') { av = new Date(a.created_at).getTime(); bv = new Date(b.created_at).getTime(); }
      else if (sortKey === 'full_name') { av = (a.full_name || '').toLowerCase(); bv = (b.full_name || '').toLowerCase(); }
      else if (sortKey === 'membership_tier') { av = a.membership_tier; bv = b.membership_tier; }
      else if (sortKey === 'account_type') { av = a.account_type; bv = b.account_type; }
      if (av < bv) return sortDir === 'asc' ? -1 : 1;
      if (av > bv) return sortDir === 'asc' ? 1 : -1;
      return 0;
    });
    return copy;
  }, [tabFiltered, sortKey, sortDir]);

  const totalPages = Math.max(1, Math.ceil(sorted.length / PAGE_SIZE));
  useEffect(() => { if (page > totalPages) setPage(1); }, [totalPages, page]);
  const paginated = useMemo(() => sorted.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE), [sorted, page]);

  const stats = useMemo(() => {
    const totalUsers = profiles.length;
    const superAdmins = userRoles.filter(r => r.role === 'super_admin').length;
    const admins = userRoles.filter(r => r.role === 'admin').length;
    const moderators = userRoles.filter(r => r.role === 'moderator').length;
    const bannedCount = profiles.filter(p => p.is_banned).length;
    const providers = profiles.filter(p => p.account_type === 'business' || p.account_type === 'company').length;
    const verified = profiles.filter(p => p.phone_verified).length;
    const onboarded = profiles.filter(p => p.is_onboarded).length;
    const tierDist = { free: 0, basic: 0, premium: 0, enterprise: 0 };
    profiles.forEach(p => { const t = p.membership_tier as keyof typeof tierDist; if (t in tierDist) tierDist[t]++; });
    const now = Date.now();
    const weekAgo = now - 7 * 86400000;
    const twoWeeksAgo = now - 14 * 86400000;
    const dayAgo = now - 86400000;
    let recentUsers = 0, prevWeekUsers = 0, last24h = 0;
    profiles.forEach(p => {
      const t = new Date(p.created_at).getTime();
      if (isNaN(t)) return;
      if (t > weekAgo) recentUsers++;
      else if (t > twoWeeksAgo) prevWeekUsers++;
      if (t > dayAgo) last24h++;
    });
    const wow = prevWeekUsers === 0
      ? (recentUsers > 0 ? 100 : 0)
      : Math.round(((recentUsers - prevWeekUsers) / prevWeekUsers) * 100);
    return { totalUsers, superAdmins, admins, moderators, bannedCount, tierDist, recentUsers, prevWeekUsers, wow, last24h, providers, verified, onboarded };
  }, [profiles, userRoles]);

  // ─── Analytics: signups over 30 days ───
  const signupSeries = useMemo(() => {
    const days: { date: string; total: number; providers: number; label: string }[] = [];
    const today = new Date(); today.setHours(0, 0, 0, 0);
    for (let i = 29; i >= 0; i--) {
      const d = new Date(today); d.setDate(d.getDate() - i);
      const key = d.toISOString().split('T')[0];
      days.push({ date: key, total: 0, providers: 0, label: `${d.getDate()}/${d.getMonth() + 1}` });
    }
    const idx = new Map(days.map((d, i) => [d.date, i]));
    profiles.forEach(p => {
      const d = new Date(p.created_at); if (isNaN(d.getTime())) return;
      const key = d.toISOString().split('T')[0];
      const i = idx.get(key); if (i === undefined) return;
      days[i].total++;
      if (p.account_type === 'business' || p.account_type === 'company') days[i].providers++;
    });
    return days;
  }, [profiles]);

  const accountTypePie = useMemo(() => [
    { name: pickBi(isRTL, 'أفراد', 'Individuals'), value: profiles.filter(p => p.account_type === 'individual').length, color: 'hsl(217 91% 60%)' },
    { name: pickBi(isRTL, 'مزودي خدمة', 'Providers'), value: profiles.filter(p => p.account_type === 'business').length, color: 'hsl(160 84% 39%)' },
    { name: pickBi(isRTL, 'شركات', 'Companies'), value: profiles.filter(p => p.account_type === 'company').length, color: 'hsl(271 91% 65%)' },
  ], [profiles, isRTL]);

  const tierBar = useMemo(() => Object.entries(stats.tierDist).map(([k, v]) => ({
    name: isRTL ? tierConfig[k as keyof typeof tierConfig].labelAr : tierConfig[k as keyof typeof tierConfig].labelEn,
    count: v,
  })), [stats.tierDist, isRTL]);

  const exportCSV = () => {
    const rows = sorted.map(p => {
      const roles = (roleMap.get(p.user_id) || []).map(r => r.role).join(', ') || 'none';
      const bizList = businessMap.get(p.user_id) || [];
      const bizRefs = bizList.map(b => b.ref_id).join(' | ');
      const bizNames = bizList.map(b => b.name_ar).join(' | ');
      const created = p.created_at ? new Date(p.created_at).toISOString().split('T')[0] : '';
      const emailCell = p.email && !isSyntheticPhoneEmail(p.email) ? p.email : '';
      return [p.ref_id, p.full_name || '', emailCell, p.phone || '', p.account_type, bizRefs, bizNames, p.membership_tier, roles, p.is_banned ? 'Yes' : 'No', created]
        .map(v => `"${String(v).replace(/"/g, '""')}"`).join(',');
    });
    const csv = '\uFEFF' + ['Ref,Name,Email,Phone,Type,BizRefs,BizNames,Tier,Roles,Banned,Created', ...rows].join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a'); a.href = url; a.download = `users_${new Date().toISOString().split('T')[0]}.csv`; a.click();
    URL.revokeObjectURL(url);
    toast.success(pickBi(isRTL, 'تم التصدير', 'Exported'));
  };

  const toggleSelect = useCallback((id: string) => {
    setSelected(prev => { const n = new Set(prev); if (n.has(id)) n.delete(id); else n.add(id); return n; });
  }, []);
  const toggleExpand = useCallback((id: string) => {
    setExpanded(prev => { const n = new Set(prev); if (n.has(id)) n.delete(id); else n.add(id); return n; });
  }, []);

  const allOnPageSelected = paginated.length > 0 && paginated.every(p => selected.has(p.id));
  const toggleSelectPage = () => {
    setSelected(prev => {
      const n = new Set(prev);
      if (allOnPageSelected) paginated.forEach(p => n.delete(p.id));
      else paginated.forEach(p => n.add(p.id));
      return n;
    });
  };

  const cycleSort = (key: SortKey) => {
    if (sortKey === key) setSortDir(d => d === 'asc' ? 'desc' : 'asc');
    else { setSortKey(key); setSortDir('desc'); }
  };

  if (!user) {
    return <DashboardLayout><div className="flex items-center justify-center h-96"><p className="text-muted-foreground">{pickBi(isRTL, 'يرجى تسجيل الدخول', 'Please log in')}</p></div></DashboardLayout>;
  }

  return (
    <DashboardLayout>
      <Tabs value={tab} onValueChange={(v) => { setTab(v as typeof tab); setPage(1); setSelected(new Set()); }}>
        <AdminListPageTemplate
          title={pickBi(isRTL, 'إدارة المستخدمين', 'User Management')}
          subtitle={pickBi(isRTL, 'إدارة شاملة للحسابات، الصلاحيات، والمنشآت المرتبطة', 'Unified control for accounts, roles, and linked businesses')}
          icon={Users}
          tone="accent"
          actions={
            <>
              <Button variant="outline" size="sm" className="rounded-xl gap-2 h-9" onClick={() => refetchProfiles()}>
                <RefreshCw className="w-4 h-4" />
                <span className="hidden sm:inline">{pickBi(isRTL, 'تحديث', 'Refresh')}</span>
              </Button>
              <Button variant="outline" size="sm" onClick={exportCSV} className="gap-2 rounded-xl h-9">
                <Download className="w-4 h-4" />
                <span className="hidden sm:inline">{pickBi(isRTL, 'تصدير CSV', 'Export CSV')}</span>
              </Button>
              {isAdmin && (
                <Button size="sm" className="gap-2 rounded-xl h-9 shadow-md" onClick={() => openCreatePanel()}>
                  <UserPlus className="w-4 h-4" />
                  <span className="hidden sm:inline">{pickBi(isRTL, 'إنشاء مستخدم', 'New User')}</span>
                </Button>
              )}
            </>
          }
          kpiSlot={
            <AdminUsersStatsStrip
              isRTL={isRTL}
              stats={buildAdminUserStats({ profiles, roles: userRoles })}
            />
          }
          filtersSlot={
            <TabsList className="grid w-full grid-cols-3 h-auto p-1 rounded-2xl bg-muted/40">
              <TabsTrigger value="overview"  className="rounded-xl gap-1.5 py-2.5"><Sparkles className="w-3.5 h-3.5" />{pickBi(isRTL, 'نظرة عامة', 'Overview')}</TabsTrigger>
              <TabsTrigger value="users"     className="rounded-xl gap-1.5 py-2.5"><Users className="w-3.5 h-3.5" />{pickBi(isRTL, 'المستخدمون', 'Users')}</TabsTrigger>
              <TabsTrigger value="analytics" className="rounded-xl gap-1.5 py-2.5"><BarChart3 className="w-3.5 h-3.5" />{pickBi(isRTL, 'تحليلات', 'Analytics')}</TabsTrigger>
            </TabsList>
          }
        >

          {/* OVERVIEW */}
          <TabsContent value="overview" className="space-y-5 mt-5">
            <OverviewTab
              isRTL={isRTL}
              stats={stats}
              signupSeries={signupSeries}
              recentAdminActivity={recentAdminActivity}
            />
          </TabsContent>

          {/* USERS — single list view (Staff/Disabled merged as scope chips) */}
          <TabsContent value="users" className="space-y-4 mt-5">
              <AdminUsersPageShell
                header={null}
                filtersSlot={
                  <UserFiltersBar
                isRTL={isRTL}
                filterScope={filterScope} setFilterScope={setFilterScope}
                filterAccountType={filterAccountType} setFilterAccountType={setFilterAccountType}
                filterTier={filterTier} setFilterTier={setFilterTier}
                filterRole={filterRole} setFilterRole={setFilterRole}
                filterBusinessLink={filterBusinessLink} setFilterBusinessLink={setFilterBusinessLink}
                setSortKey={setSortKey} setSortDir={setSortDir} setPage={setPage}
                searchInputRef={searchInputRef}
                searchTerm={searchTerm} handleSearchChange={handleSearchChange} deferredSearch={deferredSearch}
                allOnPageSelected={allOnPageSelected} toggleSelectPage={toggleSelectPage}
                resultsCount={sorted.length} page={page} totalPages={totalPages}
                density={density} setDensity={setDensity}
                sortKey={sortKey} sortDir={sortDir} cycleSort={cycleSort}
                  />
                }
                drawerSlot={
                  viewingUser ? (
                    <UserDetailsDrawer
                      open
                      isRTL={isRTL}
                      user={{
                        id: viewingUser.id,
                        user_id: viewingUser.user_id,
                        ref_id: viewingUser.ref_id ?? null,
                        full_name: viewingUser.full_name ?? null,
                        full_name_ar: viewingUser.full_name_ar ?? null,
                        full_name_en: viewingUser.full_name_en ?? null,
                        username: viewingUser.username ?? null,
                        email: viewingUser.email ?? null,
                        phone: viewingUser.phone ?? null,
                        account_type: viewingUser.account_type ?? null,
                        membership_tier: viewingUser.membership_tier ?? null,
                        is_banned: viewingUser.is_banned ?? null,
                        is_onboarded: viewingUser.is_onboarded ?? null,
                        phone_verified: viewingUser.phone_verified ?? null,
                        created_at: viewingUser.created_at,
                      }}
                      roles={(roleMap.get(viewingUser.user_id) || []).map(r => r.role)}
                      linkedEntities={(businessLinksMap.get(viewingUser.user_id) || []).map(l => ({
                        id: l.business.id,
                        name_ar: l.business.name_ar,
                        name_en: l.business.name_en,
                        ref_id: l.business.ref_id,
                        username: l.business.username,
                        role: l.role,
                      }))}
                      officialEmail={viewingUser.email && !isSyntheticPhoneEmail(viewingUser.email) ? viewingUser.email : null}
                      onClose={closeViewingUser}
                    />
                  ) : null
                }
                tableSlot={
                  <div className="space-y-4">
              {/* Bulk action bar */}
              {selected.size > 0 && (
                <div className="rounded-2xl border border-accent/40 bg-accent/5 p-3 flex items-center gap-3 flex-wrap animate-in slide-in-from-top-1">
                  <Badge className="bg-accent text-accent-foreground gap-1"><Check className="w-3 h-3" />{selected.size}</Badge>
                  <span className="text-xs text-foreground">{pickBi(isRTL, 'محدد', 'selected')}</span>
                  <div className="ms-auto flex items-center gap-2 flex-wrap">
                    <Button variant="outline" size="sm" className="rounded-xl gap-1.5 h-8" onClick={() => {
                      const selectedProfiles = sorted.filter(p => selected.has(p.id));
                      const rows = selectedProfiles.map(p => {
                        const roles = (roleMap.get(p.user_id) || []).map(r => r.role).join(', ') || 'none';
                        const created = p.created_at ? new Date(p.created_at).toISOString().split('T')[0] : '';
                        const emailCell = p.email && !isSyntheticPhoneEmail(p.email) ? p.email : '';
                        return [p.ref_id, p.full_name || '', emailCell, p.phone || '', p.account_type, p.membership_tier, roles, p.is_banned ? 'Yes' : 'No', created]
                          .map(v => `"${String(v).replace(/"/g, '""')}"`).join(',');
                      });
                      const csv = '\uFEFF' + ['Ref,Name,Email,Phone,Type,Tier,Roles,Banned,Created', ...rows].join('\n');
                      const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
                      const url = URL.createObjectURL(blob);
                      const a = document.createElement('a'); a.href = url; a.download = `users_selected_${new Date().toISOString().split('T')[0]}.csv`; a.click();
                      URL.revokeObjectURL(url);
                      toast.success(isRTL ? `تم تصدير ${selectedProfiles.length}` : `Exported ${selectedProfiles.length}`);
                    }}>
                      <Download className="w-3.5 h-3.5" />{pickBi(isRTL, 'تصدير المحدد', 'Export')}
                    </Button>
                    {isSuperAdmin && (<>
                    <Button variant="outline" size="sm" className="rounded-xl gap-1.5 h-8 text-warning border-warning"
                      onClick={() => {
                        const safeIds = sorted.filter(p => {
                          if (!selected.has(p.id)) return false;
                          if (p.user_id === user.id) return false;
                          const r = roleMap.get(p.user_id) || [];
                          return !r.some(x => x.role === 'super_admin' || x.role === 'admin');
                        }).map(p => p.id);
                        const skipped = selected.size - safeIds.length;
                        if (safeIds.length === 0) {
                          toast.error(pickBi(isRTL, 'لا يمكن تعطيل حسابك أو حسابات المشرفين', 'Cannot disable your own account or admin accounts'));
                          return;
                        }
                        if (skipped > 0) toast.warning(isRTL ? `تم تجاهل ${skipped} حساب محمي` : `Skipped ${skipped} protected account(s)`);
                        bulkBanMutation.mutate({ ids: safeIds, isBanned: true });
                      }}
                      disabled={bulkBanMutation.isPending}>
                      <Ban className="w-3.5 h-3.5" />{pickBi(isRTL, 'تعطيل', 'Disable')}
                    </Button>
                    <Button variant="outline" size="sm" className="rounded-xl gap-1.5 h-8 text-success border-success"
                      onClick={() => bulkBanMutation.mutate({ ids: Array.from(selected), isBanned: false })}
                      disabled={bulkBanMutation.isPending}>
                      <UserCheck className="w-3.5 h-3.5" />{pickBi(isRTL, 'تفعيل', 'Enable')}
                    </Button>
                    </>)}
                    <Button variant="ghost" size="sm" className="rounded-xl h-8" onClick={() => setSelected(new Set())}>
                      <X className="w-3.5 h-3.5" />{pickBi(isRTL, 'إلغاء', 'Clear')}
                    </Button>
                  </div>
                </div>
              )}

              {/* Inline panels */}
              {activePanel?.type === 'create' && (
                <CreateUserPanel
                  isRTL={isRTL}
                  panelRef={panelRef}
                  form={createForm}
                  setForm={setCreateForm}
                  onClose={closePanel}
                  onSubmit={(f) => createUserMutation.mutate(f)}
                  isSubmitting={createUserMutation.isPending}
                />
              )}
              {activePanel?.type === 'edit' && (
                <UserEditPanel
                  panelRef={panelRef}
                  isRTL={isRTL}
                  language={language}
                  isSuperAdmin={isSuperAdmin}
                  currentUserId={user?.id}
                  editingProfile={activePanel.profile}
                  editingRoles={roleMap.get(activePanel.profile.user_id) || []}
                  editingLinks={businessLinksMap.get(activePanel.profile.user_id) || []}
                  businesses={businesses}
                  accountTypeConfig={accountTypeConfig}
                  tierConfig={tierConfig}
                  roleConfig={roleConfig}
                  staffRoleConfig={staffRoleConfig}
                  editForm={editForm}
                  setEditForm={setEditForm}
                  editFieldErrors={editFieldErrors}
                  editFieldRawCodes={editFieldRawCodes}
                  clearEditFieldError={clearEditFieldError}
                  usernameServerError={usernameServerError}
                  suspendForm={suspendForm}
                  setSuspendForm={setSuspendForm}
                  linkForm={linkForm}
                  setLinkForm={setLinkForm}
                  linkSearch={linkSearch}
                  setLinkSearch={setLinkSearch}
                  closePanel={closePanel}
                  handleSaveProfile={handleSaveProfile}
                  updateProfileMutation={updateProfileMutation}
                  removeRoleMutation={removeRoleMutation}
                  addRoleMutation={addRoleMutation}
                  updateStaffRoleMutation={updateStaffRoleMutation}
                  removeStaffMutation={removeStaffMutation}
                  linkBusinessMutation={linkBusinessMutation}
                  suspendMutation={suspendMutation}
                  toggleBanMutation={toggleBanMutation}
                />
              )}

              {activePanel?.type === 'password' && (
                <div className="rounded-2xl border border-accent/30 bg-gradient-to-r from-accent/5 to-transparent p-5 animate-in slide-in-from-top-2">
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="font-heading font-bold text-lg flex items-center gap-2">
                      <div className="w-8 h-8 rounded-lg bg-accent/15 flex items-center justify-center"><Lock className="w-4 h-4 text-accent" /></div>
                      {pickBi(isRTL, 'تغيير كلمة المرور', 'Change Password')}
                      <span className="text-sm font-normal text-muted-foreground">— {activePanel.userName}</span>
                    </h3>
                    <Button variant="ghost" size="icon" onClick={closePanel} className="rounded-xl" aria-label="Hide"><X className="w-4 h-4" /></Button>
                  </div>
                  <div className="max-w-md space-y-3">
                    <div className="space-y-1.5">
                      <Label className="text-xs">{pickBi(isRTL, 'كلمة المرور الجديدة', 'New Password')}</Label>
                      <div className="relative">
                        <Input type={showNewPassword ? 'text' : 'password'} value={newPassword} onChange={e => setNewPassword(e.target.value)}
                          placeholder={pickBi(isRTL, '8+ مع أرقام ورموز', '8+ with numbers and symbols')} minLength={8} className="pe-10 h-10 rounded-xl" />
                        <button type="button" onClick={() => setShowNewPassword(!showNewPassword)} className="absolute top-2.5 text-muted-foreground hover:text-foreground" style={{ insetInlineEnd: '10px' }}>
                          {showNewPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                        </button>
                      </div>
                      {passwordValidationMessage && <p className="text-xs text-destructive">{passwordValidationMessage}</p>}
                    </div>
                    <div className="flex items-center gap-2 flex-wrap">
                      <Button onClick={() => changePasswordMutation.mutate({ targetUserId: activePanel.userId, password: newPassword })}
                        disabled={changePasswordMutation.isPending || !!passwordValidationMessage || !newPassword} className="rounded-xl gap-2">
                        {changePasswordMutation.isPending && <Loader2 className="w-4 h-4 animate-spin" />}{pickBi(isRTL, 'تغيير', 'Change')}
                      </Button>
                      <Button variant="outline" onClick={() => sendResetLinkMutation.mutate(activePanel.userId)} disabled={sendResetLinkMutation.isPending} className="gap-1.5 rounded-xl">
                        <Send className="w-4 h-4" />{pickBi(isRTL, 'إرسال رابط', 'Send Link')}
                      </Button>
                      <Button variant="ghost" onClick={closePanel} className="rounded-xl">{pickBi(isRTL, 'إلغاء', 'Cancel')}</Button>
                    </div>
                  </div>
                </div>
              )}

              {activePanel?.type === 'delete' && (
                <AlertDialog
                  open
                  onOpenChange={(o) => { if (!o && !deleteUserMutation.isPending) closePanel(); }}
                >
                  <AlertDialogContent className="rounded-2xl border-destructive/30">
                    <AlertDialogHeader>
                      <AlertDialogTitle className="font-heading flex items-center gap-2 text-destructive">
                        <div className="w-8 h-8 rounded-lg bg-destructive/15 flex items-center justify-center">
                          <AlertTriangle className="w-4 h-4 text-destructive" />
                        </div>
                        {pickBi(isRTL, 'تأكيد حذف الحساب', 'Confirm Deletion')}
                      </AlertDialogTitle>
                      <AlertDialogDescription>
                        {isRTL
                          ? `هل أنت متأكد من حذف "${activePanel.userName}"؟ سيتم حذف جميع البيانات نهائياً.`
                          : `Delete "${activePanel.userName}"? All data will be removed permanently.`}
                      </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                      <AlertDialogCancel disabled={deleteUserMutation.isPending} className="rounded-xl">
                        {pickBi(isRTL, 'إلغاء', 'Cancel')}
                      </AlertDialogCancel>
                      <AlertDialogAction
                        onClick={(e) => {
                          e.preventDefault();
                          deleteUserMutation.mutate(activePanel.userId);
                        }}
                        disabled={deleteUserMutation.isPending}
                        className="rounded-xl gap-2 bg-destructive text-destructive-foreground hover:bg-destructive/90"
                      >
                        {deleteUserMutation.isPending && <Loader2 className="w-4 h-4 animate-spin" />}
                        {pickBi(isRTL, 'حذف نهائي', 'Delete')}
                      </AlertDialogAction>
                    </AlertDialogFooter>
                  </AlertDialogContent>
                </AlertDialog>
              )}

              {/* List */}
              {(loadingProfiles || loadingRoles) ? (
                <div className="space-y-3">{Array.from({ length: 5 }).map((_, i) => <Skeleton key={i} className="h-24 rounded-2xl" />)}</div>
              ) : paginated.length === 0 ? (
                <div className="rounded-2xl border border-border/30 bg-card p-12 text-center">
                  <div className="w-16 h-16 mx-auto mb-4 rounded-2xl bg-gradient-to-br from-accent/10 to-primary/10 flex items-center justify-center">
                    <Users className="w-8 h-8 text-accent/30" />
                  </div>
                  <p className="font-heading font-bold text-sm mb-1">{pickBi(isRTL, 'لا توجد نتائج', 'No results')}</p>
                  <p className="text-xs text-muted-foreground">{pickBi(isRTL, 'جرّب تغيير الفلاتر', 'Try changing filters')}</p>
                </div>
              ) : (
                <>
                  <div className="space-y-3">
                    {paginated.map(profile => {
                      const roles = roleMap.get(profile.user_id) || [];
                      const isCurrentUser = profile.user_id === user.id;
                      const targetIsSuperAdmin = roles.some(r => r.role === 'super_admin');
                      const targetIsAdmin = roles.some(r => r.role === 'admin' || r.role === 'super_admin');
                      const canManageUser = !isCurrentUser && (isSuperAdmin || (!targetIsSuperAdmin && !targetIsAdmin));
                      return (
                        <UserRow key={profile.id} profile={profile} roles={roles}
                          businessLinks={businessLinksMap.get(profile.user_id) || []}
                          isCurrentUser={isCurrentUser} canManageUser={canManageUser} isSuperAdmin={isSuperAdmin}
                          isRTL={isRTL} language={language}
                          selected={selected.has(profile.id)} expanded={expanded.has(profile.id)} density={density}
                          onToggleSelect={() => toggleSelect(profile.id)} onToggleExpand={() => toggleExpand(profile.id)}
                          onEdit={openEdit}
                          onView={(p) => setViewingUser(p)}
                          onPassword={(p) => setActivePanel({ type: 'password', userId: p.user_id, userName: p.full_name || '' })}
                          onToggleBan={(p) => toggleBanMutation.mutate({ profileId: p.id, isBanned: !p.is_banned })}
                          onDelete={(p) => setActivePanel({ type: 'delete', userId: p.user_id, userName: p.full_name || '' })}
                          onAddRole={(uid, role) => addRoleMutation.mutate({ userId: uid, role })}
                          onRemoveRole={(rid) => removeRoleMutation.mutate(rid)}
                          onChangeStaffRole={(link, role) => {
                            if (!link.staffId) return;
                            updateStaffRoleMutation.mutate({ staffId: link.staffId, role });
                          }}
                          onRemoveStaff={(link) => {
                            if (!link.staffId || link.isOwnerByEntity) return;
                            removeStaffMutation.mutate(link.staffId);
                          }}
                        />
                      );
                    })}
                  </div>
                  {totalPages > 1 && (
                    <div className="flex items-center justify-between gap-2 pt-2">
                      <Button variant="outline" size="sm" className="rounded-xl gap-1" disabled={page === 1} onClick={() => setPage(p => Math.max(1, p - 1))}>
                        {isRTL ? <ChevronRight className="w-4 h-4" /> : <ChevronLeft className="w-4 h-4" />}
                        {pickBi(isRTL, 'السابق', 'Prev')}
                      </Button>
                      <div className="flex items-center gap-1">
                        {Array.from({ length: Math.min(7, totalPages) }, (_, i) => {
                          let n = i + 1;
                          if (totalPages > 7) {
                            if (page > 4) n = page - 3 + i;
                            if (n > totalPages - 6) n = totalPages - 6 + i;
                          }
                          return (
                            <button key={n} onClick={() => setPage(n)}
                              className={`w-8 h-8 rounded-lg text-xs font-bold transition-colors tech-content
                                ${n === page ? 'bg-accent text-accent-foreground' : 'hover:bg-muted'}`}>
                              {n}
                            </button>
                          );
                        })}
                      </div>
                      <Button variant="outline" size="sm" className="rounded-xl gap-1" disabled={page === totalPages} onClick={() => setPage(p => Math.min(totalPages, p + 1))}>
                        {pickBi(isRTL, 'التالي', 'Next')}
                        {isRTL ? <ChevronLeft className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
                      </Button>
                    </div>
                  )}
                </>
              )}
                  </div>
                }
              />
            </TabsContent>


          {/* ANALYTICS */}
          <TabsContent value="analytics" className="space-y-5 mt-5">
            <AnalyticsTab
              isRTL={isRTL}
              stats={stats}
              accountTypePie={accountTypePie}
              tierBar={tierBar}
            />
          </TabsContent>
        </AdminListPageTemplate>
      </Tabs>
    </DashboardLayout>
  );
};

export default AdminUsers;
export { EmailLiveHint } from './users/_shared';
