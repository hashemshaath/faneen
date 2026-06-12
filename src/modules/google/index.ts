// GOOGLE-INTEGRATION-GOVERNANCE-AUDIT-1
// Unified Google services module — single import surface for the whole app.
export * from "./types";
export * as mapsService from "./services/mapsService";
export * as placesService from "./services/placesService";
export * as geocodingService from "./services/geocodingService";
export * as addressValidationService from "./services/addressValidationService";
export * as routesService from "./services/routesService";
export * as healthService from "./services/healthService";
export { fetchGoogleHealth } from "./services/healthService";