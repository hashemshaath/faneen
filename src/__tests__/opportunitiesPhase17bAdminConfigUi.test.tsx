import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

const APP = readFileSync(resolve("src/App.tsx"), "utf8");
const PAGE = readFileSync(resolve("src/pages/admin/AdminNotificationsConfig.tsx"), "utf8");

describe("Opportunities Phase 17B — Admin config UI guards", () => {
  it("route is gated by ProtectedRoute requireAdmin", () => {
    expect(APP).toMatch(/\/admin\/notifications-config[^"]*"\s+element=\{<ProtectedRoute requireAdmin>/);
  });

  it("shows role, channel, and search filters", () => {
    expect(PAGE).toMatch(/roleFilter/);
    expect(PAGE).toMatch(/channelFilter/);
    expect(PAGE).toMatch(/placeholder=\{isRTL \? "بحث/);
  });

  it("groups rows by event_type", () => {
    expect(PAGE).toMatch(/eventGroups/);
    expect(PAGE).toMatch(/Map<string, Template\[\]>/);
  });

  it("renders inline editors, enable Switch, and Save action", () => {
    expect(PAGE).toMatch(/<Switch checked=\{row\.enabled\}/);
    expect(PAGE).toMatch(/<Textarea/);
    expect(PAGE).toMatch(/Save/);
  });

  it("loading, empty, and error states are present", () => {
    expect(PAGE).toMatch(/isLoading \?/);
    expect(PAGE).toMatch(/No matching templates|لا توجد قوالب مطابقة/);
    expect(PAGE).toMatch(/toast\.error/);
  });

  it("no service_role, no hardcoded admin IDs, no any/suppressions", () => {
    expect(PAGE).not.toMatch(/service_role/i);
    expect(PAGE).not.toMatch(/['"][0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}['"]/);
    expect(PAGE).not.toMatch(/\bas any\b/);
    expect(PAGE).not.toMatch(/:\s*any\b/);
    expect(PAGE).not.toMatch(/@ts-ignore|@ts-expect-error/);
  });
});