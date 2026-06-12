// GOOGLE-INTEGRATION-GOVERNANCE-AUDIT-1
// Thin client wrapper — Places API (New) calls via `google-places` edge fn.
import { supabase } from "@/integrations/supabase/client";
import type { LatLng } from "../types";

export interface PlacesSearchTextArgs {
  textQuery: string;
  fieldMask?: string;
  languageCode?: string;
  maxResultCount?: number;
}

export interface PlacesSearchNearbyArgs {
  location: LatLng & { radius?: number };
  includedTypes?: string[];
  maxResultCount?: number;
  fieldMask?: string;
  languageCode?: string;
}

export interface PlaceDetailsArgs {
  placeId: string;
  fieldMask?: string;
  languageCode?: string;
}

export async function searchText(args: PlacesSearchTextArgs) {
  return supabase.functions.invoke("google-places", { body: { op: "searchText", ...args } });
}

export async function searchNearby(args: PlacesSearchNearbyArgs) {
  return supabase.functions.invoke("google-places", { body: { op: "searchNearby", ...args } });
}

export async function getPlaceDetails(args: PlaceDetailsArgs) {
  return supabase.functions.invoke("google-places", { body: { op: "getDetails", ...args } });
}