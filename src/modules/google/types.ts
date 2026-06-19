// GOOGLE-INTEGRATION-GOVERNANCE-AUDIT-1
export type GoogleApi = "places" | "geocoding" | "routes" | "address_validation";

export type GoogleAuthIssue =
  | "referrer_restricted"
  | "api_not_enabled"
  | "ip_blocked"
  | "key_invalid"
  | "unauthorized";

export interface GoogleProbe {
  ok: boolean;
  latencyMs: number;
  status: number;
  errorCode: string | null;
  authIssue?: GoogleAuthIssue | null;
  reason?: string | null;
}

export interface GoogleUsageRow {
  api: string;
  ok: number;
  err: number;
  avg_latency_ms: number;
}

export interface GoogleHealthResponse {
  checkedAt: string;
  healthScore: number;
  apis: Record<GoogleApi, GoogleProbe | null>;
  usage: GoogleUsageRow[];
  deferred?: boolean;
  missing?: string[];
}

export interface LatLng { latitude: number; longitude: number }