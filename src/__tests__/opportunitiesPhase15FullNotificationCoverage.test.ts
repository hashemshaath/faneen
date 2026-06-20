import { describe, it, expect } from 'vitest';
import * as fs from 'node:fs';
import * as path from 'node:path';
import {
  buildOpportunityMessage,
  OPPORTUNITY_EVENT_TYPES,
  type OpportunityRecipientRole,
} from '@/modules/notifications/opportunityMessageCatalog';

/**
 * PHASE 15 — comprehensive opportunity notification coverage.
 *
 * Locks three guarantees:
 *  1. The WhatsApp/SMS catalog has a bilingual entry for every lifecycle event
 *     and at least one expected recipient role.
 *  2. The 9 lifecycle email templates exist and are wired in the registry.
 *  3. The DB migration extends the notification fan-out to the new event types
 *     and to client + provider + admin recipients.
 */

const REPO = path.resolve(__dirname, '../..');

// (event, role) pairs that MUST exist in the catalog.
const REQUIRED_PAIRS: ReadonlyArray<readonly [typeof OPPORTUNITY_EVENT_TYPES[number], OpportunityRecipientRole]> = [
  ['created', 'client'],
  ['provider_matched', 'provider'],
  ['bid_submitted', 'client'],
  ['bid_revised', 'client'],
  ['awarded', 'provider'],
  ['award_lost', 'provider'],
  ['contract_created', 'client'],
  ['contract_created', 'provider'],
  ['opportunity_cancelled', 'client'],
  ['opportunity_cancelled', 'provider'],
  ['opportunity_expired', 'client'],
  ['opportunity_expired', 'provider'],
];

describe('Opportunities — full notification coverage (Phase 15)', () => {
  it('catalog covers every required (event, role) pair on both whatsapp and sms with AR + EN', () => {
    for (const [event, role] of REQUIRED_PAIRS) {
      for (const channel of ['whatsapp', 'sms'] as const) {
        const msg = buildOpportunityMessage(event, role, channel, {
          ref: 'OPP-TEST-1', url: 'https://qitaat.com/opportunities/OPP-TEST-1',
        });
        expect(msg, `missing ${event}:${role}:${channel}`).not.toBeNull();
        expect(msg!.ar.length, `AR empty for ${event}:${role}:${channel}`).toBeGreaterThan(5);
        expect(msg!.en.length, `EN empty for ${event}:${role}:${channel}`).toBeGreaterThan(5);
        expect(msg!.ar).toContain('OPP-TEST-1');
        expect(msg!.en).toContain('OPP-TEST-1');
      }
    }
  });

  it('exports the full set of lifecycle event types', () => {
    expect(new Set(OPPORTUNITY_EVENT_TYPES)).toEqual(new Set([
      'created','provider_matched','assigned','bid_submitted','bid_revised',
      'awarded','award_lost','contract_created','opportunity_cancelled','opportunity_expired',
    ]));
  });

  const TEMPLATES_DIR = path.join(REPO, 'supabase/functions/_shared/transactional-email-templates');
  const EMAIL_TEMPLATES = [
    'opportunity-created-client',
    'opportunity-new-match-provider',
    'opportunity-bid-submitted-client',
    'opportunity-bid-awarded-provider',
    'opportunity-bid-not-awarded-provider',
    'opportunity-contract-created-client',
    'opportunity-contract-created-provider',
    'opportunity-expired-client',
    'opportunity-cancelled-provider',
  ] as const;

  it('all 9 opportunity email templates exist as .tsx files', () => {
    for (const name of EMAIL_TEMPLATES) {
      const file = path.join(TEMPLATES_DIR, `${name}.tsx`);
      expect(fs.existsSync(file), `missing template file: ${name}.tsx`).toBe(true);
    }
  });

  it('registry.ts wires all 9 opportunity templates by name', () => {
    const registry = fs.readFileSync(path.join(TEMPLATES_DIR, 'registry.ts'), 'utf8');
    for (const name of EMAIL_TEMPLATES) {
      expect(registry, `registry missing key '${name}'`).toContain(`'${name}':`);
    }
  });

  it('phase 15 migration extends notify_admins_opportunity_event to client + providers and adds new triggers', () => {
    const migrationsDir = path.join(REPO, 'supabase/migrations');
    const files = fs.readdirSync(migrationsDir).filter((f) => f.endsWith('.sql'));
    const matching = files
      .map((f) => fs.readFileSync(path.join(migrationsDir, f), 'utf8'))
      .filter((src) => src.includes('trg_opportunity_created_notify')
                    && src.includes('trg_opportunity_provider_matched_notify')
                    && src.includes('trg_opportunity_bid_revised_notify')
                    && src.includes('trg_opportunity_cancelled_notify'));
    expect(matching.length, 'phase 15 migration not found').toBeGreaterThan(0);
    const src = matching[0];
    // Must reference all new event types inside the function body.
    for (const ev of ['created','provider_matched','bid_revised','award_lost','opportunity_cancelled','opportunity_expired']) {
      expect(src, `event type missing in function: ${ev}`).toContain(`'${ev}'`);
    }
    // Must fan out to client / provider / admin recipients.
    expect(src).toContain('quote_requests');
    expect(src).toContain('quote_request_leads');
    expect(src).toContain("ur.role = 'admin'");
  });
});