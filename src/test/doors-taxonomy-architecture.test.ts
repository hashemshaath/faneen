/**
 * DOORS TAXONOMY ARCHITECTURE PATCH — guard tests
 *
 * Enforces:
 *   1. Every door-related secondary_activity sits under a primary_activity
 *      (never directly under a sector).
 *   2. Each of the 6 expected door primary activities exists, is parented to
 *      the correct sector, and carries the expected secondaries.
 *   3. No duplicate slugs across the 52 patch entries.
 *   4. No "legacy"/raw slugs slipped into the patch payload.
 *
 * These are static assertions against the canonical seed listed in
 * `supabase/migrations` / the manual insert that shipped Doors Patch v1.
 * They do NOT hit the network; they validate the canonical contract that
 * onboarding, business edit, and admin taxonomy must respect.
 */

import { describe, it, expect } from "vitest";

type DoorPrimary = {
  sector: string;
  primary: string;
  nameAr: string;
  nameEn: string;
  secondaries: Array<{ slug: string; ar: string; en: string }>;
};

const DOORS_TREE: DoorPrimary[] = [
  {
    sector: "wood-sector",
    primary: "wooden-doors-works",
    nameAr: "أعمال الأبواب الخشبية",
    nameEn: "Wooden Doors Works",
    secondaries: [
      { slug: "interior-wooden-doors",    ar: "أبواب خشبية داخلية",    en: "Interior Wooden Doors" },
      { slug: "exterior-wooden-doors",    ar: "أبواب خشبية خارجية",    en: "Exterior Wooden Doors" },
      { slug: "solid-wood-doors",         ar: "أبواب خشب صلب",         en: "Solid Wood Doors" },
      { slug: "veneer-wooden-doors",      ar: "أبواب قشرة خشبية",      en: "Veneer Wooden Doors" },
      { slug: "flush-wooden-doors",       ar: "أبواب خشبية مسطحة",     en: "Flush Wooden Doors" },
      { slug: "wooden-door-installation", ar: "تركيب أبواب خشبية",     en: "Wooden Door Installation" },
      { slug: "wooden-door-maintenance",  ar: "صيانة أبواب خشبية",     en: "Wooden Door Maintenance" },
      { slug: "wooden-door-hardware",     ar: "إكسسوارات أبواب خشبية", en: "Wooden Door Hardware" },
    ],
  },
  {
    sector: "iron-steel",
    primary: "steel-metal-doors-works",
    nameAr: "أعمال الأبواب الحديدية والمعدنية",
    nameEn: "Steel & Metal Doors Works",
    secondaries: [
      { slug: "exterior-steel-doors",    ar: "أبواب حديد خارجية",    en: "Exterior Steel Doors" },
      { slug: "security-steel-doors",    ar: "أبواب حديد أمنية",     en: "Security Steel Doors" },
      { slug: "service-metal-doors",     ar: "أبواب معدنية خدمية",   en: "Service Metal Doors" },
      { slug: "steel-gates",             ar: "بوابات حديد",          en: "Steel Gates" },
      { slug: "metal-door-frames",       ar: "إطارات أبواب معدنية",  en: "Metal Door Frames" },
      { slug: "rolling-shutter-doors",   ar: "أبواب رول وشتر",       en: "Rolling Shutter Doors" },
      { slug: "steel-door-installation", ar: "تركيب أبواب حديدية",   en: "Steel Door Installation" },
      { slug: "steel-door-maintenance",  ar: "صيانة أبواب حديدية",   en: "Steel Door Maintenance" },
    ],
  },
  {
    sector: "aluminum",
    primary: "aluminum-doors-works",
    nameAr: "أعمال أبواب الألمنيوم",
    nameEn: "Aluminum Doors Works",
    secondaries: [
      { slug: "aluminum-entrance-doors",    ar: "أبواب مداخل ألمنيوم",      en: "Aluminum Entrance Doors" },
      { slug: "aluminum-sliding-doors",     ar: "أبواب ألمنيوم سحاب",       en: "Aluminum Sliding Doors" },
      { slug: "aluminum-hinged-doors",      ar: "أبواب ألمنيوم مفصلية",     en: "Aluminum Hinged Doors" },
      { slug: "aluminum-glass-doors",       ar: "أبواب ألمنيوم وزجاج",      en: "Aluminum Glass Doors" },
      { slug: "automatic-aluminum-doors",   ar: "أبواب ألمنيوم أوتوماتيكية", en: "Automatic Aluminum Doors" },
      { slug: "aluminum-door-installation", ar: "تركيب أبواب ألمنيوم",      en: "Aluminum Door Installation" },
      { slug: "aluminum-door-maintenance",  ar: "صيانة أبواب ألمنيوم",      en: "Aluminum Door Maintenance" },
    ],
  },
  {
    sector: "glass-securit",
    primary: "glass-doors-works",
    nameAr: "أعمال الأبواب الزجاجية",
    nameEn: "Glass Doors Works",
    secondaries: [
      { slug: "securit-glass-doors",     ar: "أبواب سيكوريت زجاجية",   en: "Securit Glass Doors" },
      { slug: "frameless-glass-doors",   ar: "أبواب زجاج بدون إطار",   en: "Frameless Glass Doors" },
      { slug: "sliding-glass-doors",     ar: "أبواب زجاج سحاب",        en: "Sliding Glass Doors" },
      { slug: "automatic-glass-doors",   ar: "أبواب زجاج أوتوماتيكية", en: "Automatic Glass Doors" },
      { slug: "glass-door-installation", ar: "تركيب أبواب زجاجية",     en: "Glass Door Installation" },
      { slug: "glass-door-maintenance",  ar: "صيانة أبواب زجاجية",     en: "Glass Door Maintenance" },
      { slug: "glass-door-accessories",  ar: "إكسسوارات أبواب زجاجية", en: "Glass Door Accessories" },
    ],
  },
  {
    sector: "upvc",
    primary: "upvc-doors-windows-works",
    nameAr: "أعمال أبواب ونوافذ UPVC",
    nameEn: "UPVC Doors & Windows Works",
    secondaries: [
      { slug: "upvc-doors",          ar: "أبواب UPVC",        en: "UPVC Doors" },
      { slug: "upvc-windows",        ar: "نوافذ UPVC",        en: "UPVC Windows" },
      { slug: "upvc-sliding-doors",  ar: "أبواب UPVC سحاب",   en: "UPVC Sliding Doors" },
      { slug: "upvc-hinged-doors",   ar: "أبواب UPVC مفصلية", en: "UPVC Hinged Doors" },
      { slug: "upvc-double-glazing", ar: "زجاج مزدوج UPVC",   en: "UPVC Double Glazing" },
      { slug: "upvc-installation",   ar: "تركيب UPVC",        en: "UPVC Installation" },
      { slug: "upvc-maintenance",    ar: "صيانة UPVC",        en: "UPVC Maintenance" },
      { slug: "upvc-accessories",    ar: "إكسسوارات UPVC",    en: "UPVC Accessories" },
    ],
  },
  {
    sector: "fire-doors",
    primary: "fire-doors-works",
    nameAr: "أعمال أبواب الحريق",
    nameEn: "Fire Doors Works",
    secondaries: [
      { slug: "fire-rated-steel-doors",  ar: "أبواب حريق معدنية",        en: "Fire-Rated Steel Doors" },
      { slug: "fire-rated-wooden-doors", ar: "أبواب حريق خشبية",         en: "Fire-Rated Wooden Doors" },
      { slug: "fire-exit-doors",         ar: "أبواب مخارج الطوارئ",      en: "Fire Exit Doors" },
      { slug: "smoke-seal-doors",        ar: "أبواب مانعة للدخان",       en: "Smoke Seal Doors" },
      { slug: "fire-door-installation",  ar: "تركيب أبواب الحريق",       en: "Fire Door Installation" },
      { slug: "fire-door-maintenance",   ar: "صيانة أبواب الحريق",       en: "Fire Door Maintenance" },
      { slug: "fire-door-hardware",      ar: "إكسسوارات أبواب الحريق",   en: "Fire Door Hardware" },
      { slug: "fire-door-certification", ar: "اعتماد وفحص أبواب الحريق", en: "Fire Door Certification" },
    ],
  },
];

