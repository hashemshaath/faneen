// Barrel re-export for route-level lazy components. See phase B of the
// audit plan — grouping lives in ./publicRoutes, ./dashboardRoutes and
// ./adminRoutes. No behavior change; App.tsx imports everything from here.
export * from "./publicRoutes";
export * from "./dashboardRoutes";
export * from "./adminRoutes";
