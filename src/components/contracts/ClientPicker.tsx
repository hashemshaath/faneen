/**
 * ClientPicker — v2 (Quick-add + smart search)
 *
 * Three inline states (no popup):
 *   1) search   — Smart search input. Provider's clients first; an exact-match
 *                 (full email / phone / USR-XXXXX) also reveals platform users.
 *   2) quick    — Inline quick-add form (name + email + phone). Live "resolve"
 *                 detects when the contact already has an account so we LINK
 *                 instead of inviting. Otherwise saved as a guest contact.
 *   3) selected — Chosen client (registered) OR confirmed guest contact.
 *
 * The legacy `fallbackEmail` and `onRequestInvite` props are kept for backwards
 * compatibility with the parent. The new `onSelectGuest` callback emits the
 * captured guest contact for inclusion in the contract create payload.
 */
import { useEffect, useMemo, useRef, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Loader2, Search, User, X, UserPlus, ShieldCheck, Globe2, CircleCheck, Mail } from 'lucide-react';

export interface SelectedClient {
  user_id: string;
  full_name: string | null;
  email_masked: string | null;
  phone_masked: string | null;
  ref_id: string | null;
  source?: string | null;
}

export interface GuestClient {
  name: string | null;
  email: string | null;
  phone: string | null;
}

interface SearchRow extends SelectedClient {
  account_type?: string | null;
}

interface ResolveRow {
  matched_user_id: string | null;
  ref_id: string | null;
  full_name: string | null;
  email_masked: string | null;
  phone_masked: string | null;
  matched_on: string | null;
}

interface Props {
  isRTL: boolean;
  selected: SelectedClient | null;
  onSelect: (c: SelectedClient | null) => void;
  /** Legacy: kept so parent state stays in sync; mirrors the guest email. */
  fallbackEmail: string;
  onFallbackEmail: (email: string) => void;
  /** New: guest contact (when no registered client). */
  guest?: GuestClient | null;
  onSelectGuest?: (g: GuestClient | null) => void;
  /** Optional manual fallback to the legacy invite flow. */
  onRequestInvite?: (prefillEmail: string) => void;
  /** Optional initial values from a converted lead. */
  prefillName?: string | null;
  prefillEmail?: string | null;
  prefillPhone?: string | null;
}

type Mode = 'search' | 'quick';