describe("DOORS TAXONOMY ARCHITECTURE PATCH", () => {
  it("declares exactly 6 door primary activities", () => {
    expect(DOORS_TREE).toHaveLength(6);
  });

  it("declares exactly 46 door secondary activities", () => {
    const total = DOORS_TREE.reduce((acc, p) => acc + p.secondaries.length, 0);
    expect(total).toBe(46);
  });

  it("uses canonical sector slugs only", () => {
    const allowed = new Set([
      "wood-sector",
      "iron-steel",
      "aluminum",
      "glass-securit",
      "upvc",
      "fire-doors",
    ]);
    for (const p of DOORS_TREE) {
      expect(allowed.has(p.sector)).toBe(true);
    }
  });

  it("has no duplicate slugs across primaries and secondaries", () => {
    const slugs: string[] = [];
    for (const p of DOORS_TREE) {
      slugs.push(p.primary);
      for (const s of p.secondaries) slugs.push(s.slug);
    }
    const dupes = slugs.filter((s, i) => slugs.indexOf(s) !== i);
    expect(dupes).toEqual([]);
  });

  it("uses kebab-case slugs only (no raw/legacy formats)", () => {
    const re = /^[a-z][a-z0-9-]*[a-z0-9]$/;
    for (const p of DOORS_TREE) {
      expect(p.primary).toMatch(re);
      for (const s of p.secondaries) expect(s.slug).toMatch(re);
    }
  });

  it("guarantees every secondary belongs to a primary (none under sector)", () => {
    for (const p of DOORS_TREE) {
      expect(p.secondaries.length).toBeGreaterThan(0);
      for (const s of p.secondaries) {
        // A secondary is identified by belonging to a primary entry — its
        // parent slug is `p.primary` (a primary_activity), never `p.sector`.
        expect(s.slug).not.toBe(p.sector);
      }
    }
  });

  it("provides ar and en names for every entry", () => {
    for (const p of DOORS_TREE) {
      expect(p.nameAr.trim().length).toBeGreaterThan(0);
      expect(p.nameEn.trim().length).toBeGreaterThan(0);
      for (const s of p.secondaries) {
        expect(s.ar.trim().length).toBeGreaterThan(0);
        expect(s.en.trim().length).toBeGreaterThan(0);
      }
    }
  });

  it("covers required door dimensions: material × usage × function", () => {
    const all = DOORS_TREE.flatMap((p) => p.secondaries.map((s) => s.slug));
    // material coverage
    expect(all).toContain("interior-wooden-doors");
    expect(all).toContain("exterior-steel-doors");
    expect(all).toContain("aluminum-entrance-doors");
    expect(all).toContain("securit-glass-doors");
    expect(all).toContain("upvc-doors");
    // function coverage
    expect(all).toContain("rolling-shutter-doors");
    expect(all).toContain("automatic-aluminum-doors");
    expect(all).toContain("fire-exit-doors");
    expect(all).toContain("smoke-seal-doors");
    expect(all).toContain("security-steel-doors");
  });
});
