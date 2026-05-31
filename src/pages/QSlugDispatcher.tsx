/**
 * APP-STABILITY-CLEANUP-SECURITY-1
 *
 * Tiny dispatcher for `/q/:code`. Two distinct public flows previously
 * collided on separate `/q/:refId` and `/q/:barcode_code` routes.
 * They are now unified under `/q/:code` and disambiguated by `?t=`.
 *
 * React Router picks the first matching `<Route>`, which silently shadowed
 * the barcode resolver. This dispatcher disambiguates by presence of `?t=`.
 *
 * Pure routing decision — no data access, no logging.
 */
import React, { Suspense } from 'react';
import { useSearchParams } from 'react-router-dom';
import { lazyRetry } from '@/lib/lazyRetry';

const QuotationViewer = lazyRetry(() => import('./QuotationViewer'));
const PublicBarcodeResolve = lazyRetry(() => import('./PublicBarcodeResolve'));

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