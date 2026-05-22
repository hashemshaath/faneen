import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { ContractLockBanner } from '../ContractLockBanner';

describe('ContractLockBanner', () => {
  it('renders Arabic copy when isRTL is true', () => {
    render(<ContractLockBanner isRTL />);
    expect(screen.getByText('العقد معتمد ومقفل')).toBeInTheDocument();
    expect(screen.getByText('أي تعديل يتطلب ملحق عقد وموافقة الطرفين')).toBeInTheDocument();
  });

  it('renders English copy when isRTL is false', () => {
    render(<ContractLockBanner isRTL={false} />);
    expect(screen.getByText('Contract Approved & Locked')).toBeInTheDocument();
    expect(
      screen.getByText('Any changes require an amendment approved by both parties'),
    ).toBeInTheDocument();
  });
});