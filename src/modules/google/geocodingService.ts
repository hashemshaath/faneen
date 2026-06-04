// GOOGLE-INTEGRATION-GOVERNANCE-AUDIT-1
import { supabase } from "@/integrations/supabase/client";

export async function forwardGeocode(address: string, languageCode = "ar") {
  return supabase.functions.invoke("google-geocoding", { body: { op: "forward", address, languageCode } });
}

export async function reverseGeocode(lat: number, lng: number, languageCode = "ar") {
  return supabase.functions.invoke("google-geocoding", { body: { op: "reverse", lat, lng, languageCode } });
}