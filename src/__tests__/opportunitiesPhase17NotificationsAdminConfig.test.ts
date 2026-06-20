import { describe, it, expect } from "vitest";
import { readFileSync, existsSync } from "node:fs";
import { resolve } from "node:path";

describe("Opportunities Phase 17 — Admin notifications config + dedup + lifecycle chips", () => {
  it("admin notifications config page exists with role+channel filters", () => {
    const p = resolve("src/pages/admin/AdminNotificationsConfig.tsx");
    expect(existsSync(p)).toBe(true);
    const src = readFileSync(p, "utf8");
    expect(src).toMatch(/notification_event_templates/);
    expect(src).toMatch(/roleFilter/);
    expect(src).toMatch(/channelFilter/);
    expect(src).toMatch(/Switch/);
  });

  it("route /admin/notifications-config is registered behind requireAdmin", () => {
    const app = readFileSync(resolve("src/App.tsx"), "utf8");
    expect(app).toMatch(/AdminNotificationsConfig/);
    expect(app).toMatch(/\/admin\/notifications-config[^"]*"\s+element=\{<ProtectedRoute requireAdmin>/);
  });

  it("dashboard notifications exposes lifecycle quick chips", () => {
    const src = readFileSync(resolve("src/pages/dashboard/DashboardNotifications.tsx"), "utf8");
    expect(src).toMatch(/Lifecycle:/);
    expect(src).toMatch(/opportunity_awarded/);
    expect(src).toMatch(/contract_created/);
  });
});