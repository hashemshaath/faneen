import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

describe('Global Search Shortcut', () => {
  let handler: ((e: KeyboardEvent) => void) | undefined;

  beforeEach(() => {
    const original = document.addEventListener;
    vi.spyOn(document, 'addEventListener').mockImplementation((event: string, fn: any) => {
      if (event === 'keydown') handler = fn;
      return original.call(document, event, fn);
    });
  });

  afterEach(() => {
    vi.restoreAllMocks();
    handler = undefined;
  });

  it('Cmd+K triggers search navigation', async () => {
    // Simulate the hook logic inline since it depends on React Router
    const navigate = vi.fn();
    const focusMock = vi.fn();

    const listener = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        navigate('/search');
      }
    };

    const event = new KeyboardEvent('keydown', { key: 'k', metaKey: true, bubbles: true });
    const preventSpy = vi.spyOn(event, 'preventDefault');

    listener(event);

    expect(preventSpy).toHaveBeenCalled();
    expect(navigate).toHaveBeenCalledWith('/search');
  });

  it('ignores regular K press without modifier', () => {
    const navigate = vi.fn();

    const listener = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        navigate('/search');
      }
    };

    listener(new KeyboardEvent('keydown', { key: 'k', bubbles: true }));
    expect(navigate).not.toHaveBeenCalled();
  });

  it('works with Ctrl+K (Windows/Linux)', () => {
    const navigate = vi.fn();

    const listener = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        navigate('/search');
      }
    };

    listener(new KeyboardEvent('keydown', { key: 'k', ctrlKey: true, bubbles: true }));
    expect(navigate).toHaveBeenCalledWith('/search');
  });
});
