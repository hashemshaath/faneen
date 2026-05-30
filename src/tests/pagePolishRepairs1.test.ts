/**
 * PAGE-POLISH-REPAIRS-1 — Page polish invariants for the top-10 pages.
 *
 * These tests assert presentation-layer invariants only. They do NOT
 * exercise data flow or rendering. Routes, RLS, and schema are out of
 * scope and verified by their own dedicated audits.
 */
import { readFileSync, existsSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

const ROOT = resolve(__dirname, "..", "..");
const read = (rel: string) => readFileSync(resolve(ROOT, rel), "utf8");

const TARGET_PAGES: Array<{ label: string; path: string }> = [
  { label: "DashboardOperationsCenter", path: "src/pages/dashboard/DashboardOperationsCenter.tsx" },
  { label: "DashboardWorkOrders", path: "src/pages/dashboard/DashboardWorkOrders.tsx" },
  { label: "DashboardWorkOrderDetail", path: "src/pages/dashboard/DashboardWorkOrderDetail.tsx" },
  { label: "ProductionBoardPage", path: "src/components/ProductionBoardPage.tsx" },
  { label: "DashboardProcurement", path: "src/pages/dashboard/DashboardProcurement.tsx" },
  { label: "DashboardProcurementDetail", path: "src/pages/dashboard/DashboardProcurementDetail.tsx" },
  { label: "DashboardContracts", path: "src/pages/dashboard/DashboardContracts.tsx" },
  { label: "ContractDetail", path: "src/pages/ContractDetail.tsx" },
  { label: "DashboardBusinessEdit", path: "src/pages/dashboard/DashboardBusinessEdit.tsx" },
  { label: "AdminProviderReview", path: "src/pages/admin/AdminProviderReview.tsx" },
];

const FORBIDDEN_DOMAINS = [
  "@/modules/inventory",
  "@/modules/accounting",
  "@/modules/supplierPortal",
  "@/modules/supplier-portal",
];

// Physical RTL classes that violate logical-class convention.
// Match `text-left`/`text-right`, `ml-*`/`mr-*`, `pl-*`/`pr-*` as CLASS tokens
// (avoid matching inside identifiers / Tailwind compounds we don't care about).
const PHYSICAL_RTL_RE = /(["'`\s])(?:text-(?:left|right)|m[lr]-\d|p[lr]-\d)(?=["'`\s])/;

describe("PAGE-POLISH-REPAIRS-1 — target pages still exist", () => {
  for (const { label, path } of TARGET_PAGES) {
    it(`${label} file exists`, () => {
      expect(existsSync(resolve(ROOT, path)), `missing: ${path}`).toBe(true);
    });
  }
});

describe("PAGE-POLISH-REPAIRS-1 — no forbidden domain imports added", () => {
  for (const { label, path } of TARGET_PAGES) {
    it(`${label} does not import inventory/accounting/supplier-portal`, () => {
      const src = read(path);
      for (const mod of FORBIDDEN_DOMAINS) {
        expect(src.includes(mod), `${label} must not import ${mod}`).toBe(false);
      }
    });
  }
});

describe("PAGE-POLISH-REPAIRS-1 — no physical RTL classes in target pages", () => {
  for (const { label, path } of TARGET_PAGES) {
    it(`${label} uses logical RTL classes only`, () => {
      const src = read(path);
      const match = src.match(PHYSICAL_RTL_RE);
      expect(match, `${label} contains physical RTL class: ${match?.[0]}`).toBeNull();
    });
  }
});

describe("PAGE-POLISH-REPAIRS-1 — page headers present (h1 / page-header-equivalent)", () => {
  for (const { label, path } of TARGET_PAGES) {
    it(`${label} renders a heading`, () => {
      const src = read(path);
      const hasHeading =
        /<h1[\s>]/.test(src) ||
        /<CardTitle[\s>]/.test(src) ||
        /PageHeader/.test(src) ||
        /ContractPageHeader/.test(src);
      expect(hasHeading, `${label} must render a heading or page-header`).toBe(true);
    });
  }
});

describe("PAGE-POLISH-REPAIRS-1 — empty / loader signals present where expected", () => {
  const PAGES_WITH_LIST = [
    "src/pages/dashboard/DashboardWorkOrders.tsx",
    "src/pages/dashboard/DashboardProcurement.tsx",
    "src/pages/dashboard/DashboardContracts.tsx",
  ];
  for (const path of PAGES_WITH_LIST) {
    it(`${path} has an empty-state or empty signal`, () => {
      const src = read(path);
      const hasEmpty =
        /DashboardEmptyState/.test(src) ||
        /ContractEmptyState/.test(src) ||
        /empty/i.test(src);
      expect(hasEmpty).toBe(true);
    });
    it(`${path} shows a loading state`, () => {
      const src = read(path);
      expect(/Loader2|Skeleton|loading/i.test(src)).toBe(true);
    });
  }
});

describe("PAGE-POLISH-REPAIRS-1 — detail pages mount related references", () => {
  const DETAIL_WITH_RELATED = [
    "src/pages/dashboard/DashboardWorkOrderDetail.tsx",
    "src/pages/dashboard/DashboardProcurementDetail.tsx",
  ];
  for (const path of DETAIL_WITH_RELATED) {
    it(`${path} keeps RelatedReferencesPanel mounted`, () => {
      const src = read(path);
      expect(src.includes("RelatedReferencesPanel")).toBe(true);
    });
  }
});

describe("PAGE-POLISH-REPAIRS-1 — status / health badges retained", () => {
  const PAGES_WITH_HEALTH = [
    "src/pages/dashboard/DashboardWorkOrders.tsx",
    "src/pages/dashboard/DashboardWorkOrderDetail.tsx",
  ];
  for (const path of PAGES_WITH_HEALTH) {
    it(`${path} keeps HealthBadge mounted`, () => {
      const src = read(path);
      expect(src.includes("HealthBadge")).toBe(true);
    });
  }
});

describe("PAGE-POLISH-REPAIRS-1 — no legacy /admin/identity?view= deep-links re-introduced", () => {
  for (const { label, path } of TARGET_PAGES) {
    it(`${label} has no legacy identity deep-links`, () => {
      const src = read(path);
      expect(/\/admin\/identity\?view=/.test(src), `${label} contains legacy identity link`).toBe(
        false,
      );
    });
  }
});

describe("PAGE-POLISH-REPAIRS-1 — backlog doc reflects this phase", () => {
  it("docs/page-polish-repairs.md mentions PAGE-POLISH-REPAIRS-1", () => {
    const md = read("docs/page-polish-repairs.md");
    expect(md.includes("PAGE-POLISH-REPAIRS-1")).toBe(true);
  });
});

describe("PAGE-POLISH-REPAIRS-1 — DashboardEmptyState primitive shipped", () => {
  it("primitive file exists", () => {
    expect(existsSync(resolve(ROOT, "src/components/dashboard/DashboardEmptyState.tsx"))).toBe(
      true,
    );
  });
  it("primitive exports DashboardEmptyState", () => {
    const src = read("src/components/dashboard/DashboardEmptyState.tsx");
    expect(/export function DashboardEmptyState/.test(src)).toBe(true);
  });
});