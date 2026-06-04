// GOOGLE-INTEGRATION-GOVERNANCE-AUDIT-1
// Unified Google services module — single import surface for the whole app.
export * from "./types";
export * as mapsService from "./mapsService";
export * as placesService from "./placesService";
export * as geocodingService from "./geocodingService";
export * as addressValidationService from "./addressValidationService";
export * as routesService from "./routesService";
export * as healthService from "./healthService";
export { fetchGoogleHealth } from "./healthService";