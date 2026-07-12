/**
 * P1.4 — Notification coverage parity lock.
 *
 * For every notification_type literal we emit (from either the client / edge
 * functions **or** DB triggers), assert that we have:
 *   1. an icon + urgency entry in `notificationTypeMeta`
 *   2. a bilingual entry in `notificationLabelDict`
 *   3. a UI category via `getNotificationCategory`
 *
 * This lets us catch drift the moment a new notification type is emitted
 * without matching UI metadata — previously many events showed the generic
 * "system" icon in the notification center.
 */
import { describe, it, expect } from 'vitest';
import * as fs from 'node:fs';
import * as path from 'node:path';
import {
  notificationTypeMeta,
  getNotificationCategory,
  typeFilterLabels,
} from '@/components/notifications/notification-types';
import { notificationLabelDict } from '@/i18n/notificationLabels';

const REPO = path.resolve(__dirname, '../..');

/**
 * DB-trigger-created notification types.
 *
 * Origin: `supabase/migrations/*_phase15_*.sql` (Opportunity Phase 15 fan-out
 * migration) + membership + brand-request fan-out triggers. Hardcoded here
 * because we cannot run pg introspection at test time.
 *
 * Keep this list in sync whenever a new SQL trigger inserts into
 * `public.notifications`.
 */
const DB_TRIGGER_TYPES = [
  'opportunity_created',
  'opportunity_provider_matched',
  'opportunity_assigned',
  'opportunity_awarded',
  'opportunity_award_lost',
  'opportunity_bid_submitted',
  'opportunity_bid_revised',
  'opportunity_contract_converted',
  'opportunity_cancelled',
  'opportunity_expired',
  'quote_request_new_admin',
  'quote_request_submitted',
  'quote_request_status_updated',
  'quote_lead_assigned',
  'membership_payment_succeeded',
  'membership_payment_failed',
  'membership_payment_refunded',
] as const;

/** Scrape every `notification_type: '...'` literal from src/ + supabase/. */
function scrapeEmittedTypes(): Set<string> {
  const out = new Set<string>();
  const re = /notification_type\s*:\s*'([a-z0-9_.]+)'/g;
  const visit = (dir: string) => {
    for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
      // Skip test fixtures — they include arbitrary strings that we don't
      // want to lock as production-facing types.
      if (entry.isDirectory()) {
        if (entry.name === 'node_modules' || entry.name === 'dist') continue;
        visit(path.join(dir, entry.name));
        continue;
      }
      if (!/\.(ts|tsx)$/.test(entry.name)) continue;
      if (/\.test\.(ts|tsx)$/.test(entry.name)) continue;
      const full = path.join(dir, entry.name);
      const src = fs.readFileSync(full, 'utf8');
      let m: RegExpExecArray | null;
      while ((m = re.exec(src)) !== null) out.add(m[1]);
    }
  };
  visit(path.join(REPO, 'src'));
  visit(path.join(REPO, 'supabase/functions'));
  return out;
}

describe('Notification coverage parity (P1.4)', () => {
  const emitted = scrapeEmittedTypes();
  const all = new Set<string>([...emitted, ...DB_TRIGGER_TYPES]);

  it('all emitted notification_types have a metadata entry (icon/color/urgency/category)', () => {
    const missing: string[] = [];
    for (const t of all) {
      if (!notificationTypeMeta[t]) missing.push(t);
    }
    expect(missing, `missing notificationTypeMeta entries: ${missing.join(', ')}`).toEqual([]);
  });

  it('all emitted notification_types have a bilingual label in notificationLabelDict', () => {
    const missing: string[] = [];
    for (const t of all) {
      if (!notificationLabelDict[t]) missing.push(t);
    }
    expect(missing, `missing notificationLabelDict entries: ${missing.join(', ')}`).toEqual([]);
  });

  it('every notification_type resolves to a real UI category (not implicit "system") when we have metadata', () => {
    // Every type MUST resolve to a category — the resolver never returns undefined.
    // We additionally require that meta-registered types have a category matching a filter key.
    const validCategories = new Set(Object.keys(typeFilterLabels).filter((k) => k !== 'all'));
    const bad: string[] = [];
    for (const [type, meta] of Object.entries(notificationTypeMeta)) {
      if (!validCategories.has(meta.category)) bad.push(`${type} → ${meta.category}`);
      expect(getNotificationCategory(type)).toBe(meta.category);
    }
    expect(bad, `types with unknown category: ${bad.join(', ')}`).toEqual([]);
  });

  it('typeFilterLabels contains the seven required Arabic-first categories', () => {
    expect(Object.keys(typeFilterLabels).sort()).toEqual(
      ['all', 'bids', 'contracts', 'membership', 'requests', 'system', 'team'].sort(),
    );
  });

  it('every filter category (except "all") has at least one notification type mapped to it', () => {
    const covered = new Set(
      Object.values(notificationTypeMeta).map((m) => m.category),
    );
    for (const cat of Object.keys(typeFilterLabels)) {
      if (cat === 'all') continue;
      expect(covered.has(cat as any), `empty category: ${cat}`).toBe(true);
    }
  });
});