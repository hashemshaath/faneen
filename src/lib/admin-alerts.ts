/**
 * Admin-facing alerts: high-signal helpers for surfacing failure causes
 * (upload failures, RLS denials, network issues) into the existing
 * `diagnostics` buffer AND as user-visible toasts.
 *
 * Keeps a deliberately small surface so every call site uses the same
 * vocabulary — `bucket`, `op`, `table` — so the /admin/diagnostics page
 * can group and count occurrences uniformly.
 */
import { toast } from 'sonner';
import { logDiag } from './diagnostics';

export interface SupabaseLikeError {
  message?: string;
  code?: string;
  status?: number;
  details?: string | null;
  hint?: string | null;
  statusCode?: string | number;
}

export type AdminAlertKind = 'upload' | 'rls' | 'network' | 'data';

const RLS_HINTS = [
  'row-level security',
  'row level security',
  'violates row-level security',
  'permission denied',
  'new row violates',
];

export function isRlsError(err: unknown): boolean {
  if (!err) return false;
  const e = err as SupabaseLikeError;
  const msg = (e?.message || '').toLowerCase();
  if (e?.code === '42501' || String(e?.statusCode || '') === '42501') return true;
  return RLS_HINTS.some((h) => msg.includes(h));
}

export function classifyError(err: unknown): AdminAlertKind {
  if (isRlsError(err)) return 'rls';
  const e = err as SupabaseLikeError;
  const msg = (e?.message || '').toLowerCase();
  if (msg.includes('storage') || msg.includes('bucket')) return 'upload';
  if (msg.includes('network') || msg.includes('fetch')) return 'network';
  return 'data';
}

function shortMsg(err: unknown, fallback: string): string {
  if (err instanceof Error) return err.message;
  const e = err as SupabaseLikeError;
  return e?.message || fallback;
}

interface UploadCtx {
  bucket: string;
  path?: string;
  size?: number;
  mime?: string;
}

export function logUploadFailure(ctx: UploadCtx, err: unknown, opts?: { silentToast?: boolean }) {
  const kind = isRlsError(err) ? 'rls' : 'upload';
  const head = `[${kind}] upload failed → ${ctx.bucket}${ctx.path ? '/' + ctx.path : ''}`;
  const detail = [
    `bucket: ${ctx.bucket}`,
    ctx.path ? `path: ${ctx.path}` : '',
    ctx.size != null ? `size: ${ctx.size}B` : '',
    ctx.mime ? `mime: ${ctx.mime}` : '',
    `cause: ${shortMsg(err, 'unknown')}`,
    err instanceof Error && err.stack ? `\n${err.stack}` : '',
  ].filter(Boolean).join(' · ');
  logDiag('error', head, detail);
  if (!opts?.silentToast) {
    const human = kind === 'rls'
      ? `تعذّر الرفع: صلاحيات (RLS) — ${shortMsg(err, '')}`
      : `تعذّر رفع الملف: ${shortMsg(err, '')}`;
    toast.error(human);
  }
}

interface RlsCtx {
  table: string;
  op: 'select' | 'insert' | 'update' | 'delete' | 'rpc';
  rpc?: string;
}

export function logRlsFailure(ctx: RlsCtx, err: unknown, opts?: { silentToast?: boolean }) {
  const head = `[rls] ${ctx.op} denied on ${ctx.table}${ctx.rpc ? ' (' + ctx.rpc + ')' : ''}`;
  const e = err as SupabaseLikeError;
  const detail = [
    `table: ${ctx.table}`,
    `op: ${ctx.op}`,
    ctx.rpc ? `rpc: ${ctx.rpc}` : '',
    e?.code ? `code: ${e.code}` : '',
    e?.hint ? `hint: ${e.hint}` : '',
    `cause: ${shortMsg(err, 'unknown')}`,
  ].filter(Boolean).join(' · ');
  logDiag('error', head, detail);
  if (!opts?.silentToast) {
    toast.error(`صلاحيات غير كافية لتنفيذ ${ctx.op} على ${ctx.table}`);
  }
}

/** Generic helper — auto-classifies and routes to the right logger. */
export function reportSupabaseError(
  scope: { table?: string; bucket?: string; op?: RlsCtx['op']; path?: string },
  err: unknown,
) {
  if (isRlsError(err) && scope.table) {
    logRlsFailure({ table: scope.table, op: scope.op ?? 'select' }, err);
    return;
  }
  if (scope.bucket) {
    logUploadFailure({ bucket: scope.bucket, path: scope.path }, err);
    return;
  }
  logDiag('error', `[supabase] ${shortMsg(err, 'error')}`,
    [scope.table && `table: ${scope.table}`, scope.op && `op: ${scope.op}`].filter(Boolean).join(' · '));
}