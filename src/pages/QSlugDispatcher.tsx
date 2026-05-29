/**
 * APP-STABILITY-CLEANUP-SECURITY-1
 *
 * Tiny dispatcher for `/q/:code`. Two distinct public flows previously
 * collided on the same path:
 *  - `/q/:refId?t=<token>` → tokenized quotation viewer (BUSINESS-WORKFLOW-5D).
 *  - `/q/:barcode_code`    → public barcode resolver (Phase 3).
 *
 * React Router picks the first matching `<Route>`, which silently shadowed
 * the barcode resolver. This dispatcher disambiguates by presence of `?t=`.
 *
 * Pure routing decision — no data access, no logging.
 */
import React, { Suspense, lazy } from 'react';
import { useSearchParams } from 'react-router-dom';

const QuotationViewer = lazy(() => import('./QuotationViewer'));
const PublicBarcodeResolve = lazy(() => import('./PublicBarcodeResolve'));

const QSlugDispatcher: React.FC = () => {
  const [params] = useSearchParams();
  const hasToken = (params.get('t') ?? '').length > 0;
  return (
    <Suspense fallback={null}>
      {hasToken ? <QuotationViewer /> : <PublicBarcodeResolve />}
    </Suspense>
  );
};

export default QSlugDispatcher;