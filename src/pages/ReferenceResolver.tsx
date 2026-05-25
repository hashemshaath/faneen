/**
 * BM-REF-REBUILD-1 — Step F
 * Universal reference resolver route: /r/:refId
 *
 * Reads a human-readable reference ID from the URL, calls the unified
 * lookupByReference service (which wraps the SECURITY DEFINER RPC
 * public.lookup_by_reference) and redirects to the canonical internal
 * route for the resolved entity. Server + RLS remain authoritative.
 *
 * Safety:
 *  - Never accepts raw UUIDs or invitation tokens as the URL ref.
 *  - Never renders raw UUIDs, tokens, emails, phones, or synthetic
 *    identifiers as primary labels.
 *  - Does not call supabase.* directly — only uses the existing
 *    service-layer wrapper from Step C.
 */
import { useEffect, useMemo, useState } from 'react';
import { Navigate, useParams } from 'react-router-dom';
import { Loader2 } from 'lucide-react';
import {
  lookupByReference,
  type ReferenceLookupRow,
} from '@/modules/reference';

// Strict shape: 2–6 uppercase letters, hyphen, then alphanumerics/hyphens.
// Total length capped so opaque tokens (typically very long) are rejected.
const SAFE_REF_PATTERN = /^[A-Z]{2,6}-[A-Za-z0-9]+(?:-[A-Za-z0-9]+)*$/;
const UUID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

function isSafeRef(value: string | undefined): value is string {
  if (!value) return false;
  if (value.length > 48) return false;
  if (UUID_PATTERN.test(value)) return false;
  return SAFE_REF_PATTERN.test(value);
}

function routeForRow(row: ReferenceLookupRow): string | null {
  // Prefer the server-provided canonical route when present.
  if (row.canonical_route && row.canonical_route.startsWith('/')) {
    return row.canonical_route;
  }
  // Narrow, explicit fallback mapping to existing internal routes.
  switch (row.entity_type) {
    case 'lead':
    case 'provider_lead_request':
      return `/dashboard/provider/leads/${row.id}`;
    case 'quote':
    case 'quote_request':
      return `/dashboard/my-requests/${row.id}`;
    case 'booking':
      return `/dashboard/bookings`;
    case 'contract':
      return `/contracts/${row.id}`;
    case 'business':
      return null; // requires username — leave to server canonical_route
    case 'staff_invitation':
      return `/dashboard/business-edit`;
    default:
      return null;
  }
}

type ResolveState =
  | { status: 'invalid' }
  | { status: 'loading' }
  | { status: 'not_found' }
  | { status: 'redirect'; to: string }
  | { status: 'error' };

export default function ReferenceResolver() {
  const { refId } = useParams<{ refId: string }>();
  const safeRef = useMemo(() => (isSafeRef(refId) ? refId : null), [refId]);
  const [state, setState] = useState<ResolveState>(() =>
    safeRef ? { status: 'loading' } : { status: 'invalid' },
  );

  useEffect(() => {
    if (!safeRef) {
      setState({ status: 'invalid' });
      return;
    }
    let cancelled = false;
    setState({ status: 'loading' });
    (async () => {
      const { data, error } = await lookupByReference({ reference: safeRef });
      if (cancelled) return;
      if (error) {
        setState({ status: 'error' });
        return;
      }
      const row = data?.[0];
      if (!row) {
        setState({ status: 'not_found' });
        return;
      }
      const to = routeForRow(row);
      if (!to) {
        setState({ status: 'not_found' });
        return;
      }
      setState({ status: 'redirect', to });
    })();
    return () => {
      cancelled = true;
    };
  }, [safeRef]);

  if (state.status === 'redirect') {
    return <Navigate to={state.to} replace />;
  }

  const displayRef = safeRef ?? '';

  return (
    <main
      role="main"
      className="min-h-[60vh] flex items-center justify-center px-6 py-16"
    >
      <div className="max-w-md w-full text-center space-y-4">
        {state.status === 'loading' && (
          <>
            <Loader2 className="mx-auto h-6 w-6 animate-spin text-muted-foreground" />
            <h1 className="text-lg font-semibold">Resolving reference…</h1>
            {displayRef && (
              <p className="tech-content text-sm text-muted-foreground">
                {displayRef}
              </p>
            )}
          </>
        )}
        {state.status === 'invalid' && (
          <>
            <h1 className="text-lg font-semibold">Invalid reference</h1>
            <p className="text-sm text-muted-foreground">
              The reference ID is not in a recognized format.
            </p>
          </>
        )}
        {state.status === 'not_found' && (
          <>
            <h1 className="text-lg font-semibold">Reference not found</h1>
            {displayRef && (
              <p className="tech-content text-sm text-muted-foreground">
                {displayRef}
              </p>
            )}
          </>
        )}
        {state.status === 'error' && (
          <>
            <h1 className="text-lg font-semibold">Reference not found</h1>
            <p className="text-sm text-muted-foreground">
              We could not resolve this reference right now.
            </p>
          </>
        )}
      </div>
    </main>
  );
}