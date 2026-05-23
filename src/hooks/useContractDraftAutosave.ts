/**
 * Phase 4E.3 — Client autosave for existing draft contracts only.
 *
 * Hard rules:
 *  - Never autosaves before first manual Save Draft (requires contractId).
 *  - Only autosaves when the contract status === 'draft'.
 *  - Strict whitelist of fields. Line items / measurements / payments /
 *    milestones / attachments / invitation state are never autosaved.
 *  - currency_code & total_amount are only autosaved when the contract has
 *    no line items and no measurements (BOQ-driven pricing must not be
 *    silently overwritten).
 *  - Pauses while a manual save or send-for-approval mutation is in flight,
 *    while the tab is hidden, or while the browser reports offline.
 *  - No toasts. Status is reported via the returned `state` for inline UI.
 */
import { useEffect, useRef, useState, useCallback } from 'react';
import { updateContractDraftAutosave } from '@/modules/contracts/services/updateContractDraftAutosave';
import type { ContractForm } from '@/components/contracts/dashboard/create/contract-form-types';

export type AutosaveState =
  | 'disabled_unsaved'
  | 'idle'
  | 'pending'
  | 'saved'
  | 'error'
  | 'stale'
  | 'paused';

export interface UseContractDraftAutosaveArgs {
  contractId: string | null;
  /** Caller-side gate: edit mode + status==='draft' + create section visible. */
  enabled: boolean;
  form: ContractForm;
  initialUpdatedAt: string | null;
  hasLineItems: boolean;
  hasMeasurements: boolean;
  isManualSavePending: boolean;
  isSendForApprovalPending: boolean;
  onAutosaved?: (updatedAt: string) => void;
}

export interface UseContractDraftAutosaveResult {
  state: AutosaveState;
  lastSavedAt: string | null;
}

const DEBOUNCE_MS = 4000;

type Patch = Record<string, string | number | boolean | null>;

function buildPatch(form: ContractForm, hasLineItems: boolean, hasMeasurements: boolean): Patch {
  const numOrNull = (v: string): number | null => {
    if (v === '' || v == null) return null;
    const n = Number(v);
    return Number.isFinite(n) ? n : null;
  };
  const strOrNull = (v: string) => (v && v.length > 0 ? v : null);

  const patch: Patch = {
    title_ar: strOrNull(form.title_ar) ?? '',
    title_en: strOrNull(form.title_en),
    description_ar: strOrNull(form.description_ar),
    description_en: strOrNull(form.description_en),
    start_date: strOrNull(form.start_date),
    end_date: strOrNull(form.end_date),
    terms_ar: strOrNull(form.terms_ar),
    terms_en: strOrNull(form.terms_en),
    supervisor_name: strOrNull(form.supervisor_name),
    supervisor_phone: strOrNull(form.supervisor_phone),
    supervisor_email: strOrNull(form.supervisor_email),
    vat_inclusive: !!form.vat_inclusive,
    vat_rate: numOrNull(form.vat_rate) ?? 0,
  };

  // Only autosave currency/total when no BOQ-style data exists.
  if (!hasLineItems && !hasMeasurements) {
    if (form.currency_code) patch.currency_code = form.currency_code;
    const t = numOrNull(form.total_amount);
    if (t != null) patch.total_amount = t;
  }

  return patch;
}

function stableStringify(p: Patch): string {
  return JSON.stringify(Object.keys(p).sort().reduce<Patch>((acc, k) => {
    acc[k] = p[k];
    return acc;
  }, {}));
}

