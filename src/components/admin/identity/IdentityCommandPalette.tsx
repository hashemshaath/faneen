/**
 * IdentityCommandPalette — Fullscreen Cmd/Ctrl+K palette.
 *
 * UX-policy compliant: this is a fullscreen overlay panel (not a modal
 * Radix Dialog) — keyboard-driven unified search across users, businesses
 * and quick-jump admin actions.
 */
import React, { useEffect, useMemo, useRef, useState, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { Link, useNavigate } from 'react-router-dom';
import {
  Search, X, Building2, Shield, Crown, ShieldCheck, KeyRound,
  UserPlus, Sparkles, ArrowRight, Briefcase, Activity, BarChart3,
} from 'lucide-react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { ReferenceBadge } from '@/components/reference/ReferenceBadge';
import type { Tables } from '@/integrations/supabase/types';

type Profile = Tables<'profiles'>;

interface BizLite {
  id: string;
  user_id: string;
  name_ar: string;
  name_en: string | null;
  ref_id: string;
  username: string | null;
  is_verified: boolean;
}

interface QuickAction {
  id: string;
  label_ar: string;
  label_en: string;
  icon: React.ElementType;
  to: string;
  hint_ar?: string;
  hint_en?: string;
}

const QUICK_ACTIONS: QuickAction[] = [
  { id: 'qa-new-user',     label_ar: 'إنشاء مستخدم جديد',     label_en: 'Create new user',       icon: UserPlus,    to: '/admin/identity?view=users&create=individual' },
  { id: 'qa-new-provider', label_ar: 'إنشاء مزود خدمة',        label_en: 'Create service provider', icon: Briefcase,  to: '/admin/identity?view=users&create=provider' },
  { id: 'qa-providers',    label_ar: 'مراجعة المزودين',         label_en: 'Provider review',        icon: ShieldCheck, to: '/admin/identity?view=provider-review' },
  { id: 'qa-access-mgmt',  label_ar: 'إدارة الصلاحيات',         label_en: 'Access management',      icon: Shield,      to: '/admin/identity?view=access-management' },
  { id: 'qa-access-req',   label_ar: 'طلبات الانضمام',          label_en: 'Access requests',        icon: KeyRound,    to: '/admin/identity?view=access-requests' },
  { id: 'qa-memberships',  label_ar: 'إدارة العضويات',          label_en: 'Memberships',            icon: Crown,       to: '/admin/memberships' },
  { id: 'qa-analytics',    label_ar: 'تحليلات الحسابات',         label_en: 'Identity analytics',     icon: BarChart3,   to: '/admin/identity?view=analytics' },
  { id: 'qa-overview',     label_ar: 'النظرة العامة',            label_en: 'Overview',               icon: Activity,    to: '/admin/identity?view=overview' },
];

interface Row {
  id: string;
  to: string;
  kind: 'user' | 'business' | 'action';
  primary: string;
  secondary?: string;
  ref?: string | null;
  avatar?: string | null;
  icon?: React.ElementType;
  verified?: boolean;
}

interface Props {
  open: boolean;
  onClose: () => void;
  isRTL: boolean;
  profiles: Profile[];
  businesses: BizLite[];
}

export const IdentityCommandPalette: React.FC<Props> = ({
  open, onClose, isRTL, profiles, businesses,
}) => {
  const navigate = useNavigate();
  const [query, setQuery] = useState('');
  const [active, setActive] = useState(0);
  const inputRef = useRef<HTMLInputElement | null>(null);

  // Reset state every time it opens
  useEffect(() => {
    if (open) {
      setQuery('');
      setActive(0);
      // Focus after paint
      requestAnimationFrame(() => inputRef.current?.focus());
    }
  }, [open]);

  // Lock body scroll while open
  useEffect(() => {
    if (!open) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => { document.body.style.overflow = prev; };
  }, [open]);

  const rows = useMemo<Row[]>(() => {
    const q = query.trim().toLowerCase();
    if (!q) {
      // No query → show quick actions + recent users/businesses
      const recentUsers = profiles.slice(0, 5).map<Row>(p => ({
        id: `u-${p.id}`, to: `/admin/users?focus=${p.user_id}`, kind: 'user',
        primary: p.full_name || (isRTL ? 'بدون اسم' : 'No name'),
        secondary: p.email || '',
        ref: p.ref_id, avatar: p.avatar_url,
      }));
      const recentBiz = businesses.slice(0, 5).map<Row>(b => ({
        id: `b-${b.id}`, to: `/admin/businesses?focus=${b.id}`, kind: 'business',
        primary: isRTL ? b.name_ar : (b.name_en || b.name_ar),
        secondary: b.username ? `@${b.username}` : '',
        ref: b.ref_id, verified: b.is_verified,
      }));
      const actions = QUICK_ACTIONS.map<Row>(a => ({
        id: a.id, to: a.to, kind: 'action',
        primary: isRTL ? a.label_ar : a.label_en,
        icon: a.icon,
      }));
      return [...actions, ...recentUsers, ...recentBiz];
    }
    const userMatches: Row[] = profiles.filter(p =>
      p.full_name?.toLowerCase().includes(q) ||
      p.email?.toLowerCase().includes(q) ||
      p.phone?.includes(query) ||
      p.ref_id?.toLowerCase().includes(q),
    ).slice(0, 10).map(p => ({
      id: `u-${p.id}`, to: `/admin/users?focus=${p.user_id}`, kind: 'user',
      primary: p.full_name || (isRTL ? 'بدون اسم' : 'No name'),
      secondary: p.email || '',
      ref: p.ref_id, avatar: p.avatar_url,
    }));
    const bizMatches: Row[] = businesses.filter(b =>
      b.name_ar?.toLowerCase().includes(q) ||
      b.name_en?.toLowerCase().includes(q) ||
      b.ref_id?.toLowerCase().includes(q) ||
      b.username?.toLowerCase().includes(q),
    ).slice(0, 10).map(b => ({
      id: `b-${b.id}`, to: `/admin/businesses?focus=${b.id}`, kind: 'business',
      primary: isRTL ? b.name_ar : (b.name_en || b.name_ar),
      secondary: b.username ? `@${b.username}` : '',
      ref: b.ref_id, verified: b.is_verified,
    }));
    const actionMatches: Row[] = QUICK_ACTIONS.filter(a =>
      a.label_ar.toLowerCase().includes(q) ||
      a.label_en.toLowerCase().includes(q),
    ).map(a => ({
      id: a.id, to: a.to, kind: 'action',
      primary: isRTL ? a.label_ar : a.label_en, icon: a.icon,
    }));
    return [...actionMatches, ...userMatches, ...bizMatches];
  }, [query, profiles, businesses, isRTL]);

  useEffect(() => { setActive(0); }, [query]);

  const onKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (e.key === 'Escape') { e.preventDefault(); onClose(); return; }
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setActive(i => Math.min(rows.length - 1, i + 1));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setActive(i => Math.max(0, i - 1));
    } else if (e.key === 'Enter') {
      const row = rows[active];
      if (row) { onClose(); navigate(row.to); }
    }
  }, [rows, active, navigate, onClose]);

  if (!open) return null;

  const panel = (
    <div
      className="fixed inset-0 z-[60] bg-background/80 backdrop-blur-md animate-in fade-in duration-150"
      role="dialog"
      aria-modal="true"
      aria-label={isRTL ? 'لوحة الأوامر' : 'Command palette'}
      onClick={onClose}
      dir={isRTL ? 'rtl' : 'ltr'}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="mx-auto mt-[8vh] max-w-2xl rounded-3xl border border-border/40 bg-card shadow-2xl overflow-hidden animate-in zoom-in-95 slide-in-from-top-4 duration-200"
      >
        <div className="relative border-b border-border/30">
          <Search className="absolute top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" style={{ insetInlineStart: '20px' }} />
          <input
            ref={inputRef}
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={onKeyDown}
            placeholder={isRTL
              ? 'ابحث في المستخدمين، المنشآت، الإجراءات…'
              : 'Search users, businesses, actions…'}
            className="w-full h-14 bg-transparent ps-14 pe-14 text-sm font-medium placeholder:text-muted-foreground/60 focus:outline-none"
            dir="auto"
          />
          <button
            onClick={onClose}
            aria-label={isRTL ? 'إغلاق' : 'Close'}
            className="absolute top-1/2 -translate-y-1/2 w-8 h-8 rounded-lg flex items-center justify-center text-muted-foreground hover:bg-muted/40"
            style={{ insetInlineEnd: '12px' }}
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="max-h-[60vh] overflow-y-auto p-2">
          {rows.length === 0 ? (
            <div className="p-8 text-center text-sm text-muted-foreground">
              {isRTL ? 'لا توجد نتائج مطابقة' : 'No matching results'}
            </div>
          ) : (
            <ul className="space-y-1">
              {rows.map((row, idx) => {
                const isActive = idx === active;
                const Icon = row.icon;
                return (
                  <li key={row.id}>
                    <Link
                      to={row.to}
                      onMouseEnter={() => setActive(idx)}
                      onClick={onClose}
                      className={`flex items-center gap-3 rounded-xl px-3 py-2.5 transition-colors ${
                        isActive ? 'bg-primary/10 text-foreground' : 'hover:bg-muted/30'
                      }`}
                    >
                      {row.kind === 'user' && (
                        <Avatar className="w-8 h-8 shrink-0">
                          <AvatarImage src={row.avatar || undefined} />
                          <AvatarFallback className="text-[10px]">{row.primary.charAt(0)}</AvatarFallback>
                        </Avatar>
                      )}
                      {row.kind === 'business' && (
                        <div className="w-8 h-8 rounded-lg bg-success/10 flex items-center justify-center shrink-0">
                          <Building2 className="w-4 h-4 text-success" />
                        </div>
                      )}
                      {row.kind === 'action' && Icon && (
                        <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                          <Icon className="w-4 h-4 text-primary" />
                        </div>
                      )}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <p className="text-sm font-medium truncate">{row.primary}</p>
                          {row.ref && <ReferenceBadge refId={row.ref} />}
                        </div>
                        {row.secondary && (
                          <p className="text-[11px] text-muted-foreground truncate">{row.secondary}</p>
                        )}
                      </div>
                      <span className="text-[10px] uppercase text-muted-foreground/70 tracking-wider shrink-0">
                        {row.kind === 'user'
                          ? (isRTL ? 'مستخدم' : 'user')
                          : row.kind === 'business'
                          ? (isRTL ? 'منشأة' : 'business')
                          : (isRTL ? 'إجراء' : 'action')}
                      </span>
                      <ArrowRight className={`w-3.5 h-3.5 text-muted-foreground shrink-0 transition-opacity ${isActive ? 'opacity-100' : 'opacity-0'} ${isRTL ? 'rotate-180' : ''}`} />
                    </Link>
                  </li>
                );
              })}
            </ul>
          )}
        </div>

        <div className="border-t border-border/30 px-4 py-2 flex items-center justify-between bg-muted/20">
          <div className="flex items-center gap-3 text-[10px] text-muted-foreground">
            <span className="inline-flex items-center gap-1"><kbd className="px-1.5 py-0.5 rounded bg-card border border-border/40 font-mono">↑↓</kbd>{isRTL ? 'تنقّل' : 'navigate'}</span>
            <span className="inline-flex items-center gap-1"><kbd className="px-1.5 py-0.5 rounded bg-card border border-border/40 font-mono">Enter</kbd>{isRTL ? 'فتح' : 'open'}</span>
            <span className="inline-flex items-center gap-1"><kbd className="px-1.5 py-0.5 rounded bg-card border border-border/40 font-mono">Esc</kbd>{isRTL ? 'إغلاق' : 'close'}</span>
          </div>
          <div className="flex items-center gap-1 text-[10px] text-muted-foreground">
            <Sparkles className="w-3 h-3" />
            <span>{isRTL ? 'بحث ذكي موحّد' : 'unified smart search'}</span>
          </div>
        </div>
      </div>
    </div>
  );

  return createPortal(panel, document.body);
};

export default IdentityCommandPalette;