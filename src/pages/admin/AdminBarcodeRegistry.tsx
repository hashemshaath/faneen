import React, { useEffect, useMemo, useState } from 'react';
import { useQuery, keepPreviousData, useQueryClient, useMutation } from '@tanstack/react-query';
import { DashboardLayout } from '@/components/dashboard/DashboardLayout';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import {
  QrCode, RefreshCw, Copy, Check, ChevronDown, ChevronUp, Hash,
  Activity, ShieldCheck, ShieldAlert, Archive, Snowflake, ArrowRightLeft,
  Eye, EyeOff, Link2, Zap, ExternalLink, FilterX, Pause, RotateCcw, X,
} from 'lucide-react';
import { useNoIndex } from '@/hooks/useNoIndex';
import { useBi } from '@/components/common/Bilingual';
import { useLanguage } from '@/i18n/LanguageContext';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';
import BarcodeWidget from '@/components/barcodes/BarcodeWidget';
import {
  listBarcodeRegistryRecords,
  getBarcodeRegistrySummary,
  getBarcodeRegistryRecordById,
  freezeBarcodeAdmin,
  archiveBarcodeAdmin,
  restoreBarcodeAdmin,
  transferBarcodeAdmin,
  listBarcodeTransferTrailAdmin,
  type BarcodeRegistryRow as BarcodeRow,
  type BarcodeRegistrySummary as RegistrySummary,
  type BarcodeRegistryDetail as BarcodeDetail,
  type BarcodeTransferTrailEntry,
} from '@/modules/barcodes';
import {
  adminSearchUsersForTransfer,
  type AdminTransferUserHit,
} from '@/modules/users';
import { buildBarcodeUrl } from '@/lib/barcodes/barcode-url';

const ENTITY_TYPES = ['client_site', 'contract', 'business', 'customer', 'lead'];
const STATUSES = ['active', 'frozen', 'archived', 'revoked', 'transferred'];
const VISIBILITIES = ['public', 'private', 'restricted'];
const PAGE_SIZES = [25, 50, 100];

// ──────────────────────────────────────────────
// Lifecycle action availability + error mapping
// ──────────────────────────────────────────────
type LifecycleAction = 'freeze' | 'archive' | 'restore' | 'transfer';

function availableActions(status: string): LifecycleAction[] {
  switch (status) {
    case 'active':   return ['freeze', 'archive', 'transfer'];
    case 'frozen':   return ['restore', 'archive', 'transfer'];
    case 'archived': return ['restore'];
    case 'revoked':  return ['archive'];
    default:         return [];
  }
}

function mapLifecycleError(
  payload: { ok?: boolean; error?: string; conflict_barcode_id?: string } | null | undefined,
  rpcError: { message?: string } | null | undefined,
  bi: (ar: string, en: string) => string,
): string | null {
  if (rpcError?.message) {
    const m = rpcError.message.toLowerCase();
    if (m.includes('forbidden') || m.includes('not_admin'))
      return bi('لا تملك صلاحية تنفيذ هذا الإجراء.', 'Permission denied.');
    if (m.includes('unauthorized'))
      return bi('يرجى تسجيل الدخول كمسؤول.', 'Please sign in as admin.');
    return bi('تعذّر تنفيذ الإجراء.', 'Action failed.');
  }
  if (!payload || payload.ok) return null;
  switch (payload.error) {
    case 'not_found':
      return bi('الرمز غير موجود.', 'Barcode not found.');
    case 'invalid_transition':
      return bi(
        'لا يمكن نقل الرمز من حالته الحالية.',
        'This code cannot be transferred from its current status.',
      );
    case 'entity_already_has_active_barcode':
      return bi(
        'لا يمكن الاستعادة بسبب وجود رمز نشط لنفس الكيان.',
        'Cannot restore because another active barcode exists for this entity.',
      );
    case 'missing_target_user':
      return bi('يرجى إدخال المستخدم المستهدف.', 'Please provide the target user.');
    case 'target_user_not_found':
      return bi('المستخدم المستهدف غير موجود.', 'Target user was not found.');
    case 'same_owner':
      return bi('لا يمكن نقل الرمز إلى نفس المالك.', 'Cannot transfer to the same owner.');
    default:
      return bi('تعذّر تنفيذ الإجراء.', 'Action failed.');
  }
}

// Basic UUID v1–v5 client-side guard (server remains the final authority).
const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

