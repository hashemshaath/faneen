/**
 * MARKETPLACE-CONVERSION-OPTIMIZATION-1 — read-only conversion snapshot.
 *
 * Uses ONLY existing tables. Failures degrade to zero values so the dashboard
 * never blocks. No mutations, no new tracking, no new pipeline tables.
 */
import { supabase } from '@/integrations/supabase/client';

export interface ConversionKpis {
  visitors: number;
  rfq_started: number;
  rfq_submitted: number;
  provider_registrations: number;
  published_providers: number;
  verification_requests: number;
  avg_profile_completion: number;
  publication_rate: number;
}

export interface CompletionBucket {
  bucket: string;
  count: number;
  percent: number;
}

export interface PageStat {
  path: string;
  conversions?: number;
  dropoffs?: number;
}

export interface ConversionSnapshot {
  kpis: ConversionKpis;
  completionBuckets: CompletionBucket[];
  topConversionPages: Array<{ path: string; conversions: number }>;
  topDropoffPages: Array<{ path: string; dropoffs: number }>;
}

const SAFE_ZERO: ConversionKpis = {
  visitors: 0,
  rfq_started: 0,
  rfq_submitted: 0,
  provider_registrations: 0,
  published_providers: 0,
  verification_requests: 0,
  avg_profile_completion: 0,
  publication_rate: 0,
};

async function safeCount(table: string, filter?: (q: ReturnType<typeof buildBase>) => ReturnType<typeof buildBase>): Promise<number> {
  try {
    let q = buildBase(table);
    if (filter) q = filter(q);
    const { count } = await q;
    return count ?? 0;
  } catch {
    return 0;
  }
}

function buildBase(table: string) {
  // Cast to unknown to keep this off the strongly-typed Database union — table
  // existence is tolerated and any failure is swallowed by safeCount.
  return (supabase.from as unknown as (t: string) => {
    select: (cols: string, opts: { count: 'exact'; head: true }) => Promise<{ count: number | null }> & {
      eq: (col: string, val: unknown) => ReturnType<typeof buildBase>;
      gte: (col: string, val: unknown) => ReturnType<typeof buildBase>;
    };
  })(table).select('id', { count: 'exact', head: true });
}

export async function loadConversionSnapshot(): Promise<ConversionSnapshot> {
  const [
    visitors,
    rfqStarted,
    rfqSubmitted,
    providerRegs,
    publishedProviders,
    verificationReqs,
    completion,
  ] = await Promise.all([
    safeCount('provider_landing_metrics'),
    safeCount('rfqs'),
    safeCount('rfqs'),
    safeCount('businesses'),
    safeCount('businesses_public'),
    safeCount('business_verification_requests'),
    loadCompletionBuckets(),
  ]);

  const publication_rate =
    providerRegs > 0 ? Math.round((publishedProviders / providerRegs) * 100) : 0;

  const avg_profile_completion =
    completion.total > 0
      ? Math.round(completion.weightedSum / completion.total)
      : 0;

  return {
    kpis: {
      ...SAFE_ZERO,
      visitors,
      rfq_started: rfqStarted,
      rfq_submitted: rfqSubmitted,
      provider_registrations: providerRegs,
      published_providers: publishedProviders,
      verification_requests: verificationReqs,
      avg_profile_completion,
      publication_rate,
    },
    completionBuckets: completion.buckets,
    topConversionPages: [],
    topDropoffPages: [],
  };
}

async function loadCompletionBuckets(): Promise<{
  buckets: CompletionBucket[];
  total: number;
  weightedSum: number;
}> {
  const ranges: Array<{ bucket: string; min: number; max: number }> = [
    { bucket: '0–25%', min: 0, max: 25 },
    { bucket: '26–50%', min: 26, max: 50 },
    { bucket: '51–75%', min: 51, max: 75 },
    { bucket: '76–99%', min: 76, max: 99 },
    { bucket: '100%', min: 100, max: 100 },
  ];
  try {
    const counts = await Promise.all(
      ranges.map(async (r) => {
        const { count } = await (
          supabase.from as unknown as (t: string) => {
            select: (cols: string, opts: { count: 'exact'; head: true }) => {
              gte: (c: string, v: number) => {
                lte: (c: string, v: number) => Promise<{ count: number | null }>;
              };
            };
          }
        )('businesses')
          .select('id', { count: 'exact', head: true })
          .gte('profile_completeness', r.min)
          .lte('profile_completeness', r.max);
        return count ?? 0;
      }),
    );
    const total = counts.reduce((a, b) => a + b, 0);
    const buckets: CompletionBucket[] = ranges.map((r, i) => ({
      bucket: r.bucket,
      count: counts[i],
      percent: total > 0 ? Math.round((counts[i] / total) * 100) : 0,
    }));
    const midpoints = ranges.map((r) => (r.min + r.max) / 2);
    const weightedSum = counts.reduce((acc, c, i) => acc + c * midpoints[i], 0);
    return { buckets, total, weightedSum };
  } catch {
    return {
      buckets: ranges.map((r) => ({ bucket: r.bucket, count: 0, percent: 0 })),
      total: 0,
      weightedSum: 0,
    };
  }
}