import { describe, it, expect, vi, beforeEach } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const invokeMock = vi.fn();

vi.mock('@/integrations/supabase/client', () => ({
  supabase: { functions: { invoke: (...args: unknown[]) => invokeMock(...args) } },
}));

import { submitQuoteRequest, type SubmitQuoteRequestPayload } from '../submitQuoteRequest';

const payload: SubmitQuoteRequestPayload = {
  customer_name: 'Test',
  customer_phone: '+966500000000',
  customer_email: 't@example.com',
  customer_type: 'individual',
  preferred_contact_method: 'any',
  sector: 'glass',
  city: 'Riyadh',
  district: null,
  service_location_type: 'on_site',
  project_description: 'Project description text',
  approx_dimensions: null,
  quantity: null,
  execution_timeline: 'asap',
  has_budget: false,
  budget_amount: null,
  budget_note: null,
  metadata: { locale: 'en' },
};

beforeEach(() => {
  invokeMock.mockReset();
});

describe('submitQuoteRequest', () => {
  it('invokes the exact "submit-quote-request" edge function with the exact payload', async () => {
    invokeMock.mockResolvedValue({
      data: { success: true, quote_request_id: 'qr-1' },
      error: null,
    });
    const res = await submitQuoteRequest(payload);
    expect(invokeMock).toHaveBeenCalledWith('submit-quote-request', { body: payload });
    expect(res).toEqual({ success: true, quote_request_id: 'qr-1', message: undefined });
  });

  it('throws when the edge function returns an error', async () => {
    invokeMock.mockResolvedValue({ data: null, error: { message: 'edge boom' } });
    await expect(submitQuoteRequest(payload)).rejects.toThrow('edge boom');
  });

  it('throws "submit_failed" when success is false and no message provided', async () => {
    invokeMock.mockResolvedValue({ data: { success: false }, error: null });
    await expect(submitQuoteRequest(payload)).rejects.toThrow('submit_failed');
  });

  it('throws the server-provided message when success is false', async () => {
    invokeMock.mockResolvedValue({
      data: { success: false, message: 'rate_limited' },
      error: null,
    });
    await expect(submitQuoteRequest(payload)).rejects.toThrow('rate_limited');
  });

  it('throws when quote_request_id is missing', async () => {
    invokeMock.mockResolvedValue({ data: { success: true }, error: null });
    await expect(submitQuoteRequest(payload)).rejects.toThrow('submit_failed');
  });
});

describe('Quote.tsx regression (A1)', () => {
  const src = readFileSync(resolve(__dirname, '../../../../pages/Quote.tsx'), 'utf8');

  it('does not directly invoke submit-quote-request from the page', () => {
    expect(src).not.toMatch(/supabase\.functions\.invoke\(\s*['"]submit-quote-request['"]/);
  });

  it('does not introduce a direct quote_requests table insert from the page', () => {
    expect(src).not.toMatch(/\.from\(\s*['"]quote_requests['"]\s*\)\s*\.insert/);
  });

  it('uses the submitQuoteRequest service wrapper', () => {
    expect(src).toMatch(/submitQuoteRequest\(/);
  });
});