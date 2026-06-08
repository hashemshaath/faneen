import type { AssetStatus } from '../types';

/** Allowed transitions. Retired is terminal unless an admin reactivates. */
const TRANSITIONS: Record<AssetStatus, ReadonlyArray<AssetStatus>> = {
  available: ['rented', 'reserved', 'maintenance', 'inspection', 'retired'],
  reserved: ['available', 'rented', 'maintenance', 'inspection', 'retired'],
  rented: ['available', 'maintenance', 'inspection'],
  maintenance: ['available', 'inspection', 'retired'],
  inspection: ['available', 'maintenance', 'retired'],
  retired: [],
};

export function canTransition(from: AssetStatus, to: AssetStatus): boolean {
  if (from === to) return true;
  return TRANSITIONS[from].includes(to);
}

/** Days remaining until a scheduled date (YYYY-MM-DD). Negative = overdue. */
export function daysUntil(dateIso: string | null, today: Date = new Date()): number | null {
  if (!dateIso) return null;
  const d = new Date(dateIso + 'T00:00:00Z');
  const t = new Date(today.toISOString().slice(0, 10) + 'T00:00:00Z');
  return Math.round((d.getTime() - t.getTime()) / 86_400_000);
}

export type MaintenanceAlertTier = 'safe' | 'soon' | 'due' | 'overdue';

export function maintenanceTier(dateIso: string | null, today?: Date): MaintenanceAlertTier {
  const d = daysUntil(dateIso, today);
  if (d === null) return 'safe';
  if (d < 0) return 'overdue';
  if (d <= 1) return 'due';
  if (d <= 7) return 'soon';
  return 'safe';
}