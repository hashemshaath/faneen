/**
 * Phase 12 — Safe Lucide icon registry for taxonomy categories.
 *
 * Design rules:
 * - No dynamic imports. Every icon in the map is statically imported from
 *   `lucide-react`, so the bundler can tree-shake and we never crash at
 *   runtime on a typo.
 * - The DB column `taxonomy_categories.icon` stores a short string key
 *   (e.g. `"Building2"`, `"Factory"`). Anything not in the registry falls
 *   back to the safe `Tags` icon so the UI never breaks.
 * - Keep keys CamelCase to match lucide-react export names — this makes
 *   admin edits self-documenting.
 */
import {
  Tags, User, Building2, Factory, Wrench, Store, Truck, HardHat,
  DraftingCompass, Settings, Landmark, ShieldCheck, Handshake, Briefcase,
  CircleEllipsis, Paintbrush, PanelsTopLeft, Grid3X3, Hammer, Trees,
  Utensils, Package, Cpu, Layers, DoorOpen, Square, PaintBucket, Zap,
  Droplets, Tag, Folder, FolderTree, Boxes, BookOpen, FileText,
  PanelTop, GlassWater, TreePine, Flame, Home,
} from 'lucide-react';
import type { LucideIcon } from 'lucide-react';

/** Read-only registry. Adding new icons requires adding the import above. */
export const TAXONOMY_ICONS: Readonly<Record<string, LucideIcon>> = Object.freeze({
  Tags, Tag, Folder, FolderTree, Boxes, BookOpen, FileText,
  // Entity types
  User, Building2, Factory, Wrench, Store, Truck, HardHat,
  DraftingCompass, Settings, Landmark, ShieldCheck, Handshake, Briefcase,
  CircleEllipsis,
  // Primary activities
  Paintbrush, PanelsTopLeft, Grid3X3, Hammer, Trees, Package, Cpu,
  // Services / specialties
  Utensils, Layers, DoorOpen, Square, PaintBucket, Zap, Droplets,
  // Industrial sectors (Phase 21 — Sectors Hub)
  PanelTop, GlassWater, TreePine, Flame, Home,
});

export type TaxonomyIconKey = keyof typeof TAXONOMY_ICONS;

/**
 * Safe lookup. Returns a fallback icon when the name is null/empty or not
 * registered. Never throws.
 */
export function getTaxonomyIcon(iconName: string | null | undefined): LucideIcon {
  if (!iconName) return Tags;
  const key = iconName.trim();
  if (!key) return Tags;
  return TAXONOMY_ICONS[key] ?? Tags;
}

/** True if the icon string would resolve to a real registry entry. */
export function isKnownTaxonomyIcon(iconName: string | null | undefined): boolean {
  if (!iconName) return false;
  return Object.prototype.hasOwnProperty.call(TAXONOMY_ICONS, iconName.trim());
}

/** List of all registered keys — useful for admin pickers. */
export const TAXONOMY_ICON_KEYS: readonly TaxonomyIconKey[] =
  Object.freeze(Object.keys(TAXONOMY_ICONS) as TaxonomyIconKey[]);