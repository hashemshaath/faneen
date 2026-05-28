import { describe, it, expect } from 'vitest';
import { detectModuleFromPath, detectRefFromUrl } from '@/hooks/useWorkspaceContext';

describe('APP-SHELL-2 — workspace context detection', () => {
  it('detects modules from path prefix', () => {
    expect(detectModuleFromPath('/dashboard/work-orders')).toBe('work-orders');
    expect(detectModuleFromPath('/dashboard/work-orders/123')).toBe('work-orders');
    expect(detectModuleFromPath('/dashboard/operations/feed')).toBe('operations');
    expect(detectModuleFromPath('/dashboard/contracts')).toBe('contracts');
    expect(detectModuleFromPath('/dashboard/settings/staff')).toBe('staff');
    expect(detectModuleFromPath('/dashboard/settings')).toBe('settings');
    expect(detectModuleFromPath('/admin/foo')).toBe('admin');
    expect(detectModuleFromPath('/random')).toBe('unknown');
  });

  it('extracts ref from ?ref query', () => {
    expect(detectRefFromUrl('/dashboard/work-orders', '?ref=WO-1000042')).toBe('WO-1000042');
    expect(detectRefFromUrl('/dashboard/work-orders', '?foo=bar')).toBeNull();
  });

  it('extracts ref from path segment', () => {
    expect(detectRefFromUrl('/dashboard/work-orders/WO-1000042', '')).toBe('WO-1000042');
    expect(detectRefFromUrl('/dashboard/contracts/CNT-9999', '')).toBe('CNT-9999');
  });

  it('returns null for unparseable refs', () => {
    expect(detectRefFromUrl('/dashboard/contracts/abc', '')).toBeNull();
  });
});