// ──────────────────────────────────────────────
// Admin-safe user picker for barcode transfer.
// Wraps `adminSearchUsersForTransfer` (admin RPC, masked fields only) with a
// debounced search input + result list, and a UUID-paste fallback. No direct
// profiles / auth.users access.
// ──────────────────────────────────────────────
const TransferUserPicker: React.FC<{
  selectedUserId: string;
  onSelect: (userId: string, hit: AdminTransferUserHit | null) => void;
  disabled?: boolean;
}> = ({ selectedUserId, onSelect, disabled }) => {
  const bi = useBi();
  const [query, setQuery] = useState('');
  const [debounced, setDebounced] = useState('');
  const [uuidMode, setUuidMode] = useState(false);
  const [uuidInput, setUuidInput] = useState('');
  const [picked, setPicked] = useState<AdminTransferUserHit | null>(null);

  useEffect(() => {
    const t = setTimeout(() => setDebounced(query.trim()), 300);
    return () => clearTimeout(t);
  }, [query]);

  const canSearch = debounced.length >= 2 && !uuidMode;

  const { data: searchEnvelope, isFetching } = useQuery({
    queryKey: ['admin-transfer-user-search', debounced],
    queryFn: () => adminSearchUsersForTransfer({ query: debounced, limit: 10 }),
    enabled: canSearch,
    staleTime: 30_000,
  });

  const results: AdminTransferUserHit[] = useMemo(() => {
    const data = searchEnvelope?.data;
    return Array.isArray(data) ? (data as AdminTransferUserHit[]) : [];
  }, [searchEnvelope]);
  const rpcErr = searchEnvelope?.error?.message ?? null;

  const uuidValid = UUID_RE.test(uuidInput.trim());

  const choose = (hit: AdminTransferUserHit) => {
    setPicked(hit);
    onSelect(hit.user_id, hit);
  };

  const clearSelection = () => {
    setPicked(null);
    setUuidInput('');
    onSelect('', null);
  };

  // Selected user summary
  if (selectedUserId && (picked || uuidMode)) {
    return (
      <div className="rounded-md border bg-card px-2.5 py-2 text-xs space-y-1">
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-2 min-w-0">
            <Badge variant="secondary" className="text-[10px]">
              {bi('المستخدم المستهدف', 'Target user')}
            </Badge>
            {picked ? (
              <span className="truncate font-medium">{picked.display_name}</span>
            ) : (
              <span className="truncate tech-content">{selectedUserId}</span>
            )}
          </div>
          <Button
            size="sm"
            variant="ghost"
            onClick={clearSelection}
            disabled={disabled}
            aria-label={bi('تغيير', 'Change')}
          >
            <X className="h-3.5 w-3.5 me-1" />
            {bi('تغيير', 'Change')}
          </Button>
        </div>
        {picked && (
          <div className="flex flex-wrap gap-x-3 gap-y-0.5 text-[11px] text-muted-foreground tech-content">
            {picked.ref_id && <span>{picked.ref_id}</span>}
            {picked.masked_email && <span>· {picked.masked_email}</span>}
            {picked.phone_hint && <span>· {picked.phone_hint}</span>}
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="space-y-1.5">
      <div className="flex items-center justify-between gap-2">
        <label className="text-[11px] font-semibold text-muted-foreground">
          {uuidMode
            ? bi('لصق معرف UUID يدويًا', 'Paste UUID manually')
            : bi('ابحث عن المستخدم', 'Search user')}
        </label>
        <button
          type="button"
          className="text-[11px] underline text-muted-foreground hover:text-foreground"
          onClick={() => { setUuidMode((v) => !v); setQuery(''); setUuidInput(''); }}
          disabled={disabled}
        >
          {uuidMode ? bi('بحث', 'Search') : bi('لصق UUID', 'Paste UUID')}
        </button>
      </div>

      {uuidMode ? (
        <div className="space-y-1">
          <Input
            value={uuidInput}
            onChange={(e) => {
              setUuidInput(e.target.value);
              const v = e.target.value.trim();
              if (UUID_RE.test(v)) onSelect(v, null);
              else onSelect('', null);
            }}
            placeholder={bi('المستخدم المستهدف', 'Target user')}
            dir="ltr"
            className="h-9 tech-content"
            aria-label={bi('المستخدم المستهدف', 'Target user')}
            disabled={disabled}
            spellCheck={false}
            autoComplete="off"
          />
          <div
            className={cn(
              'text-[11px]',
              uuidInput.length > 0 && !uuidValid ? 'text-destructive' : 'text-muted-foreground',
            )}
          >
            {bi('أدخل معرف المستخدم UUID', 'Enter the user UUID')}
          </div>
        </div>
      ) : (
        <>
          <Input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder={bi(
              'ابحث بالاسم أو الرقم المرجعي أو الجوال',
              'Search by name, reference ID, or phone',
            )}
            dir="auto"
            className="h-9"
            aria-label={bi('ابحث عن المستخدم', 'Search user')}
            disabled={disabled}
            autoComplete="off"
          />
          {rpcErr && (
            <div className="text-[11px] text-destructive">
              {bi('تعذّر البحث.', 'Search failed.')}
            </div>
          )}
          {canSearch && (
            <div className="rounded-md border bg-card max-h-56 overflow-auto divide-y">
              {isFetching ? (
                <div className="px-2.5 py-2 text-[11px] text-muted-foreground">
                  {bi('جارٍ البحث…', 'Searching…')}
                </div>
              ) : results.length === 0 ? (
                <div className="px-2.5 py-2 text-[11px] text-muted-foreground">
                  {bi('لم يتم العثور على مستخدمين', 'No users found')}
                </div>
              ) : (
                results.map((u) => (
                  <button
                    key={u.user_id}
                    type="button"
                    onClick={() => choose(u)}
                    disabled={disabled}
                    className="w-full text-start px-2.5 py-1.5 hover:bg-muted transition flex items-center justify-between gap-2"
                  >
                    <div className="min-w-0">
                      <div className="text-xs font-medium truncate">{u.display_name}</div>
                      <div className="text-[11px] text-muted-foreground tech-content flex flex-wrap gap-x-2">
                        {u.ref_id && <span>{u.ref_id}</span>}
                        {u.masked_email && <span>· {u.masked_email}</span>}
                        {u.phone_hint && <span>· {u.phone_hint}</span>}
                      </div>
                    </div>
                    <ChevronDown className="h-3.5 w-3.5 -rotate-90 opacity-60 shrink-0" />
                  </button>
                ))
              )}
            </div>
          )}
          {!canSearch && debounced.length > 0 && debounced.length < 2 && (
            <div className="text-[11px] text-muted-foreground">
              {bi('أدخل حرفين على الأقل', 'Enter at least 2 characters')}
            </div>
          )}
        </>
      )}
    </div>
  );
};

// ──────────────────────────────────────────────
// Helpers
// ──────────────────────────────────────────────
function statusVariant(status: string): { cls: string; icon: React.ElementType } {
  switch (status) {
    case 'active':      return { cls: 'bg-emerald-500/10 text-emerald-600 border-emerald-500/30', icon: ShieldCheck };
    case 'frozen':      return { cls: 'bg-sky-500/10 text-sky-600 border-sky-500/30', icon: Snowflake };
    case 'archived':    return { cls: 'bg-muted text-muted-foreground border-border', icon: Archive };
    case 'revoked':     return { cls: 'bg-destructive/10 text-destructive border-destructive/30', icon: ShieldAlert };
    case 'transferred': return { cls: 'bg-amber-500/10 text-amber-600 border-amber-500/30', icon: ArrowRightLeft };
    default:            return { cls: 'bg-muted text-muted-foreground border-border', icon: Hash };
  }
}

function visibilityIcon(v: string) {
  if (v === 'public') return Eye;
  if (v === 'private') return EyeOff;
  return ShieldAlert;
}

function fmtDate(iso: string | null, isRTL: boolean): string {
  if (!iso) return '—';
  try {
    return new Date(iso).toLocaleString(isRTL ? 'ar-SA-u-nu-latn' : 'en-GB', {
      year: 'numeric', month: 'short', day: '2-digit', hour: '2-digit', minute: '2-digit',
    });
  } catch { return iso; }
}

// ──────────────────────────────────────────────
// KPI Card
// ──────────────────────────────────────────────
const KpiCard: React.FC<{
  label: string; value: number | string; icon: React.ElementType; tone?: string;
}> = ({ label, value, icon: Icon, tone = 'text-primary' }) => (
  <Card className="hover-lift">
    <CardContent className="p-4 flex items-center gap-3">
      <div className={cn('h-10 w-10 rounded-xl flex items-center justify-center bg-muted/50', tone)}>
        <Icon className="h-5 w-5" />
      </div>
      <div className="min-w-0">
        <div className="text-xs text-muted-foreground truncate">{label}</div>
        <div className="text-2xl font-bold tech-content">{value}</div>
      </div>
    </CardContent>
  </Card>
);

// ──────────────────────────────────────────────
// Copy code button
// ──────────────────────────────────────────────
const CopyCode: React.FC<{ code: string }> = ({ code }) => {
  const [done, setDone] = useState(false);
  const bi = useBi();
  return (
    <button
      type="button"
      onClick={async (e) => {
        e.stopPropagation();
        try {
          await navigator.clipboard.writeText(code);
          setDone(true);
          toast.success(bi('تم النسخ', 'Copied'));
          setTimeout(() => setDone(false), 1500);
        } catch { toast.error(bi('تعذر النسخ', 'Copy failed')); }
      }}
      className="inline-flex items-center gap-1.5 px-2 py-1 rounded-md bg-muted/50 hover:bg-muted text-xs font-mono tech-content transition"
      aria-label={bi('نسخ الكود', 'Copy code')}
      title={bi('نسخ الكود', 'Copy code')}
    >
      <span className="truncate max-w-[180px]">{code}</span>
      {done ? <Check className="h-3.5 w-3.5 text-emerald-500" /> : <Copy className="h-3.5 w-3.5 opacity-60" />}
    </button>
  );
};

// ──────────────────────────────────────────────
// Copy / open public URL actions
// ──────────────────────────────────────────────
const PublicLinkActions: React.FC<{ code: string }> = ({ code }) => {
  const bi = useBi();
  const url = useMemo(() => buildBarcodeUrl(code), [code]);
  const handleCopy = async (e: React.MouseEvent) => {
    e.stopPropagation();
    try {
      await navigator.clipboard.writeText(url);
      toast.success(bi('تم نسخ الرابط', 'Link copied'));
    } catch {
      toast.error(bi('تعذّر نسخ الرابط', 'Copy failed'));
    }
  };
  return (
    <span className="inline-flex items-center gap-1" onClick={(e) => e.stopPropagation()}>
      <button
        type="button"
        onClick={handleCopy}
        aria-label={bi('نسخ الرابط العام', 'Copy public link')}
        title={bi('نسخ الرابط العام', 'Copy public link')}
        className="p-1 rounded-md hover:bg-muted text-muted-foreground hover:text-foreground transition"
      >
        <Link2 className="h-3.5 w-3.5" />
      </button>
      <a
        href={url}
        target="_blank"
        rel="noreferrer noopener"
        onClick={(e) => e.stopPropagation()}
        aria-label={bi('فتح الرابط العام', 'Open public link')}
        title={bi('فتح الرابط العام', 'Open public link')}
        className="p-1 rounded-md hover:bg-muted text-muted-foreground hover:text-foreground transition"
      >
        <ExternalLink className="h-3.5 w-3.5" />
      </a>
    </span>
  );
};

// ──────────────────────────────────────────────
// Lifecycle actions (inline — no popups, no destructive UI)
// Exposes Freeze / Archive / Restore. Transfer/Delete intentionally absent.
// ──────────────────────────────────────────────
const TRANSITION_LABEL: Record<LifecycleAction, [string, string]> = {
  freeze:  ['active → frozen',  'active → frozen'],
  archive: ['→ archived',       '→ archived'],
  restore: ['→ active',         '→ active'],
  transfer:['→ transferred',    '→ transferred'],
};

const LifecycleActions: React.FC<{
  barcodeId: string;
  status: string;
  onChanged: () => void;
}> = ({ barcodeId, status, onChanged }) => {
  const bi = useBi();
  const [pending, setPending] = useState<LifecycleAction | null>(null);
  const [reason, setReason] = useState('');
  const [targetUserId, setTargetUserId] = useState('');
  const [errMsg, setErrMsg] = useState<string | null>(null);

  const mutation = useMutation({
    mutationFn: async (vars: {
      action: LifecycleAction;
      reason: string;
      targetUserId?: string;
    }) => {
      if (vars.action === 'transfer') {
        return transferBarcodeAdmin(
          barcodeId,
          (vars.targetUserId ?? '').trim(),
          vars.reason || null,
        );
      }
      const fn =
        vars.action === 'freeze'  ? freezeBarcodeAdmin :
        vars.action === 'archive' ? archiveBarcodeAdmin :
                                    restoreBarcodeAdmin;
      return fn(barcodeId, vars.reason || null);
    },
    onSuccess: (res, vars) => {
      const payload = res?.data as { ok?: boolean; error?: string; conflict_barcode_id?: string } | null;
      const msg = mapLifecycleError(payload, res?.error ?? null, bi);
      if (msg) { setErrMsg(msg); toast.error(msg); return; }
      setErrMsg(null);
      setPending(null);
      setReason('');
      setTargetUserId('');
      toast.success(
        vars.action === 'freeze'  ? bi('تم تجميد الرمز', 'Barcode frozen') :
        vars.action === 'archive' ? bi('تمت أرشفة الرمز', 'Barcode archived') :
        vars.action === 'restore' ? bi('تمت استعادة الرمز', 'Barcode restored') :
                                    bi('تم نقل الرمز', 'Barcode transferred'),
      );
      onChanged();
    },
    onError: () => {
      const msg = bi('تعذّر تنفيذ الإجراء.', 'Action failed.');
      setErrMsg(msg);
      toast.error(msg);
    },
  });

  const actions = availableActions(status);
  if (actions.length === 0) {
    return (
      <div className="rounded-md border bg-card/50 px-3 py-2 text-xs text-muted-foreground">
        {bi('لا توجد إجراءات متاحة لهذه الحالة.', 'No lifecycle actions available for this status.')}
      </div>
    );
  }

  const cancel = () => { setPending(null); setReason(''); setTargetUserId(''); setErrMsg(null); };

  const actionMeta: Record<LifecycleAction, { label: string; icon: React.ElementType; tone: string }> = {
    freeze:  { label: bi('تجميد',  'Freeze'),  icon: Pause,     tone: 'text-sky-600' },
    archive: { label: bi('أرشفة',  'Archive'), icon: Archive,   tone: 'text-muted-foreground' },
    restore: { label: bi('استعادة', 'Restore'), icon: RotateCcw, tone: 'text-emerald-600' },
    transfer:{ label: bi('نقل',    'Transfer'),icon: ArrowRightLeft, tone: 'text-amber-600' },
  };

  const isTransfer = pending === 'transfer';
  const trimmedTarget = targetUserId.trim();
  const trimmedReason = reason.trim();
  const transferTargetValid = UUID_RE.test(trimmedTarget);
  const submitDisabled =
    mutation.isPending ||
    (isTransfer && (!transferTargetValid || trimmedReason.length === 0));

  return (
    <div className="rounded-md border bg-card p-3 space-y-3">
      <div className="flex items-center justify-between flex-wrap gap-2">
        <div className="text-xs font-semibold text-muted-foreground flex items-center gap-1.5">
          <Activity className="h-3.5 w-3.5" />
          {bi('إجراءات الحياة (مسؤول فقط)', 'Lifecycle actions (admin only)')}
        </div>
        <div className="flex flex-wrap gap-1.5">
          {actions.map((a) => {
            const meta = actionMeta[a];
            const selected = pending === a;
            return (
              <Button
                key={a}
                size="sm"
                variant={selected ? 'default' : 'outline'}
                onClick={() => { setPending(a); setErrMsg(null); }}
                disabled={mutation.isPending}
                aria-label={meta.label}
              >
                <meta.icon className={cn('h-3.5 w-3.5 me-1.5', meta.tone)} />
                {meta.label}
              </Button>
            );
          })}
        </div>
      </div>

      {pending && (
        <div className="space-y-2 border-t pt-3">
          <div className="flex items-center justify-between flex-wrap gap-2 text-xs">
            <div className="flex items-center gap-2">
              <Badge variant="secondary" className="text-[10px]">{actionMeta[pending].label}</Badge>
              <span className="text-muted-foreground tech-content">
                {status} {TRANSITION_LABEL[pending][0].replace(/^[^→]*→\s*/, '→ ')}
              </span>
            </div>
            <Button size="sm" variant="ghost" onClick={cancel} disabled={mutation.isPending}>
              <X className="h-3.5 w-3.5 me-1" />
              {bi('إلغاء', 'Cancel')}
            </Button>
          </div>

          {isTransfer && (
            <>
              <div className="rounded-md border border-amber-500/30 bg-amber-500/5 px-2.5 py-2 text-[11px] text-amber-700 dark:text-amber-400">
                {bi(
                  'سيصبح هذا الرمز غير متاح للعامة بعد النقل. يجب إصدار رمز جديد للمالك الجديد عند الحاجة.',
                  'This code will become unavailable publicly after transfer. Issue a new code for the new owner if needed.',
                )}
              </div>
              <TransferUserPicker
                selectedUserId={targetUserId}
                onSelect={(uid) => setTargetUserId(uid)}
                disabled={mutation.isPending}
              />
            </>
          )}

          <Input
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            placeholder={
              isTransfer
                ? bi('سبب النقل', 'Transfer reason')
                : bi('سبب الإجراء', 'Reason for action')
            }
            dir="auto"
            className="h-9"
            aria-label={
              isTransfer
                ? bi('سبب النقل', 'Transfer reason')
                : bi('سبب الإجراء', 'Reason for action')
            }
            disabled={mutation.isPending}
          />
          {errMsg && (
            <div className="text-xs text-destructive">{errMsg}</div>
          )}
          <div className="flex justify-end gap-2">
            <Button
              size="sm"
              onClick={() => mutation.mutate({
                action: pending,
                reason,
                targetUserId: isTransfer ? trimmedTarget : undefined,
              })}
              disabled={submitDisabled}
            >
              {mutation.isPending
                ? bi('جارٍ التنفيذ…', 'Working…')
                : bi('تأكيد', 'Confirm')}
            </Button>
          </div>
        </div>
      )}
    </div>
  );
};

// ──────────────────────────────────────────────
// Detail panel (inline — no popups per project rules)
// ──────────────────────────────────────────────
const DetailPanel: React.FC<{ barcodeId: string; onClose: () => void }> = ({ barcodeId, onClose }) => {
  const bi = useBi();
  const { isRTL } = useLanguage();
  const queryClient = useQueryClient();

  const { data, isLoading, isError, refetch } = useQuery({
    queryKey: ['admin-barcode-detail', barcodeId],
    queryFn: () => getBarcodeRegistryRecordById(barcodeId),
    staleTime: 30_000,
  });

  if (isLoading) {
    return <div className="p-6 text-sm text-muted-foreground">{bi('جارٍ التحميل…', 'Loading…')}</div>;
  }
  if (isError || !data?.barcode) {
    return (
      <div className="p-6 text-sm text-destructive flex items-center justify-between">
        <span>{bi('تعذر تحميل التفاصيل', 'Failed to load details')}</span>
        <Button size="sm" variant="outline" onClick={() => refetch()}>{bi('إعادة', 'Retry')}</Button>
      </div>
    );
  }

  const b = data.barcode;
  const sv = statusVariant(b.status);

  const invalidateAll = () => {
    queryClient.invalidateQueries({ queryKey: ['admin-barcode-detail', barcodeId] });
    queryClient.invalidateQueries({ queryKey: ['admin-barcode-list'] });
    queryClient.invalidateQueries({ queryKey: ['admin-barcode-summary'] });
  };

  return (
    <div className="p-5 space-y-5 bg-muted/20 border-t">
      <div className="flex items-start justify-between gap-3 flex-wrap">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <QrCode className="h-4 w-4 text-primary" />
            <span className="text-sm font-mono tech-content font-semibold">{b.barcode_code}</span>
            <Badge className={cn('text-[10px] border', sv.cls)} variant="outline">
              <sv.icon className="h-3 w-3 me-1 inline" />{b.status}
            </Badge>
            <Badge variant="outline" className="text-[10px]">{b.visibility}</Badge>
            <Badge variant="secondary" className="text-[10px]">{b.entity_type}</Badge>
          </div>
          <div className="text-sm">{b.entity_label || '—'}</div>
          <div className="text-xs text-muted-foreground">
            {b.owner_business_label || b.owner_label || ''}
          </div>
        </div>
        <Button size="sm" variant="ghost" onClick={onClose}>{bi('إغلاق', 'Close')}</Button>
      </div>

      {/* Reusable barcode widget — QR + copy/download/print */}
      <BarcodeWidget
        barcodeCode={b.barcode_code}
        entityType={b.entity_type}
        subtitle={b.entity_label || undefined}
        size="md"
      />

      {/* Lifecycle actions (admin-only RPCs) */}
      <LifecycleActions
        barcodeId={barcodeId}
        status={b.status}
        onChanged={invalidateAll}
      />

      {/* Stats strip */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-2 text-xs">
        <div className="rounded-md bg-card p-2 border">
          <div className="text-muted-foreground">{bi('عدد المسحات', 'Scans')}</div>
          <div className="font-semibold tech-content">{b.scan_count}</div>
        </div>
        <div className="rounded-md bg-card p-2 border">
          <div className="text-muted-foreground">{bi('آخر مسح', 'Last scan')}</div>
          <div className="font-semibold tech-content">{fmtDate(b.last_scanned_at, isRTL)}</div>
        </div>
        <div className="rounded-md bg-card p-2 border">
          <div className="text-muted-foreground">{bi('الروابط', 'Links')}</div>
          <div className="font-semibold tech-content">{data.counts.links_count}</div>
        </div>
        <div className="rounded-md bg-card p-2 border">
          <div className="text-muted-foreground">{bi('الأحداث', 'Events')}</div>
          <div className="font-semibold tech-content">{data.counts.events_count}</div>
        </div>
      </div>

      {/* Linked entities */}
      <div>
        <div className="text-xs font-semibold text-muted-foreground mb-2 flex items-center gap-1.5">
          <Link2 className="h-3.5 w-3.5" />
          {bi('الكيانات المرتبطة', 'Linked entities')}
        </div>
        {data.links.length === 0 ? (
          <div className="text-xs text-muted-foreground">{bi('لا توجد روابط', 'No links')}</div>
        ) : (
          <div className="space-y-1">
            {data.links.map((l) => (
              <div key={l.id} className="flex items-center justify-between text-xs rounded-md border bg-card px-2 py-1.5">
                <div className="flex items-center gap-2 min-w-0">
                  <Badge variant="secondary" className="text-[10px]">{l.linked_entity_type}</Badge>
                  <span className="truncate">{l.label || l.linked_entity_id}</span>
                </div>
                <Badge variant="outline" className="text-[10px]">{l.relationship_type}</Badge>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Recent events */}
      <div>
        <div className="text-xs font-semibold text-muted-foreground mb-2 flex items-center gap-1.5">
          <Activity className="h-3.5 w-3.5" />
          {bi('آخر الأحداث', 'Recent events')}
        </div>
        {data.events.length === 0 ? (
          <div className="text-xs text-muted-foreground">{bi('لا توجد أحداث', 'No events')}</div>
        ) : (
          <div className="space-y-1 max-h-[320px] overflow-auto">
            {data.events.map((e) => (
              <div key={e.id} className="flex items-center justify-between text-xs rounded-md border bg-card px-2 py-1.5">
                <div className="flex items-center gap-2 min-w-0">
                  <Badge variant="outline" className="text-[10px]">{e.event_type}</Badge>
                  {e.actor_role && <span className="text-muted-foreground">{e.actor_role}</span>}
                  {e.metadata_safe?.source && (
                    <span className="text-muted-foreground truncate">· {e.metadata_safe.source}</span>
                  )}
                </div>
                <span className="text-muted-foreground tech-content shrink-0">{fmtDate(e.created_at, isRTL)}</span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

// ──────────────────────────────────────────────
// Main page
// ──────────────────────────────────────────────
const AdminBarcodeRegistry: React.FC = () => {
  useNoIndex();
  const bi = useBi();
  const { isRTL } = useLanguage();

  const [search, setSearch] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [entityType, setEntityType] = useState<string>('all');
  const [status, setStatus] = useState<string>('all');
  const [visibility, setVisibility] = useState<string>('all');
  const [pageSize, setPageSize] = useState<number>(50);
  const [page, setPage] = useState(0);
  const [expandedId, setExpandedId] = useState<string | null>(null);

  useEffect(() => {
    const t = setTimeout(() => { setDebouncedSearch(search); setPage(0); }, 300);
    return () => clearTimeout(t);
  }, [search]);

  useEffect(() => { setPage(0); }, [entityType, status, visibility, pageSize]);

  const summaryQ = useQuery({
    queryKey: ['admin-barcode-summary'],
    queryFn: () => getBarcodeRegistrySummary(),
    staleTime: 60_000,
  });

  const listQ = useQuery({
    queryKey: ['admin-barcode-list', debouncedSearch, entityType, status, visibility, page, pageSize],
    queryFn: () => listBarcodeRegistryRecords({
      search: debouncedSearch || null,
      entityType: entityType === 'all' ? null : entityType,
      status: status === 'all' ? null : status,
      visibility: visibility === 'all' ? null : visibility,
      limit: pageSize,
      offset: page * pageSize,
    }),
    placeholderData: keepPreviousData,
    staleTime: 30_000,
  });

  const summary = summaryQ.data;
  const rows = listQ.data?.rows ?? [];
  const total = listQ.data?.total ?? 0;
  const totalPages = Math.max(1, Math.ceil(total / pageSize));

  const entityTypeChips = useMemo(() => {
    if (!summary?.by_entity_type) return [];
    return Object.entries(summary.by_entity_type).sort((a, b) => Number(b[1]) - Number(a[1]));
  }, [summary]);

  const filtersActive = !!debouncedSearch || entityType !== 'all' || status !== 'all' || visibility !== 'all';
  const clearFilters = () => {
    setSearch('');
    setEntityType('all');
    setStatus('all');
    setVisibility('all');
    setPage(0);
  };

  return (
    <DashboardLayout>
      <div className="space-y-5 p-4 md:p-6">
        {/* Header */}
        <div className="flex items-start justify-between flex-wrap gap-3">
          <div>
            <h1 className="text-2xl font-bold flex items-center gap-2">
              <QrCode className="h-6 w-6 text-primary" />
              {bi('سجل الباركود', 'Barcode Registry')}
            </h1>
            <p className="text-sm text-muted-foreground mt-1">
              {bi(
                'إدارة وتتبع روابط الباركود ورموز التحقق المرتبطة بالمنشآت والخدمات.',
                'Manage and track barcode and verification links connected to businesses and services.'
              )}
            </p>
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={() => { summaryQ.refetch(); listQ.refetch(); }}
            disabled={summaryQ.isFetching || listQ.isFetching}
          >
            <RefreshCw className={cn('h-4 w-4 me-1.5', (summaryQ.isFetching || listQ.isFetching) && 'animate-spin')} />
            {bi('تحديث', 'Refresh')}
          </Button>
        </div>

        {/* KPIs */}
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
          <KpiCard label={bi('الإجمالي', 'Total')} value={summary?.total ?? '—'} icon={Hash} tone="text-primary" />
          <KpiCard label={bi('نشط', 'Active')} value={summary?.active ?? '—'} icon={ShieldCheck} tone="text-emerald-600" />
          <KpiCard label={bi('مجمّد', 'Frozen')} value={summary?.frozen ?? '—'} icon={Snowflake} tone="text-sky-600" />
          <KpiCard label={bi('مؤرشف/ملغى', 'Archived/Revoked')} value={(summary?.archived ?? 0) + (summary?.revoked ?? 0)} icon={Archive} tone="text-muted-foreground" />
          <KpiCard label={bi('إجمالي المسحات', 'Total scans')} value={summary?.total_scans ?? '—'} icon={Zap} tone="text-amber-600" />
          <KpiCard label={bi('آخر 7 أيام', 'Last 7 days')} value={summary?.scanned_last_7d ?? '—'} icon={Activity} tone="text-primary" />
        </div>

        {/* Entity type chips */}
        {entityTypeChips.length > 0 && (
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-xs text-muted-foreground">{bi('حسب النوع:', 'By type:')}</span>
            {entityTypeChips.map(([t, c]) => (
              <Badge key={t} variant="secondary" className="text-xs">
                {t}: <span className="ms-1 tech-content font-semibold">{c}</span>
              </Badge>
            ))}
          </div>
        )}

        {/* Filters */}
        <Card>
          <CardContent className="p-4 grid gap-3 md:grid-cols-6">
            <Input
              placeholder={bi('بحث بكود الباركود…', 'Search barcode code…')}
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="md:col-span-2 h-10"
              dir="auto"
              aria-label={bi('بحث بكود الباركود', 'Search barcode code')}
            />
            <Select value={entityType} onValueChange={setEntityType}>
              <SelectTrigger className="h-10"><SelectValue placeholder={bi('النوع', 'Type')} /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">{bi('كل الأنواع', 'All types')}</SelectItem>
                {ENTITY_TYPES.map(t => <SelectItem key={t} value={t}>{t}</SelectItem>)}
              </SelectContent>
            </Select>
            <Select value={status} onValueChange={setStatus}>
              <SelectTrigger className="h-10"><SelectValue placeholder={bi('الحالة', 'Status')} /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">{bi('كل الحالات', 'All statuses')}</SelectItem>
                {STATUSES.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}
              </SelectContent>
            </Select>
            <Select value={visibility} onValueChange={setVisibility}>
              <SelectTrigger className="h-10"><SelectValue placeholder={bi('الظهور', 'Visibility')} /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">{bi('كل', 'All')}</SelectItem>
                {VISIBILITIES.map(v => <SelectItem key={v} value={v}>{v}</SelectItem>)}
              </SelectContent>
            </Select>
            <Button
              variant="outline"
              size="sm"
              onClick={clearFilters}
              disabled={!filtersActive}
              className="h-10"
              aria-label={bi('مسح عوامل التصفية', 'Clear filters')}
            >
              <FilterX className="h-4 w-4 me-1.5" />
              {bi('مسح', 'Clear')}
            </Button>
          </CardContent>
        </Card>

        {/* Table */}
        <Card>
          <CardContent className="p-0 overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-muted/40 text-xs text-muted-foreground">
                <tr>
                  <th className="text-start px-3 py-2 font-medium">{bi('الكود', 'Code')}</th>
                  <th className="text-start px-3 py-2 font-medium">{bi('النوع', 'Type')}</th>
                  <th className="text-start px-3 py-2 font-medium">{bi('الكيان', 'Entity')}</th>
                  <th className="text-start px-3 py-2 font-medium">{bi('المالك', 'Owner')}</th>
                  <th className="text-start px-3 py-2 font-medium">{bi('الحالة', 'Status')}</th>
                  <th className="text-start px-3 py-2 font-medium">{bi('الظهور', 'Visibility')}</th>
                  <th className="text-end px-3 py-2 font-medium">{bi('المسحات', 'Scans')}</th>
                  <th className="text-start px-3 py-2 font-medium">{bi('آخر مسح', 'Last scan')}</th>
                  <th className="text-start px-3 py-2 font-medium">{bi('أُنشئ في', 'Created')}</th>
                  <th className="text-center px-3 py-2 font-medium w-12"></th>
                </tr>
              </thead>
              <tbody>
                {listQ.isLoading && (
                  <tr><td colSpan={10} className="px-3 py-8 text-center text-muted-foreground">{bi('جارٍ التحميل…', 'Loading…')}</td></tr>
                )}
                {listQ.isError && (
                  <tr>
                    <td colSpan={10} className="px-3 py-8 text-center">
                      <div className="text-destructive mb-2">{bi('تعذّر تحميل السجلات', 'Failed to load records')}</div>
                      <Button size="sm" variant="outline" onClick={() => listQ.refetch()}>
                        <RefreshCw className="h-3.5 w-3.5 me-1.5" />
                        {bi('إعادة المحاولة', 'Retry')}
                      </Button>
                    </td>
                  </tr>
                )}
                {!listQ.isLoading && rows.length === 0 && !listQ.isError && (
                  <tr>
                    <td colSpan={10} className="px-3 py-8 text-center text-muted-foreground">
                      {filtersActive
                        ? bi('لا توجد نتائج تطابق عوامل التصفية', 'No results match the current filters')
                        : bi('لا توجد رموز باركود حتى الآن.', 'No barcode records yet.')}
                    </td>
                  </tr>
                )}
                {rows.map((r) => {
                  const sv = statusVariant(r.status);
                  const VIcon = visibilityIcon(r.visibility);
                  const expanded = expandedId === r.barcode_id;
                  return (
                    <React.Fragment key={r.barcode_id}>
                      <tr
                        className={cn('border-t hover:bg-muted/30 cursor-pointer transition', expanded && 'bg-muted/40')}
                        onClick={() => setExpandedId(expanded ? null : r.barcode_id)}
                      >
                        <td className="px-3 py-2">
                          <div className="flex items-center gap-1.5">
                            <CopyCode code={r.barcode_code} />
                            <PublicLinkActions code={r.barcode_code} />
                          </div>
                        </td>
                        <td className="px-3 py-2"><Badge variant="secondary" className="text-[10px]">{r.entity_type}</Badge></td>
                        <td className="px-3 py-2 max-w-[220px] truncate">{r.entity_label || '—'}</td>
                        <td className="px-3 py-2 max-w-[200px] truncate text-muted-foreground">
                          {r.owner_business_label || r.owner_label || '—'}
                        </td>
                        <td className="px-3 py-2">
                          <Badge className={cn('text-[10px] border', sv.cls)} variant="outline">
                            <sv.icon className="h-3 w-3 me-1 inline" />{r.status}
                          </Badge>
                        </td>
                        <td className="px-3 py-2">
                          <span className="inline-flex items-center gap-1 text-xs text-muted-foreground">
                            <VIcon className="h-3.5 w-3.5" />{r.visibility}
                          </span>
                        </td>
                        <td className="px-3 py-2 text-end font-semibold tech-content">{r.scan_count}</td>
                        <td className="px-3 py-2 text-xs text-muted-foreground tech-content">{fmtDate(r.last_scanned_at, isRTL)}</td>
                        <td className="px-3 py-2 text-xs text-muted-foreground tech-content">{fmtDate(r.created_at, isRTL)}</td>
                        <td className="px-3 py-2 text-center">
                          {expanded ? <ChevronUp className="h-4 w-4 inline opacity-70" /> : <ChevronDown className="h-4 w-4 inline opacity-70" />}
                        </td>
                      </tr>
                      {expanded && (
                        <tr>
                          <td colSpan={10} className="p-0">
                            <DetailPanel barcodeId={r.barcode_id} onClose={() => setExpandedId(null)} />
                          </td>
                        </tr>
                      )}
                    </React.Fragment>
                  );
                })}
              </tbody>
            </table>
          </CardContent>
        </Card>

        {/* Pagination */}
        <div className="flex flex-wrap items-center justify-between gap-3 text-sm">
          <div className="text-muted-foreground">
            {bi('إجمالي', 'Total')}: <span className="font-semibold tech-content">{total}</span>
            {' · '}
            {bi('صفحة', 'Page')} <span className="tech-content">{page + 1}</span>/<span className="tech-content">{totalPages}</span>
          </div>
          <div className="flex items-center gap-2">
            <Select value={String(pageSize)} onValueChange={(v) => setPageSize(Number(v))}>
              <SelectTrigger className="h-9 w-24"><SelectValue /></SelectTrigger>
              <SelectContent>
                {PAGE_SIZES.map(s => <SelectItem key={s} value={String(s)}>{s} / {bi('صفحة', 'page')}</SelectItem>)}
              </SelectContent>
            </Select>
            <Button size="sm" variant="outline" onClick={() => setPage(p => Math.max(0, p - 1))} disabled={page === 0}>
              {bi('السابق', 'Prev')}
            </Button>
            <Button size="sm" variant="outline" onClick={() => setPage(p => Math.min(totalPages - 1, p + 1))} disabled={page >= totalPages - 1}>
              {bi('التالي', 'Next')}
            </Button>
          </div>
        </div>

        {/* Top scanned */}
        {summary?.top_scanned && summary.top_scanned.length > 0 && (
          <Card>
            <CardContent className="p-4">
              <div className="text-sm font-semibold mb-3 flex items-center gap-2">
                <Zap className="h-4 w-4 text-amber-500" />
                {bi('الأكثر مسحاً', 'Top scanned')}
              </div>
              <div className="grid gap-2 md:grid-cols-2">
                {summary.top_scanned.map((t) => (
                  <div key={t.barcode_code} className="flex items-center justify-between rounded-md border bg-card px-3 py-2 text-xs">
                    <div className="flex items-center gap-2 min-w-0">
                      <Badge variant="secondary" className="text-[10px]">{t.entity_type}</Badge>
                      <span className="font-mono tech-content truncate">{t.barcode_code}</span>
                    </div>
                    <span className="font-semibold tech-content">{t.scan_count}</span>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </DashboardLayout>
  );
};

export default AdminBarcodeRegistry;