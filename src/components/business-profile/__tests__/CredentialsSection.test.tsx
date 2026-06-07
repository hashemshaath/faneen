import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { LanguageProvider } from '@/i18n/LanguageContext';
import { CredentialsSection } from '../CredentialsSection';

const cert = {
  id: 'c1',
  business_id: 'b',
  name_ar: 'شهادة الأيزو 9001',
  name_en: 'ISO 9001',
  issuer_ar: 'الهيئة السعودية للمواصفات',
  issuer_en: 'SASO',
  credential_number: 'ISO-9001-12345',
  credential_url: 'https://example.com/cert',
  logo_url: null,
  proof_document_url: null,
  issued_at: '2023-01-15',
  expires_at: '2099-01-15',
  is_active: true,
  display_order: 0,
  verified_by_admin: true,
  verified_at: null,
  verified_by: null,
  created_at: '2023-01-15T00:00:00Z',
  updated_at: '2023-01-15T00:00:00Z',
};

const award = {
  id: 'a1',
  business_id: 'b',
  title_ar: 'جائزة التميّز الصناعي',
  title_en: 'Industrial Excellence Award',
  issuer_ar: 'وزارة الصناعة',
  issuer_en: 'Ministry of Industry',
  description_ar: null,
  description_en: null,
  awarded_year: 2024,
  rank: 'winner' as const,
  category_ar: null,
  category_en: null,
  image_url: null,
  proof_url: null,
  is_active: true,
  display_order: 0,
  verified_by_admin: false,
  verified_at: null,
  verified_by: null,
  created_at: '2024-01-01T00:00:00Z',
  updated_at: '2024-01-01T00:00:00Z',
};

describe('CredentialsSection', () => {
  it('renders nothing when both lists are empty (no layout shift)', () => {
    const { container } = render(
      <LanguageProvider>
        <CredentialsSection certifications={[]} awards={[]} />
      </LanguageProvider>,
    );
    expect(container).toBeEmptyDOMElement();
  });

  it('renders certifications with verified badge and credential link', () => {
    render(
      <LanguageProvider>
        <CredentialsSection certifications={[cert]} awards={[]} />
      </LanguageProvider>,
    );
    expect(screen.getByText('شهادة الأيزو 9001')).toBeInTheDocument();
    expect(screen.getByText('الهيئة السعودية للمواصفات')).toBeInTheDocument();
    expect(screen.getByText('#ISO-9001-12345')).toBeInTheDocument();
    expect(
      screen.getByRole('link', { name: /فتح رابط الشهادة|Open credential link/ }),
    ).toHaveAttribute('href', 'https://example.com/cert');
    // verified shield (aria-label)
    expect(screen.getByLabelText(/موثّقة|Verified/)).toBeInTheDocument();
  });

  it('renders awards with rank label and year', () => {
    render(
      <LanguageProvider>
        <CredentialsSection certifications={[]} awards={[award]} />
      </LanguageProvider>,
    );
    expect(screen.getByText('جائزة التميّز الصناعي')).toBeInTheDocument();
    expect(screen.getByText('2024')).toBeInTheDocument();
    // 'winner' rank label
    expect(screen.getByText('الفائز')).toBeInTheDocument();
  });
});