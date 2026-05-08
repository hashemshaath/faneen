import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { renderHook } from '@testing-library/react';
import { LanguageProvider } from '@/i18n/LanguageContext';
import { Bi, useBi, pickBi } from '../Bilingual';

const wrap = (ui: React.ReactNode) => (
  <LanguageProvider>{ui}</LanguageProvider>
);

describe('Bilingual primitives', () => {
  it('pickBi returns ar when RTL', () => {
    expect(pickBi(true, 'مرحبا', 'Hello')).toBe('مرحبا');
    expect(pickBi(false, 'مرحبا', 'Hello')).toBe('Hello');
  });

  it('renders Bi defaulting to Arabic (default lang)', () => {
    render(wrap(<Bi ar="إضافة" en="Add" />));
    expect(screen.getByText('إضافة')).toBeInTheDocument();
  });

  it('renders custom tag', () => {
    render(wrap(<Bi as="h1" ar="عنوان" en="Title" />));
    expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent('عنوان');
  });

  it('useBi returns picker function', () => {
    const { result } = renderHook(() => useBi(), { wrapper: LanguageProvider });
    expect(result.current('عربي', 'English')).toBe('عربي');
  });
});