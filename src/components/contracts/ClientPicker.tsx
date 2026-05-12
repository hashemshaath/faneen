/**
 * CT4B — ClientPicker
 *
 * Search-based client selector for the contract creation flow. Replaces the
 * old "type the client's email" input. Calls the SECURITY DEFINER RPC
 * `search_contract_clients` so providers only see clients linked to their
 * leads/contracts and admins can search the full customer base. Email/phone
 * are returned masked from the server — never raw.
 *
 * If the client truly does not exist yet, the picker exposes a fallback to
 * enter a verified client email manually (the legacy behavior). Creating
 * brand-new auth users is intentionally out of scope here — the create
 * mutation will surface a friendly "client not found" error in that case.
 */
import { useEffect, useMemo, useRef, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Loader2, Search, User, X, Mail } from 'lucide-react';
import { Send } from 'lucide-react';

export interface SelectedClient {
  user_id: string;
  full_name: string | null;
  email_masked: string | null;
  phone_masked: string | null;
  ref_id: string | null;
  source?: string | null;
}

interface Props {
  isRTL: boolean;
  selected: SelectedClient | null;
  onSelect: (c: SelectedClient | null) => void;
  /** Manual email fallback used when the client cannot be searched. */
  fallbackEmail: string;
  onFallbackEmail: (email: string) => void;
  /**
   * CT4C.3 — Optional "Send invitation" handler. If provided, the picker
   * shows a CTA when the search returns 0 results so the user can invite
   * an unregistered client to join the platform.
   */
  onRequestInvite?: (prefillEmail: string) => void;
}

export function ClientPicker({ isRTL, selected, onSelect, fallbackEmail, onFallbackEmail, onRequestInvite }: Props) {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<SelectedClient[]>([]);
  const [loading, setLoading] = useState(false);
  const [open, setOpen] = useState(false);
  const [showFallback, setShowFallback] = useState(false);
  const debounce = useRef<number | null>(null);

  useEffect(() => {
    if (selected) return;
    if (debounce.current) window.clearTimeout(debounce.current);
    if (query.trim().length < 2) { setResults([]); return; }
    debounce.current = window.setTimeout(async () => {
      setLoading(true);
      const { data, error } = await supabase.rpc('search_contract_clients', { _q: query.trim() });
      setLoading(false);
      if (error) { setResults([]); return; }
      setResults((data as SelectedClient[]) ?? []);
      setOpen(true);
    }, 250);
  }, [query, selected]);

  const helper = useMemo(
    () => isRTL
      ? 'ابحث بالاسم أو البريد أو الجوال أو معرف العميل (USR-...).'
      : 'Search by name, email, phone, or client reference ID (USR-…).',
    [isRTL],
  );

  if (selected) {
    return (
      <div className="p-4 rounded-xl border-2 border-success/40 bg-success/5 space-y-2">
        <div className="flex items-center justify-between gap-2">
          <Label className="text-xs font-semibold flex items-center gap-1.5">
            <User className="w-3.5 h-3.5 text-success" />
            {isRTL ? 'العميل المختار' : 'Selected client'}
          </Label>
          <Button type="button" variant="ghost" size="sm" className="h-7 px-2 text-[10px]" onClick={() => onSelect(null)}>
            <X className="w-3 h-3 me-1" />
            {isRTL ? 'تغيير' : 'Change'}
          </Button>
        </div>
        <div className="text-sm font-medium">{selected.full_name || (isRTL ? 'بدون اسم' : 'Unnamed')}</div>
        <div className="flex flex-wrap gap-1.5 text-[10px] text-muted-foreground">
          {selected.ref_id && <Badge variant="secondary" className="text-[9px]">{selected.ref_id}</Badge>}
          {selected.email_masked && <span dir="ltr">{selected.email_masked}</span>}
          {selected.phone_masked && <span dir="ltr">· {selected.phone_masked}</span>}
        </div>
      </div>
    );
  }

  return (
    <div className="p-4 rounded-xl border-2 border-dashed border-accent/30 bg-accent/5 space-y-2">
      <Label className="text-xs font-semibold flex items-center gap-1.5">
        <Search className="w-3.5 h-3.5 text-accent" />
        {isRTL ? 'العميل' : 'Client'} <span className="text-destructive">*</span>
      </Label>
      {!showFallback ? (
        <>
          <div className="relative">
            <Input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              onFocus={() => results.length > 0 && setOpen(true)}
              placeholder={isRTL ? 'ابحث عن عميل…' : 'Search for a client…'}
              className="h-10"
            />
            {loading && <Loader2 className="w-4 h-4 animate-spin absolute end-3 top-1/2 -translate-y-1/2 text-muted-foreground" />}
          </div>
          {open && results.length > 0 && (
            <div className="border border-border/40 rounded-lg overflow-hidden bg-card max-h-64 overflow-y-auto">
              {results.map((r) => (
                <button
                  key={r.user_id}
                  type="button"
                  onClick={() => { onSelect(r); setOpen(false); setQuery(''); }}
                  className="w-full text-start px-3 py-2 hover:bg-muted/40 border-b border-border/20 last:border-b-0"
                >
                  <div className="text-xs font-medium">{r.full_name || (isRTL ? 'بدون اسم' : 'Unnamed')}</div>
                  <div className="flex flex-wrap gap-2 text-[10px] text-muted-foreground mt-0.5">
                    {r.ref_id && <span>{r.ref_id}</span>}
                    {r.email_masked && <span dir="ltr">{r.email_masked}</span>}
                    {r.phone_masked && <span dir="ltr">{r.phone_masked}</span>}
                  </div>
                </button>
              ))}
            </div>
          )}
          {open && !loading && query.trim().length >= 2 && results.length === 0 && (
            <div className="space-y-2">
              <p className="text-[10px] text-muted-foreground">{isRTL ? 'لا توجد نتائج. تحقق من التهجئة.' : 'No matches. Check the spelling.'}</p>
              {onRequestInvite && (
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className="h-8 gap-1.5 text-[11px]"
                  onClick={() => onRequestInvite(query.trim())}
                >
                  <Send className="w-3 h-3" />
                  {isRTL ? 'إرسال دعوة للعميل' : 'Send client invitation'}
                </Button>
              )}
            </div>
          )}
          <p className="text-[9px] text-muted-foreground">{helper}</p>
          <button
            type="button"
            className="text-[10px] text-primary hover:underline"
            onClick={() => setShowFallback(true)}
          >
            {isRTL ? 'لا يظهر العميل؟ أدخل البريد يدويًا' : "Client not showing? Enter email manually"}
          </button>
        </>
      ) : (
        <div className="space-y-2">
          <div className="flex items-center gap-2">
            <Mail className="w-3.5 h-3.5 text-accent" />
            <span className="text-[10px] font-medium">{isRTL ? 'بريد العميل المسجّل' : 'Registered client email'}</span>
          </div>
          <Input
            type="email"
            value={fallbackEmail}
            onChange={(e) => onFallbackEmail(e.target.value)}
            placeholder="client@email.com"
            dir="ltr"
            className="h-10"
          />
          <p className="text-[9px] text-muted-foreground">
            {isRTL
              ? 'يجب أن يكون العميل مسجلاً مسبقًا في المنصة. لإنشاء عميل جديد، استخدم دعوة الانضمام.'
              : 'The client must already be registered on the platform. To onboard a new client, use the invite flow.'}
          </p>
          <button type="button" className="text-[10px] text-muted-foreground hover:underline" onClick={() => setShowFallback(false)}>
            {isRTL ? 'العودة إلى البحث' : 'Back to search'}
          </button>
        </div>
      )}
    </div>
  );
}