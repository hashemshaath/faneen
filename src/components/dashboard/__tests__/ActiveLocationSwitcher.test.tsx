import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';

const mockHook = vi.fn();
vi.mock('@/hooks/useActiveWorkspace', () => ({
  useActiveWorkspace: () => mockHook(),
}));
vi.mock('@/i18n/LanguageContext', () => ({
  useLanguage: () => ({ isRTL: false }),
}));

import { ActiveLocationSwitcher } from '@/components/dashboard/ActiveLocationSwitcher';

const baseLoc = (id: string, name: string, is_main = false) => ({
  id, name_ar: null, name_en: name, is_main, is_active: true,
});

beforeEach(() => mockHook.mockReset());

describe('ActiveLocationSwitcher', () => {
  it('renders nothing when there is no active entity', () => {
    mockHook.mockReturnValue({
      active_entity_id: null, active_location_id: null, locations: [],
      setActiveLocationId: vi.fn(), clearActiveLocationId: vi.fn(),
    });
    const { container } = render(<ActiveLocationSwitcher />);
    expect(container).toBeEmptyDOMElement();
  });

  it('renders nothing when entity has zero locations', () => {
    mockHook.mockReturnValue({
      active_entity_id: 'b1', active_location_id: null, locations: [],
      setActiveLocationId: vi.fn(), clearActiveLocationId: vi.fn(),
    });
    const { container } = render(<ActiveLocationSwitcher />);
    expect(container).toBeEmptyDOMElement();
  });

  it('renders read-only label when entity has one location', () => {
    mockHook.mockReturnValue({
      active_entity_id: 'b1', active_location_id: null,
      locations: [baseLoc('l1', 'Main', true)],
      setActiveLocationId: vi.fn(), clearActiveLocationId: vi.fn(),
    });
    render(<ActiveLocationSwitcher />);
    expect(screen.getByTestId('active-location-readonly')).toHaveTextContent('Main');
    expect(screen.queryByTestId('active-location-trigger')).toBeNull();
  });

  it('renders selector with All locations + each accessible location when 2+', () => {
    const setActiveLocationId = vi.fn();
    const clearActiveLocationId = vi.fn();
    mockHook.mockReturnValue({
      active_entity_id: 'b1', active_location_id: null,
      locations: [baseLoc('l1', 'Main', true), baseLoc('l2', 'Branch B')],
      setActiveLocationId, clearActiveLocationId,
    });
    render(<ActiveLocationSwitcher />);
    const trigger = screen.getByTestId('active-location-trigger');
    expect(trigger).toHaveTextContent('All locations');
    fireEvent.click(trigger);
    expect(screen.getByTestId('active-location-option-all')).toBeInTheDocument();
    expect(screen.getByTestId('active-location-option-l1')).toHaveTextContent('Main');
    expect(screen.getByTestId('active-location-option-l2')).toHaveTextContent('Branch B');
  });

  it('calls setActiveLocationId when picking a specific location', () => {
    const setActiveLocationId = vi.fn();
    mockHook.mockReturnValue({
      active_entity_id: 'b1', active_location_id: null,
      locations: [baseLoc('l1', 'Main', true), baseLoc('l2', 'Branch B')],
      setActiveLocationId, clearActiveLocationId: vi.fn(),
    });
    render(<ActiveLocationSwitcher />);
    fireEvent.click(screen.getByTestId('active-location-trigger'));
    fireEvent.click(screen.getByTestId('active-location-option-l2'));
    expect(setActiveLocationId).toHaveBeenCalledWith('l2');
  });

  it('calls clearActiveLocationId when picking All locations', () => {
    const clearActiveLocationId = vi.fn();
    mockHook.mockReturnValue({
      active_entity_id: 'b1', active_location_id: 'l1',
      locations: [baseLoc('l1', 'Main', true), baseLoc('l2', 'Branch B')],
      setActiveLocationId: vi.fn(), clearActiveLocationId,
    });
    render(<ActiveLocationSwitcher />);
    fireEvent.click(screen.getByTestId('active-location-trigger'));
    fireEvent.click(screen.getByTestId('active-location-option-all'));
    expect(clearActiveLocationId).toHaveBeenCalled();
  });

  it('only renders locations returned by the workspace hook (no extra ids)', () => {
    mockHook.mockReturnValue({
      active_entity_id: 'b1', active_location_id: null,
      locations: [baseLoc('l1', 'Main', true), baseLoc('l2', 'B')],
      setActiveLocationId: vi.fn(), clearActiveLocationId: vi.fn(),
    });
    render(<ActiveLocationSwitcher />);
    fireEvent.click(screen.getByTestId('active-location-trigger'));
    expect(screen.queryByTestId('active-location-option-l-ghost')).toBeNull();
  });
});