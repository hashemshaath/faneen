import { describe, it, expect } from 'vitest';
import {
  computeRfqJourneyState,
  computeProviderBidState,
} from '../journeyState';

const req = (over: Partial<Parameters<typeof computeRfqJourneyState>[0]> = {}) => ({
  status: 'new',
  awarded_bid_id: null,
  requires_sample: false,
  ...over,
});

describe('computeRfqJourneyState', () => {
  it('returns awaiting_bids when there are no bids', () => {
    expect(computeRfqJourneyState(req(), [], null, false)).toBe('awaiting_bids');
  });

  it('returns bids_in when at least one bid exists', () => {
    expect(
      computeRfqJourneyState(req(), [{ id: 'b1', status: 'submitted' }], null, false),
    ).toBe('bids_in');
  });

  it('returns shortlisted when any bid is shortlisted', () => {
    expect(
      computeRfqJourneyState(
        req(),
        [
          { id: 'b1', status: 'submitted' },
          { id: 'b2', status: 'shortlisted' },
        ],
        null,
        false,
      ),
    ).toBe('shortlisted');
  });

  it('returns revision_requested when any bid is in revision_requested', () => {
    expect(
      computeRfqJourneyState(
        req(),
        [
          { id: 'b1', status: 'shortlisted' },
          { id: 'b2', status: 'revision_requested' },
        ],
        null,
        false,
      ),
    ).toBe('revision_requested');
  });

  it('returns awarded when awarded_bid_id set and no sample gate', () => {
    expect(
      computeRfqJourneyState(
        req({ awarded_bid_id: 'b1' }),
        [{ id: 'b1', status: 'awarded' }],
        null,
        false,
      ),
    ).toBe('awarded');
  });

  it('returns sample_pending when awarded, requires_sample, and sample not approved', () => {
    expect(
      computeRfqJourneyState(
        req({ awarded_bid_id: 'b1', requires_sample: true }),
        [{ id: 'b1', status: 'awarded' }],
        'requested',
        false,
      ),
    ).toBe('sample_pending');
  });

  it('graduates from sample_pending to awarded once sample is approved', () => {
    expect(
      computeRfqJourneyState(
        req({ awarded_bid_id: 'b1', requires_sample: true }),
        [{ id: 'b1', status: 'awarded' }],
        'approved',
        false,
      ),
    ).toBe('awarded');
  });

  it('returns converted whenever a contract exists (overrides awarded/sample)', () => {
    expect(
      computeRfqJourneyState(
        req({ awarded_bid_id: 'b1', requires_sample: true }),
        [{ id: 'b1', status: 'awarded' }],
        'requested',
        true,
      ),
    ).toBe('converted');
  });

  it('returns closed for cancelled/completed opportunities without a contract', () => {
    expect(computeRfqJourneyState(req({ status: 'cancelled' }), [], null, false)).toBe('closed');
    expect(computeRfqJourneyState(req({ status: 'completed' }), [], null, false)).toBe('closed');
  });
});

describe('computeProviderBidState', () => {
  it('not_submitted when the provider has no bid', () => {
    expect(computeProviderBidState(null, null)).toBe('not_submitted');
  });

  it('submitted when a bid exists in a normal state', () => {
    expect(computeProviderBidState({ id: 'b1', status: 'submitted' }, null)).toBe('submitted');
  });

  it('revision_requested_by_client when client asked for a revision', () => {
    expect(
      computeProviderBidState({ id: 'b1', status: 'revision_requested' }, null),
    ).toBe('revision_requested_by_client');
  });

  it('shortlisted when the provider bid is shortlisted', () => {
    expect(computeProviderBidState({ id: 'b1', status: 'shortlisted' }, null)).toBe('shortlisted');
  });

  it('won when awarded_bid_id matches my bid, or bid status is awarded', () => {
    expect(computeProviderBidState({ id: 'b1', status: 'awarded' }, 'b1')).toBe('won');
    expect(computeProviderBidState({ id: 'b1', status: 'submitted' }, 'b1')).toBe('won');
  });

  it('lost when my bid is rejected/withdrawn or someone else was awarded', () => {
    expect(computeProviderBidState({ id: 'b1', status: 'rejected' }, null)).toBe('lost');
    expect(computeProviderBidState({ id: 'b1', status: 'withdrawn' }, null)).toBe('lost');
    expect(computeProviderBidState({ id: 'b1', status: 'submitted' }, 'b2')).toBe('lost');
  });
});