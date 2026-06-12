// GOOGLE-INTEGRATION-GOVERNANCE-AUDIT-1
import { supabase } from "@/integrations/supabase/client";

export interface ValidateAddressArgs {
  addressLines: string[];
  regionCode?: string;
  locality?: string;
  administrativeArea?: string;
  postalCode?: string;
  languageCode?: string;
}

export async function validateAddress(args: ValidateAddressArgs) {
  return supabase.functions.invoke("google-address-validation", { body: args });
}