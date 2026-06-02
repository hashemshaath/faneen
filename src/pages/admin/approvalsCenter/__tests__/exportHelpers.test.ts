import { describe, it, expect } from 'vitest';
import {
  buildApprovalsCsv, buildAuditCsv, buildPdfHtml, escapeHtml,
  filterAuditRows, type AuditRow, type ExportRow,
} from '@/pages/admin/approvalsCenter/exportHelpers';

describe('exportHelpers — CSV/PDF builders', () => {
  it('CSV starts with UTF-8 BOM so Excel renders Arabic correctly', () => {
    const csv = buildApprovalsCsv([], true);
    expect(csv.charCodeAt(0)).toBe(0xFEFF);
  });

  it('CSV escapes embedded quotes and preserves commas/newlines inside fields', () => {
    const rows: ExportRow[] = [{
      category: 'Provider Review',
      ref_id: 'ENT-1000001',
      name: 'Acme "Glass", Co.\nLine2',
      detail: 'pending',
      created_at: '2026-06-01T10:00:00Z',
    }];
    const csv = buildApprovalsCsv(rows, false);
    // header + 1 data line (newline inside the quoted name is preserved)
    expect(csv).toContain('"Provider Review","ENT-1000001","Acme ""Glass"", Co.\nLine2","pending"');
  });

  it('Audit CSV uses Arabic headers when isRTL=true', () => {
    const csv = buildAuditCsv([], true);
    expect(csv).toContain('الإجراء');
    expect(csv).toContain('تاريخ القرار');
  });

  it('Audit CSV emits a row per decision with action + entity_id + reviewer', () => {
    const rows: AuditRow[] = [
      { id: '1', action: 'entity_access_request.approved', entity_type: 'entity_access_request', entity_id: 'EAR-1', user_id: 'USR-1', created_at: '2026-06-02T08:00:00Z' },
      { id: '2', action: 'entity_access_request.rejected', entity_type: 'entity_access_request', entity_id: 'EAR-2', user_id: 'USR-1', created_at: '2026-06-02T08:01:00Z' },
    ];
    const csv = buildAuditCsv(rows, false);
    const lines = csv.replace(/^\uFEFF/, '').split('\n');
    expect(lines).toHaveLength(3); // header + 2 rows
    expect(lines[1]).toContain('entity_access_request.approved');
    expect(lines[1]).toContain('EAR-1');
    expect(lines[2]).toContain('entity_access_request.rejected');
  });

  it('escapeHtml neutralises script-injection vectors', () => {
    expect(escapeHtml('<script>alert("x")</script>'))
      .toBe('&lt;script&gt;alert(&quot;x&quot;)&lt;/script&gt;');
  });

  it('buildPdfHtml sets RTL direction and embeds escaped cells only', () => {
    const html = buildPdfHtml({
      title: 'سجل', isRTL: true,
      headers: ['Action'], rows: [['<b>bold</b>']],
    });
    expect(html).toContain('dir="rtl"');
    expect(html).toContain('&lt;b&gt;bold&lt;/b&gt;');
    expect(html).not.toContain('<b>bold</b>');
  });
});

describe('exportHelpers — filterAuditRows', () => {
  const NOW = new Date('2026-06-02T12:00:00Z').getTime();
  const rows: AuditRow[] = [
    { id: '1', action: 'entity_access_request.approved', entity_type: 'entity_access_request', entity_id: 'EAR-1', created_at: new Date(NOW - 60 * 1000).toISOString() }, // 1 min ago
    { id: '2', action: 'business_tier_change',           entity_type: 'business',               entity_id: 'ENT-9', created_at: new Date(NOW - 3 * 24 * 3600_000).toISOString() }, // 3d ago
    { id: '3', action: 'role_assigned',                  entity_type: 'user_role',              entity_id: 'USR-7', created_at: new Date(NOW - 20 * 24 * 3600_000).toISOString() }, // 20d ago
    { id: '4', action: 'entity_access_request.rejected', entity_type: 'entity_access_request', entity_id: 'EAR-2', created_at: new Date(NOW - 60 * 24 * 3600_000).toISOString() }, // 60d ago
  ];

  it('returns all rows when range=all and search empty', () => {
    expect(filterAuditRows(rows, '', 'all', NOW)).toHaveLength(4);
  });

  it('24h range keeps only sub-day rows', () => {
    const out = filterAuditRows(rows, '', '24h', NOW);
    expect(out.map((r) => r.id)).toEqual(['1']);
  });

  it('7d range keeps rows within last week', () => {
    expect(filterAuditRows(rows, '', '7d', NOW).map((r) => r.id)).toEqual(['1', '2']);
  });

  it('30d range keeps rows within last month', () => {
    expect(filterAuditRows(rows, '', '30d', NOW).map((r) => r.id)).toEqual(['1', '2', '3']);
  });

  it('search matches action, entity_type, or entity_id (case-insensitive)', () => {
    expect(filterAuditRows(rows, 'APPROVED', 'all', NOW).map((r) => r.id)).toEqual(['1']);
    expect(filterAuditRows(rows, 'business', 'all', NOW).map((r) => r.id)).toEqual(['2']);
    expect(filterAuditRows(rows, 'EAR-', 'all', NOW).map((r) => r.id)).toEqual(['1', '4']);
  });

  it('search + date range compose correctly', () => {
    expect(filterAuditRows(rows, 'EAR-', '7d', NOW).map((r) => r.id)).toEqual(['1']);
  });
});

describe('exportHelpers — perf', () => {
  it('filterAuditRows handles 10k rows under 100ms', () => {
    const NOW = Date.now();
    const big: AuditRow[] = Array.from({ length: 10_000 }, (_, i) => ({
      id: String(i),
      action: i % 2 === 0 ? 'entity_access_request.approved' : 'role_assigned',
      entity_type: i % 3 === 0 ? 'entity_access_request' : 'business',
      entity_id: `EAR-${i}`,
      created_at: new Date(NOW - (i % 90) * 24 * 3600_000).toISOString(),
    }));
    const t0 = performance.now();
    const out = filterAuditRows(big, 'EAR-1', '30d', NOW);
    const ms = performance.now() - t0;
    expect(out.length).toBeGreaterThan(0);
    expect(ms).toBeLessThan(100);
  });

  it('buildAuditCsv serialises 5k rows under 250ms', () => {
    const NOW = Date.now();
    const big: AuditRow[] = Array.from({ length: 5_000 }, (_, i) => ({
      id: String(i),
      action: 'entity_access_request.approved',
      entity_type: 'entity_access_request',
      entity_id: `EAR-${i}`,
      user_id: 'USR-1000017',
      created_at: new Date(NOW - i * 1000).toISOString(),
    }));
    const t0 = performance.now();
    const csv = buildAuditCsv(big, false);
    const ms = performance.now() - t0;
    // header + 5000 data lines
    expect(csv.split('\n')).toHaveLength(5001);
    expect(ms).toBeLessThan(250);
  });
});