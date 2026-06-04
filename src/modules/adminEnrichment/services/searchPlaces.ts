import { supabase } from "@/integrations/supabase/client";

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
  fallback?: "geocoding";
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
  return data ?? { error: "empty_response", results: [] };
}