import { supabase } from "@/integrations/supabase/client";
import { mapsService } from "@/modules/google";

export interface PlaceCandidate {
  place_id: string;
  name: string | null;
  address: string | null;
  primary_type: string | null;
  types: string[];
  rating: number | null;
  user_rating_count: number | null;
  latitude: number | null;
  longitude: number | null;
  website: string | null;
  phone: string | null;
  maps_url: string | null;
  icon_url: string | null;
  business_status: string | null;
}

export interface SearchPlacesResult {
  ok?: boolean;
  results?: PlaceCandidate[];
  deferred?: boolean;
  missing?: string[];
  error?: string;
  cached?: boolean;
  nextPageToken?: string | null;
  requestId?: string;
  upstreamStatus?: number;
  upstreamMs?: number;
  detail?: string;
  fallback?: "browser_places" | "geocoding";
}

export async function searchPlaces(input: {
  query: string;
  region?: string;
  language?: string;
  pageToken?: string | null;
  pageSize?: number;
  bypassCache?: boolean;
}): Promise<SearchPlacesResult> {
  const { data, error } = await supabase.functions.invoke<SearchPlacesResult>(
    "admin-enrichment-search",
    { body: input },
  );
  if (error) return { error: "request_failed", results: [] };
  const result = data ?? { error: "empty_response", results: [] };
  if (result.error && ["places_api_blocked_for_key", "places_api_disabled", "google_referrer_blocked"].includes(result.error)) {
    const fallback = await mapsService.searchPlacesBrowserFallback({
      query: input.query,
      region: input.region,
      language: input.language,
      pageSize: input.pageSize,
    }).catch((e: unknown) => ({
      results: [] as PlaceCandidate[],
      detail: e instanceof Error ? e.message : "browser_fallback_failed",
    }));
    if (fallback.results.length) {
      return {
        ok: true,
        results: fallback.results,
        nextPageToken: null,
        requestId: result.requestId,
        upstreamStatus: result.upstreamStatus,
        upstreamMs: result.upstreamMs,
        fallback: "browser_places",
        detail: result.detail,
      };
    }
    if (fallback.detail) result.detail = `${result.detail ?? result.error} · browser=${fallback.detail}`;
  }
  return result;
}