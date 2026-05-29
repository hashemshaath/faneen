import { describe, expect, it, vi, beforeEach } from 'vitest';

const addComment = vi.fn(async (..._a: unknown[]) => ({ data: { id: 'c1' }, error: null }));
const notifyFaf = vi.fn((..._a: unknown[]) => undefined);

vi.mock('@/modules/workOrders', () => ({
  addWorkOrderComment: (...a: unknown[]) => addComment.apply(null, a),
}));
vi.mock('@/modules/notifications', () => ({
  createNotificationFireAndForget: (...a: unknown[]) => notifyFaf.apply(null, a),
}));
vi.mock('../services/rfqs', () => ({
  getRfqById: vi.fn(async () => ({
    data: {
      id: 'rfq1',
      business_id: 'b1',
      procurement_request_id: 'req1',
      rfq_number: null,
      status: 'closed',
      due_at: null,
      expires_at: null,
      sent_at: null,
      closed_at: null,
      awarded_quote_id: 'q1',
      created_by: 'u',
      created_at: '',
      updated_at: '',
    },
    error: null,
  })),
}));
vi.mock('../services/procurementRequests', () => ({
  getProcurementRequestById: vi.fn(async () => ({
    data: {
      id: 'req1',
      business_id: 'b1',
      work_order_id: 'wo1',
      title: 't',
      description: null,
      status: 'awarded',
      needed_by: null,
      created_by: 'u',
      created_at: '',
      updated_at: '',
    },
    error: null,
  })),
}));

import { executeAwardHandoff } from '../services/awardHandoff';

beforeEach(() => {
  addComment.mockClear();
  notifyFaf.mockClear();
});

describe('executeAwardHandoff', () => {
  it('posts a work-order comment via approved wrapper and fans out notifications', async () => {
    const res = await executeAwardHandoff({
      quote_id: 'q1',
      rfq_id: 'rfq1',
      actor_user_id: 'u1',
      notify_user_ids: ['u1', 'u2'],
    });
    expect(res.work_order_id).toBe('wo1');
    expect(res.commented).toBe(true);
    expect(addComment).toHaveBeenCalledTimes(1);
    expect(notifyFaf).toHaveBeenCalledTimes(2);
  });

  it('skips WO comment when actor missing', async () => {
    addComment.mockClear();
    await executeAwardHandoff({ quote_id: 'q1', rfq_id: 'rfq1' });
    expect(addComment).not.toHaveBeenCalled();
  });
});