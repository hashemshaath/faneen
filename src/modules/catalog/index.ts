// Provider Catalog module boundary (CAT-1 scaffold).
//
// This module will own all reads/writes for provider catalog tables:
//   - business_services
//   - business_service_areas
//   - business_branches
//   - business_availability
//   - business_bnpl_providers
//   - bnpl_providers
//   - warranties
//
// Service wrappers will be introduced in phases CAT-2..CAT-5 and locked
// behind a CI guardrail in CAT-6. See ./README.md for the migration plan.
//
// Intentionally exports nothing yet — callsites must continue using the
// existing direct supabase access until the per-domain wrappers land.
export {};