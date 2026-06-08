/**
 * RENTAL-MICROSERVICE-2 — operational layer acceptance tests.
 * Static / structural checks only — no live DB.
 */
import { describe, it, expect } from 'vitest';
import { readFileSync, existsSync } from 'node:fs';
import { join } from 'node:path';

import {
  RENTAL_EVENTS, notifyRental,
  RentalExtensionPanel, RentalImageUploader, RentalOpsQueueCard,
  RentalOrders, RentalExtensionsApi, RentalOps,
} from '@/modules/rentals';

const root = process.cwd();
const read = (p: string) => readFileSync(join(root, p), 'utf8');

describe('R2 · cron / expiry scan', () => {
  it('edge function exists', () => {
    expect(existsSync(join(root, 'supabase/functions/rental-expiry-scan/index.ts'))).toBe(true);
  });
  it('function calls the roll RPC and dedupes via rental_order_events', () => {
    const src = read('supabase/functions/rental-expiry-scan/index.ts');
    expect(src).toMatch(/rental_orders_roll_status/);
    expect(src).toMatch(/rental_order_events/);
    expect(src).toMatch(/event_type/);
  });
  it('function is admin/cron guarded and returns 200 JSON', () => {
    const src = read('supabase/functions/rental-expiry-scan/index.ts');
    expect(src).toMatch(/requireCronOrAdmin/);
    expect(src).toMatch(/status:\s*200/);
  });
  it('manual trigger exposed via RentalOps service', () => {
    expect(typeof RentalOps.triggerExpiryScan).toBe('function');
  });
});

describe('R2 · notifications', () => {
  it('exposes the 7 rental lifecycle events', () => {
    expect(RENTAL_EVENTS).toEqual([
      'rental.started',
      'rental.expiring_soon',
      'rental.expired',
      'rental.overdue',
      'rental.extension_requested',
      'rental.extension_approved',
      'rental.closed',
    ]);
  });
  it('notifyRental delegates to the shared notifications wrapper', () => {
    const src = read('src/modules/rentals/services/notifications.ts');
    expect(src).toMatch(/from '@\/modules\/notifications'/);
    expect(src).not.toMatch(/from '@\/integrations\/supabase\/client'/);
    expect(typeof notifyRental).toBe('function');
  });
  it('no WhatsApp or SMS channels in rentals module', () => {
    for (const f of [
      'src/modules/rentals/services/notifications.ts',
      'src/modules/rentals/services/orders.ts',
      'src/modules/rentals/services/extensions.ts',
      'supabase/functions/rental-expiry-scan/index.ts',
    ]) {
      const s = read(f);
      expect(s).not.toMatch(/whatsapp|twilio|\bsms\b/i);
    }
  });
});

describe('R2 · extension / renewal / close', () => {
  it('orders service exposes renew + close', () => {
    expect(typeof RentalOrders.renewOrder).toBe('function');
    expect(typeof RentalOrders.closeOrder).toBe('function');
  });
  it('extension service creates REXT via rental_extensions table', () => {
    const src = read('src/modules/rentals/services/extensions.ts');
    expect(src).toMatch(/from\('rental_extensions'\)\s*\.insert/);
    expect(typeof RentalExtensionsApi.createExtension).toBe('function');
  });
  it('renewal preserves history by inserting a new order (not mutating dates)', () => {
    const src = read('src/modules/rentals/services/orders.ts');
    expect(src).toMatch(/renewed_from_ref/);
    expect(src).toMatch(/\.insert\(\{/);
  });
  it('inline ExtensionPanel uses no native dialog/popup', () => {
    const src = read('src/modules/rentals/components/RentalExtensionPanel.tsx');
    expect(src).not.toMatch(/Dialog|AlertDialog|alert\(/);
    expect(typeof RentalExtensionPanel).toBe('function');
  });
});

describe('R2 · image upload', () => {
  it('RentalImageUploader exists and uses the shared validator pipeline', () => {
    expect(typeof RentalImageUploader).toBe('function');
    const src = read('src/modules/rentals/components/RentalImageUploader.tsx');
    expect(src).toMatch(/ImageUploader/);
    expect(src).toMatch(/RentalItems\.updateItem/);
  });
  it('shared image validator covers JPG/PNG/WebP only', () => {
    const src = read('src/lib/imageCompression.ts');
    expect(src).toMatch(/image\/jpeg|image\/jpg/);
    expect(src).toMatch(/image\/png/);
    expect(src).toMatch(/image\/webp/);
  });
  it('provider dashboard wires the uploader inline (no popup)', () => {
    const src = read('src/pages/dashboard/DashboardRentals.tsx');
    expect(src).toMatch(/RentalImageUploader/);
    expect(src).not.toMatch(/Dialog>/);
  });
});

describe('R2 · operations center integration', () => {
  it('RentalOpsQueueCard exists and surfaces all queue signals', () => {
    expect(typeof RentalOpsQueueCard).toBe('function');
    const src = read('src/modules/rentals/components/RentalOpsQueueCard.tsx');
    for (const k of ['active', 'expiring_soon', 'expired', 'overdue',
      'pending_extensions', 'items_missing_images',
      'items_missing_category', 'items_low_seo']) {
      expect(src).toMatch(new RegExp(k));
    }
  });
  it('AdminOperationsHub includes the rentals tab', () => {
    const src = read('src/pages/admin/AdminOperationsHub.tsx');
    expect(src).toMatch(/AdminOperationsRentals/);
  });
  it('no bulk publish in admin surfaces', () => {
    expect(read('src/pages/admin/AdminRentals.tsx')).not.toMatch(/bulkPublish|publishAll/);
    expect(read('src/pages/admin/AdminOperationsRentals.tsx')).not.toMatch(/bulkPublish|publishAll/);
  });
});

describe('R2 · isolation & safety guarantees', () => {
  it('public catalog pages still filter approved & published', () => {
    const items = read('src/modules/rentals/services/items.ts');
    expect(items).toMatch(/listPublishedItems[\s\S]*is_published[\s\S]*approved/);
    expect(items).toMatch(/getPublishedItemBySlug[\s\S]*is_published[\s\S]*approved/);
  });
  it('no payment gateway calls in rentals module or its pages', () => {
    const targets = [
      'src/modules/rentals/services/orders.ts',
      'src/modules/rentals/services/extensions.ts',
      'src/modules/rentals/services/notifications.ts',
      'src/pages/dashboard/DashboardRentals.tsx',
      'src/pages/admin/AdminRentals.tsx',
      'src/pages/RentalsCatalog.tsx',
      'src/pages/RentalItemPublic.tsx',
    ];
    for (const t of targets) {
      const s = read(t);
      expect(s).not.toMatch(/stripe|moyasar|tabby|tamara|paddle|paypal/i);
    }
  });
  it('admin operations rentals page does not query supabase directly', () => {
    const s = read('src/pages/admin/AdminOperationsRentals.tsx');
    expect(s).not.toMatch(/integrations\/supabase\/client/);
  });
  it('help docs exist and cover all five article keys', () => {
    const md = read('docs/rentals-help.md');
    for (const key of [
      'provider.rentals',
      'admin.rentals',
      'public.rentals',
      'rental.extension.workflow',
      'rental.expiry.alerts',
    ]) expect(md).toContain(key);
  });
});