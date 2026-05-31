import { lazy, type ComponentType, type LazyExoticComponent } from 'react';
import { BUILD_ID } from '@/lib/buildVersion';

type LazyModule<P, T extends ComponentType<P>> = { default: T };

const CHUNK_LOAD_ERROR_RE =
  /Importing a module script failed|Failed to fetch dynamically imported module|Loading chunk|ChunkLoadError|error loading dynamically imported module|Module script load failed|Unable to preload CSS/i;

const RECOVERY_KEY = 'qitaat_lazy_chunk_recovery_v2';
const MIN_RELOAD_INTERVAL_MS = 4_000;

const neverResolve = <P, T extends ComponentType<P>>() => new Promise<LazyModule<P, T>>(() => {
  // Keep Suspense active while the browser refreshes stale assets.
});

const getErrorText = (error: unknown): string => {
  if (error instanceof Error) return `${error.name} ${error.message}`;
  if (typeof error === 'string') return error;
  try {
    return JSON.stringify(error);
  } catch {
    return String(error);
  }
};

const isChunkLoadError = (error: unknown): boolean => CHUNK_LOAD_ERROR_RE.test(getErrorText(error));

const readLastRecovery = (): { buildId: string; at: number } | null => {
  try {
    const raw = sessionStorage.getItem(RECOVERY_KEY);
    if (!raw) return null;
    const parsed: unknown = JSON.parse(raw);
    if (!parsed || typeof parsed !== 'object') return null;
    const record = parsed as Record<string, unknown>;
    if (typeof record.buildId !== 'string' || typeof record.at !== 'number') return null;
    return { buildId: record.buildId, at: record.at };
  } catch {
    return null;
  }
};

const writeLastRecovery = () => {
  try {
    sessionStorage.setItem(RECOVERY_KEY, JSON.stringify({ buildId: BUILD_ID, at: Date.now() }));
  } catch {
    // Storage may be unavailable; the reload path still works.
  }
};

const clearLastRecovery = () => {
  try {
    sessionStorage.removeItem(RECOVERY_KEY);
  } catch {
    // Ignore blocked storage.
  }
};

const cacheBustedHref = (): string => {
  const url = new URL(window.location.href);
  url.searchParams.set('_chunk_refresh', String(Date.now()));
  return url.toString();
};

const reloadWithFreshAssets = () => {
  if (typeof window === 'undefined') return;

  const now = Date.now();
  const last = readLastRecovery();
  if (last?.buildId === BUILD_ID && now - last.at < MIN_RELOAD_INTERVAL_MS) return;

  writeLastRecovery();
  window.setTimeout(() => {
    window.location.replace(cacheBustedHref());
  }, 0);
};

export function lazyRetry<P, T extends ComponentType<P>>(
  factory: () => Promise<LazyModule<P, T>>,
): LazyExoticComponent<T> {
  return lazy(() =>
    factory()
      .then((module) => {
        clearLastRecovery();
        return module;
      })
      .catch((error: unknown) => {
        if (!isChunkLoadError(error)) throw error;
        reloadWithFreshAssets();
        return neverResolve<P, T>();
      }),
  );
}