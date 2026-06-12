// GOOGLE-INTEGRATION-GOVERNANCE-AUDIT-1
import { supabase } from "@/integrations/supabase/client";
import type { LatLng } from "./types";

export type TravelMode = "DRIVE" | "WALK" | "BICYCLE" | "TWO_WHEELER";

export async function computeRoute(origin: LatLng, destination: LatLng, travelMode: TravelMode = "DRIVE") {
  return supabase.functions.invoke("google-routes", {
    body: { op: "computeRoutes", origin, destination, travelMode },
  });
}

export async function computeRouteMatrix(origins: LatLng[], destinations: LatLng[], travelMode: TravelMode = "DRIVE") {
  return supabase.functions.invoke("google-routes", {
    body: { op: "computeRouteMatrix", origins, destinations, travelMode },
  });
}