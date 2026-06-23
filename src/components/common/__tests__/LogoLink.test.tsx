import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, fireEvent, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { LogoLink } from '../LogoLink';

vi.mock('@/lib/analytics', () => ({
  trackEvent: vi.fn(),
}));

import { trackEvent } from '@/lib/analytics';

describe('LogoLink', () => {
  beforeEach(() => {
    (trackEvent as ReturnType<typeof vi.fn>).mockClear();
  });

  const renderAt = (initial: string, surface: 'public' | 'dashboard' | 'admin') =>
    render(
      <MemoryRouter initialEntries={[initial]}>
        <LogoLink surface={surface} ariaLabel="logo">
          <span>logo</span>
        </LogoLink>
      </MemoryRouter>,
    );

  it('routes public surface to /', () => {
    renderAt('/search?q=a', 'public');
    const a = screen.getByTestId('logo-link') as HTMLAnchorElement;
    expect(a.getAttribute('href')).toBe('/');
    expect(a.getAttribute('href')).not.toBe('#');
    expect(a.getAttribute('aria-label')).toBe('logo');
  });

  it('routes dashboard surface to /dashboard', () => {
    renderAt('/dashboard/sites', 'dashboard');
    expect(screen.getByTestId('logo-link').getAttribute('href')).toBe('/dashboard');
  });

  it('routes admin surface to /admin', () => {
    renderAt('/admin/anything', 'admin');
    expect(screen.getByTestId('logo-link').getAttribute('href')).toBe('/admin');
  });

  it('emits logo_click analytics with source/destination/surface/viewport', () => {
    renderAt('/search?q=foo', 'public');
    fireEvent.click(screen.getByTestId('logo-link'));
    expect(trackEvent).toHaveBeenCalledTimes(1);
    const [name, payload] = (trackEvent as ReturnType<typeof vi.fn>).mock.calls[0];
    expect(name).toBe('logo_click');
    expect(payload).toMatchObject({
      source_path: '/search?q=foo',
      destination_path: '/',
      surface: 'public',
    });
    expect(payload).toHaveProperty('viewport');
    expect(payload).toHaveProperty('direction');
  });
});