export function ClientPicker({
  isRTL, selected, onSelect, fallbackEmail, onFallbackEmail,
  guest, onSelectGuest, onRequestInvite,
  prefillName, prefillEmail, prefillPhone,
}: Props) {
  const [mode, setMode] = useState<Mode>('search');
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<SearchRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [open, setOpen] = useState(false);
  const debounce = useRef<number | null>(null);

  const [qa, setQa] = useState({
    name: guest?.name ?? prefillName ?? '',
    email: guest?.email ?? prefillEmail ?? fallbackEmail ?? '',
    phone: guest?.phone ?? prefillPhone ?? '',
  });
  const [match, setMatch] = useState<ResolveRow | null>(null);
  const [resolving, setResolving] = useState(false);
  const resolveDebounce = useRef<number | null>(null);

  /* ── Search effect ── */
  useEffect(() => {
    if (selected || mode !== 'search') return;
    if (debounce.current) window.clearTimeout(debounce.current);
    if (query.trim().length < 2) { setResults([]); setOpen(false); return; }
    debounce.current = window.setTimeout(async () => {
      setLoading(true);
      const { data, error } = await searchContractClients({ _q: query.trim() });
      setLoading(false);
      if (error) { setResults([]); return; }
      setResults((data as SearchRow[]) ?? []);
      setOpen(true);
    }, 250);
  }, [query, selected, mode]);

  /* ── Live resolve while filling quick-add ── */
  useEffect(() => {
    if (mode !== 'quick') return;
    if (resolveDebounce.current) window.clearTimeout(resolveDebounce.current);
    const email = qa.email.trim();
    const phone = qa.phone.trim();
    if (!email && !phone) { setMatch(null); return; }
    resolveDebounce.current = window.setTimeout(async () => {
      setResolving(true);
      const { data } = await quickResolveContractClient({
        _email: email || null,
        _phone: phone || null,
      });
      setResolving(false);
      const row = (data as ResolveRow[] | null)?.[0] ?? null;
      setMatch(row && row.matched_user_id ? row : null);
    }, 350);
  }, [qa.email, qa.phone, mode]);

  const helper = useMemo(
    () => isRTL
      ? 'ابحث بالاسم في عملائك، أو بالبريد/الجوال/معرف العميل (USR-) للنتائج الدقيقة من المنصة.'
      : 'Search by name in your clients, or by full email / phone / USR-ID to also find platform users.',
    [isRTL],
  );

  const grouped = useMemo(() => {
    const own = results.filter(r => r.source !== 'exact_match');
    const platform = results.filter(r => r.source === 'exact_match');
    return { own, platform };
  }, [results]);

  /* ──────────── Selected (registered client) ──────────── */
  if (selected) {
    return (
      <div className="p-4 rounded-xl border-2 border-success/40 bg-success/5 space-y-2">
        <div className="flex items-center justify-between gap-2">
          <Label className="text-xs font-semibold flex items-center gap-1.5">
            <User className="w-3.5 h-3.5 text-success" />
            {isRTL ? 'العميل المختار' : 'Selected client'}
          </Label>
          <Button type="button" variant="ghost" size="sm" className="h-7 px-2 text-[10px]"
            onClick={() => { onSelect(null); onSelectGuest?.(null); onFallbackEmail(''); }}>
            <X className="w-3 h-3 me-1" />
            {isRTL ? 'تغيير' : 'Change'}
          </Button>
        </div>
        <div className="text-sm font-medium">{selected.full_name || (isRTL ? 'بدون اسم' : 'Unnamed')}</div>
        <div className="flex flex-wrap gap-1.5 text-[10px] text-muted-foreground tech-content">
          {selected.ref_id && <Badge variant="secondary" className="text-[9px]">{selected.ref_id}</Badge>}
          {selected.email_masked && <span dir="ltr">{selected.email_masked}</span>}
          {selected.phone_masked && <span dir="ltr">· {selected.phone_masked}</span>}
        </div>
      </div>
    );
  }

  /* ──────────── Confirmed guest (no registered account) ──────────── */
  if (guest && (guest.email || guest.phone)) {
    return (
      <div className="p-4 rounded-xl border-2 border-accent/40 bg-accent/5 space-y-2">
        <div className="flex items-center justify-between gap-2">
          <Label className="text-xs font-semibold flex items-center gap-1.5">
            <UserPlus className="w-3.5 h-3.5 text-accent" />
            {isRTL ? 'عميل ضيف (سيُربط لاحقاً)' : 'Guest client (auto-link later)'}
          </Label>
          <Button type="button" variant="ghost" size="sm" className="h-7 px-2 text-[10px]"
            onClick={() => { onSelectGuest?.(null); onFallbackEmail(''); setQa({ name: '', email: '', phone: '' }); setMatch(null); }}>
            <X className="w-3 h-3 me-1" />
            {isRTL ? 'تغيير' : 'Change'}
          </Button>
        </div>
        <div className="text-sm font-medium">{guest.name || (isRTL ? 'بدون اسم' : 'Unnamed')}</div>
        <div className="flex flex-wrap gap-1.5 text-[10px] text-muted-foreground tech-content">
          {guest.email && <span dir="ltr">{guest.email}</span>}
          {guest.phone && <span dir="ltr">· {guest.phone}</span>}
        </div>
        <p className="text-[10px] text-muted-foreground leading-relaxed">
          {isRTL
            ? 'العقد سيُحفظ بدون حساب. يُربط تلقائياً بحساب العميل عند تسجيله بنفس البريد أو الجوال، ويستلم إشعاراً.'
            : 'The contract will be saved without an account. It will auto-link to the client when they sign up with the same email or phone, and they will receive a notification.'}
        </p>
      </div>
    );
  }

  /* ──────────── Default — search / quick add ──────────── */
  return (
    <div className="p-4 rounded-xl border-2 border-dashed border-accent/30 bg-accent/5 space-y-3">
      <div className="flex items-center justify-between gap-2">
        <Label className="text-xs font-semibold flex items-center gap-1.5">
          {mode === 'search' ? <Search className="w-3.5 h-3.5 text-accent" /> : <UserPlus className="w-3.5 h-3.5 text-accent" />}
          {isRTL ? 'العميل' : 'Client'} <span className="text-destructive">*</span>
        </Label>
        <div className="flex items-center gap-1">
          <Button type="button" size="sm" variant={mode === 'search' ? 'secondary' : 'ghost'} className="h-7 px-2 text-[10px]" onClick={() => setMode('search')}>
            <Search className="w-3 h-3 me-1" />{isRTL ? 'بحث' : 'Search'}
          </Button>
          <Button type="button" size="sm" variant={mode === 'quick' ? 'secondary' : 'ghost'} className="h-7 px-2 text-[10px]"
            onClick={() => { setMode('quick'); if (!qa.email && fallbackEmail) setQa(s => ({ ...s, email: fallbackEmail })); }}>
            <UserPlus className="w-3 h-3 me-1" />{isRTL ? 'إضافة سريعة' : 'Quick add'}
          </Button>
        </div>
      </div>

      {mode === 'search' && (
        <>
          <div className="relative">
            <Input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              onFocus={() => results.length > 0 && setOpen(true)}
              placeholder={isRTL ? 'اسم، بريد كامل، جوال، أو USR-…' : 'Name, full email, phone, or USR-…'}
              className="h-10"
            />
            {loading && <Loader2 className="w-4 h-4 animate-spin absolute end-3 top-1/2 -translate-y-1/2 text-muted-foreground" />}
          </div>
          {/* Status line: clear feedback after typing */}
          {query.trim().length >= 2 && !loading && (
            <div className="flex items-center justify-between gap-2 text-[10px]">
              {results.length > 0 ? (
                <span className="inline-flex items-center gap-1 text-success">
                  <CircleCheck className="w-3 h-3" />
                  {isRTL
                    ? `تم العثور على ${results.length} نتيجة${grouped.platform.length > 0 ? ' (تطابق دقيق من المنصة)' : ''}`
                    : `Found ${results.length} result${results.length === 1 ? '' : 's'}${grouped.platform.length > 0 ? ' (exact platform match)' : ''}`}
                </span>
              ) : (
                <span className="inline-flex items-center gap-1 text-muted-foreground">
                  <X className="w-3 h-3" />
                  {isRTL ? 'لا يوجد عميل بهذا المعرّف' : 'No client matches this identifier'}
                </span>
              )}
              <span className="text-muted-foreground">
                {isRTL ? 'تُخفى بعض البيانات حسب خصوصية العميل' : 'Some data is masked per client privacy'}
              </span>
            </div>
          )}
          {open && (grouped.own.length > 0 || grouped.platform.length > 0) && (
            <div className="border border-border/40 rounded-lg overflow-hidden bg-card max-h-72 overflow-y-auto">
              {grouped.own.length > 0 && (
                <div className="px-2.5 py-1.5 bg-success/10 text-[9px] font-semibold text-success-foreground/80 flex items-center gap-1">
                  <ShieldCheck className="w-3 h-3" />{isRTL ? 'عملاؤك' : 'Your clients'}
                </div>
              )}
              {grouped.own.map((r) => (
                <ResultRow key={r.user_id} r={r} isRTL={isRTL} onPick={() => { onSelect(r); setOpen(false); setQuery(''); }} />
              ))}
              {grouped.platform.length > 0 && (
                <div className="px-2.5 py-1.5 bg-info/10 text-[9px] font-semibold text-info-foreground/80 flex items-center gap-1 border-t border-border/30">
                  <Globe2 className="w-3 h-3" />{isRTL ? 'تطابق دقيق من المنصة' : 'Exact match from the platform'}
                </div>
              )}
              {grouped.platform.map((r) => (
                <ResultRow key={r.user_id} r={r} isRTL={isRTL} onPick={() => { onSelect(r); setOpen(false); setQuery(''); }} />
              ))}
            </div>
          )}
          {open && !loading && query.trim().length >= 2 && results.length === 0 && (
            <div className="p-2.5 rounded-lg border border-dashed border-accent/40 bg-accent/5 flex items-center justify-between gap-2">
              <p className="text-[10px] text-muted-foreground leading-relaxed">
                {isRTL
                  ? 'لم يُعثر على عميل مطابق. يمكنك إضافته بسرعة الآن — وسيُربط تلقائياً عند تسجيله.'
                  : 'No matching client. Add them quickly now — auto-links when they sign up.'}
              </p>
              <Button type="button" variant="hero" size="sm" className="h-8 gap-1.5 text-[11px] shrink-0"
                onClick={() => {
                  const q = query.trim();
                  setMode('quick');
                  setQa(s => ({
                    ...s,
                    email: q.includes('@') ? q : s.email,
                    phone: !q.includes('@') && /\d{6,}/.test(q) ? q : s.phone,
                    name:  !q.includes('@') && !/\d{6,}/.test(q) && !q.toUpperCase().startsWith('USR-') ? q : s.name,
                  }));
                }}>
                <UserPlus className="w-3 h-3" />{isRTL ? 'إضافة سريعة' : 'Quick add'}
              </Button>
            </div>
          )}
          <p className="text-[9px] text-muted-foreground">{helper}</p>
        </>
      )}

      {mode === 'quick' && (
        <div className="space-y-2.5">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
            <div className="space-y-1">
              <Label className="text-[10px]">{isRTL ? 'الاسم' : 'Name'}</Label>
              <Input className="h-9 text-xs" value={qa.name} onChange={(e) => setQa(s => ({ ...s, name: e.target.value }))} />
            </div>
            <div className="space-y-1">
              <Label className="text-[10px]">{isRTL ? 'الجوال' : 'Phone'}</Label>
              <Input dir="ltr" className="h-9 text-xs tech-content" value={qa.phone} onChange={(e) => setQa(s => ({ ...s, phone: e.target.value }))} placeholder="+9665…" />
            </div>
            <div className="space-y-1">
              <Label className="text-[10px]">{isRTL ? 'البريد' : 'Email'}</Label>
              <Input dir="ltr" type="email" className="h-9 text-xs tech-content" value={qa.email}
                onChange={(e) => { setQa(s => ({ ...s, email: e.target.value })); onFallbackEmail(e.target.value); }}
                placeholder="client@email.com" />
            </div>
          </div>

          {resolving && (
            <div className="flex items-center gap-1.5 text-[10px] text-muted-foreground">
              <Loader2 className="w-3 h-3 animate-spin" />{isRTL ? 'جارٍ التحقق من وجود الحساب…' : 'Checking for an existing account…'}
            </div>
          )}

          {match && (
            <div className="p-3 rounded-lg border border-success/40 bg-success/5 space-y-2">
              <div className="flex items-center gap-1.5 text-[11px] font-semibold text-success">
                <ShieldCheck className="w-3.5 h-3.5" />
                {isRTL ? 'هذا العميل مسجَّل بالفعل' : 'This client is already registered'}
              </div>
              <div className="text-xs">{match.full_name || (isRTL ? 'بدون اسم' : 'Unnamed')}</div>
              <div className="flex flex-wrap gap-1.5 text-[10px] text-muted-foreground tech-content">
                {match.ref_id && <Badge variant="secondary" className="text-[9px]">{match.ref_id}</Badge>}
                {match.email_masked && <span dir="ltr">{match.email_masked}</span>}
                {match.phone_masked && <span dir="ltr">· {match.phone_masked}</span>}
              </div>
              <p className="text-[10px] text-muted-foreground leading-relaxed">
                {isRTL
                  ? 'سيُربط العقد بحسابه مباشرةً وسيستلم إشعاراً عند إرسال العقد للمعاينة. لا حاجة لإرسال دعوة تسجيل.'
                  : 'The contract will be linked to their account and they will receive a notification when sent for review. No registration invite needed.'}
              </p>
              <Button type="button" variant="hero" size="sm" className="h-8 gap-1.5 text-[11px]"
                onClick={() => {
                  onSelect({
                    user_id: match.matched_user_id!,
                    full_name: match.full_name,
                    email_masked: match.email_masked,
                    phone_masked: match.phone_masked,
                    ref_id: match.ref_id,
                    source: 'matched',
                  });
                  onSelectGuest?.(null);
                  setMatch(null);
                }}>
                <CircleCheck className="w-3 h-3" />{isRTL ? 'ربط بالحساب' : 'Link to account'}
              </Button>
            </div>
          )}

          {!match && (qa.email.trim() || qa.phone.trim()) && !resolving && (
            <div className="flex flex-wrap items-center justify-between gap-2 pt-1">
              <p className="text-[10px] text-muted-foreground">
                {isRTL
                  ? 'لا يوجد حساب مطابق. سيُحفظ كعميل ضيف ويُربط تلقائياً عند تسجيله.'
                  : 'No matching account. It will be saved as a guest and auto-linked when they sign up.'}
              </p>
              <div className="flex items-center gap-1.5">
                {onRequestInvite && qa.email.includes('@') && (
                  <Button type="button" variant="ghost" size="sm" className="h-8 gap-1 text-[10px]"
                    onClick={() => onRequestInvite(qa.email.trim())}>
                    <Mail className="w-3 h-3" />{isRTL ? 'دعوة تسجيل بدلاً من ذلك' : 'Send sign-up invite instead'}
                  </Button>
                )}
                <Button type="button" variant="hero" size="sm" className="h-8 gap-1.5 text-[11px]"
                  disabled={!qa.email.trim() && !qa.phone.trim()}
                  onClick={() => {
                    onSelectGuest?.({
                      name: qa.name.trim() || null,
                      email: qa.email.trim() || null,
                      phone: qa.phone.trim() || null,
                    });
                    onFallbackEmail(qa.email.trim());
                  }}>
                  <UserPlus className="w-3 h-3" />{isRTL ? 'حفظ كعميل ضيف' : 'Save as guest'}
                </Button>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function ResultRow({ r, isRTL, onPick }: { r: SearchRow; isRTL: boolean; onPick: () => void }) {
  return (
    <button type="button" onClick={onPick}
      className="w-full text-start px-3 py-2 hover:bg-muted/40 border-b border-border/20 last:border-b-0">
      <div className="text-xs font-medium">{r.full_name || (isRTL ? 'بدون اسم' : 'Unnamed')}</div>
      <div className="flex flex-wrap gap-2 text-[10px] text-muted-foreground tech-content mt-0.5">
        {r.ref_id && <span>{r.ref_id}</span>}
        {r.email_masked && <span dir="ltr">{r.email_masked}</span>}
        {r.phone_masked && <span dir="ltr">{r.phone_masked}</span>}
      </div>
    </button>
  );
}