export function useContractDraftAutosave(args: UseContractDraftAutosaveArgs): UseContractDraftAutosaveResult {
  const {
    contractId, enabled, form, initialUpdatedAt,
    hasLineItems, hasMeasurements,
    isManualSavePending, isSendForApprovalPending,
    onAutosaved,
  } = args;

  const [state, setState] = useState<AutosaveState>('disabled_unsaved');
  const [lastSavedAt, setLastSavedAt] = useState<string | null>(initialUpdatedAt);

  const expectedUpdatedAtRef = useRef<string | null>(initialUpdatedAt);
  const lastSentSerializedRef = useRef<string | null>(null);
  const baselineCapturedForRef = useRef<string | null>(null);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const inflightRef = useRef<{ aborted: boolean } | null>(null);
  const hardStopRef = useRef(false);
  const mountedRef = useRef(true);

  // Reset baselines when switching contract.
  useEffect(() => {
    expectedUpdatedAtRef.current = initialUpdatedAt;
    setLastSavedAt(initialUpdatedAt);
    if (contractId && baselineCapturedForRef.current !== contractId) {
      // Capture current form snapshot so first autosave only fires after a real change.
      lastSentSerializedRef.current = stableStringify(buildPatch(form, hasLineItems, hasMeasurements));
      baselineCapturedForRef.current = contractId;
      hardStopRef.current = false;
    }
    if (!contractId) {
      lastSentSerializedRef.current = null;
      baselineCapturedForRef.current = null;
      hardStopRef.current = false;
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [contractId, initialUpdatedAt]);

  useEffect(() => () => {
    mountedRef.current = false;
    if (timerRef.current) clearTimeout(timerRef.current);
    if (inflightRef.current) inflightRef.current.aborted = true;
  }, []);

  const runAutosave = useCallback(async () => {
    if (!contractId || hardStopRef.current) return;
    const patch = buildPatch(form, hasLineItems, hasMeasurements);
    const serialized = stableStringify(patch);
    if (serialized === lastSentSerializedRef.current) return;

    setState('pending');
    const token = { aborted: false };
    inflightRef.current = token;
    try {
      const { data, error } = await updateContractDraftAutosave({
        _contract_id: contractId,
        _patch: patch as unknown as never,
        _expected_updated_at: expectedUpdatedAtRef.current ?? undefined,
      });
      if (token.aborted || !mountedRef.current) return;
      if (error) {
        const msg = error.message || '';
        if (msg.includes('CONTRACT_AUTOSAVE:STALE_VERSION')) {
          hardStopRef.current = true;
          setState('stale');
          return;
        }
        if (msg.includes('CONTRACT_AUTOSAVE:NOT_DRAFT')) {
          hardStopRef.current = true;
          setState('paused'); // outer enabled gate will switch to disabled too
          return;
        }
        if (msg.includes('CONTRACT_AUTOSAVE:FIELD_NOT_ALLOWED')) {
          hardStopRef.current = true;
          setState('error');
          return;
        }
        setState('error');
        return;
      }
      const result = (data ?? {}) as { updated_at?: string; autosaved?: boolean };
      const newUpdatedAt = result.updated_at ?? null;
      lastSentSerializedRef.current = serialized;
      if (newUpdatedAt) {
        expectedUpdatedAtRef.current = newUpdatedAt;
        setLastSavedAt(newUpdatedAt);
        onAutosaved?.(newUpdatedAt);
      }
      setState('saved');
    } catch {
      if (!token.aborted && mountedRef.current) setState('error');
    } finally {
      if (inflightRef.current === token) inflightRef.current = null;
    }
  }, [contractId, form, hasLineItems, hasMeasurements, onAutosaved]);

  // Main scheduler.
  useEffect(() => {
    if (!contractId) {
      setState('disabled_unsaved');
      return;
    }
    if (!enabled) {
      setState('paused');
      return;
    }
    if (hardStopRef.current) return;
    if (isManualSavePending || isSendForApprovalPending) {
      setState('paused');
      return;
    }
    if (typeof document !== 'undefined' && document.visibilityState === 'hidden') {
      setState('paused');
      return;
    }
    if (typeof navigator !== 'undefined' && navigator.onLine === false) {
      setState('paused');
      return;
    }

    const patch = buildPatch(form, hasLineItems, hasMeasurements);
    const serialized = stableStringify(patch);
    if (serialized === lastSentSerializedRef.current) {
      // No changes since last save → idle.
      setState((prev) => (prev === 'saved' ? 'saved' : 'idle'));
      return;
    }

    setState('idle');
    if (timerRef.current) clearTimeout(timerRef.current);
    timerRef.current = setTimeout(() => {
      void runAutosave();
    }, DEBOUNCE_MS);

    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, [contractId, enabled, form, hasLineItems, hasMeasurements, isManualSavePending, isSendForApprovalPending, runAutosave]);

  // React to visibility / online changes by re-running scheduler.
  const [, forceTick] = useState(0);
  useEffect(() => {
    const onVis = () => forceTick((n) => n + 1);
    const onOnline = () => forceTick((n) => n + 1);
    if (typeof document !== 'undefined') document.addEventListener('visibilitychange', onVis);
    if (typeof window !== 'undefined') {
      window.addEventListener('online', onOnline);
      window.addEventListener('offline', onOnline);
    }
    return () => {
      if (typeof document !== 'undefined') document.removeEventListener('visibilitychange', onVis);
      if (typeof window !== 'undefined') {
        window.removeEventListener('online', onOnline);
        window.removeEventListener('offline', onOnline);
      }
    };
  }, []);

  return { state, lastSavedAt };
}

export default useContractDraftAutosave;