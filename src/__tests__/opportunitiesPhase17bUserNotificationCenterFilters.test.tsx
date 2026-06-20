import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

const SRC = readFileSync(resolve("src/pages/dashboard/DashboardNotifications.tsx"), "utf8");

describe("Opportunities Phase 17B — user notification center lifecycle chips", () => {
  it("renders lifecycle chips for opportunity events", () => {
    expect(SRC).toMatch(/Lifecycle:/);
    for (const v of ["opportunity_created", "opportunity_bid", "opportunity_awarded", "contract_created", "opportunity_expired"]) {
      expect(SRC).toContain(v);
    }
  });

  it("chips only mutate the existing typeFilter (view-only filter)", () => {
    // The chip handler must call setTypeFilter and nothing else.
    expect(SRC).toMatch(/onClick=\{\(\) => setTypeFilter\(c\.v\)\}/);
  });

  it("preserves existing read/unread + search filters", () => {
    expect(SRC).toMatch(/setReadFilter/);
    expect(SRC).toMatch(/setSearchQuery/);
    expect(SRC).toMatch(/readFilter === 'unread'/);
  });

  it("no new RPC, no service_role, no direct writes from chips", () => {
    // Find the chips block and ensure it contains no mutate/insert/update/RPC tokens.
    const start = SRC.indexOf("Lifecycle quick chips");
    const end = SRC.indexOf("Count */", start);
    const block = SRC.slice(start, end);
    expect(block).not.toMatch(/mutate|insert|update|\.rpc\(|service_role/i);
  });
});