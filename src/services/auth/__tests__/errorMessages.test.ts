import { describe, it, expect } from 'vitest';
import {
  translateAuthError,
  isRateLimitError,
  isNetworkError,
  getAuthErrorHelpLinks,
} from '../errorMessages';

describe('translateAuthError', () => {
  const commonErrors: Array<{ raw: string; expectedAr: string; expectedEn: string }> = [
    {
      raw: 'Invalid login credentials',
      expectedAr: 'البريد الإلكتروني أو كلمة المرور غير صحيحة',
      expectedEn: 'Incorrect email or password',
    },
    {
      raw: 'invalid_credentials',
      expectedAr: 'البريد الإلكتروني أو كلمة المرور غير صحيحة',
      expectedEn: 'Incorrect email or password',
    },
    {
      raw: 'Email not confirmed',
      expectedAr: 'يرجى تأكيد بريدك الإلكتروني أولاً',
      expectedEn: 'Please confirm your email first',
    },
    {
      raw: 'email_not_confirmed',
      expectedAr: 'يرجى تأكيد بريدك الإلكتروني أولاً',
      expectedEn: 'Please confirm your email first',
    },
    {
      raw: 'over_request_rate_limit',
      expectedAr: 'تم تجاوز الحد المسموح من المحاولات. يرجى الانتظار بضع دقائق ثم إعادة المحاولة.',
      expectedEn: 'Too many attempts. Please wait a few minutes and try again.',
    },
    {
      raw: 'Too many requests',
      expectedAr: 'تم تجاوز الحد المسموح من المحاولات. يرجى الانتظار بضع دقائق ثم إعادة المحاولة.',
      expectedEn: 'Too many attempts. Please wait a few minutes and try again.',
    },
    {
      raw: '429',
      expectedAr: 'تم تجاوز الحد المسموح من المحاولات. يرجى الانتظار بضع دقائق ثم إعادة المحاولة.',
      expectedEn: 'Too many attempts. Please wait a few minutes and try again.',
    },
    {
      raw: 'User not found',
      expectedAr: 'لا يوجد حساب مسجّل بهذا البريد الإلكتروني',
      expectedEn: 'No account found with this email',
    },
    {
      raw: 'User already registered',
      expectedAr: 'هذا البريد الإلكتروني مسجّل مسبقاً، جرّب تسجيل الدخول',
      expectedEn: 'This email is already registered, try logging in',
    },
    {
      raw: 'Failed to fetch',
      expectedAr: 'خطأ في الاتصال بالإنترنت، تحقق من اتصالك وحاول مجدداً',
      expectedEn: 'Connection error, check your internet and try again',
    },
    {
      raw: 'User banned',
      expectedAr: 'تم تعليق هذا الحساب، يرجى التواصل مع الدعم',
      expectedEn: 'This account has been suspended, please contact support',
    },
    {
      raw: 'Signups not allowed',
      expectedAr: 'التسجيل غير متاح حالياً',
      expectedEn: 'Signups are not available at this time',
    },
    {
      raw: 'same_password',
      expectedAr: 'كلمة المرور الجديدة يجب أن تختلف عن الحالية',
      expectedEn: 'New password must be different from the current one',
    },
    {
      raw: 'weak_password',
      expectedAr: 'كلمة المرور ضعيفة جداً، استخدم كلمة مرور أقوى',
      expectedEn: 'Password is too weak, use a stronger password',
    },
  ];

  it.each(commonErrors)(
    'translates "$raw" to Arabic when RTL',
    ({ raw, expectedAr }) => {
      expect(translateAuthError(raw, true)).toBe(expectedAr);
    },
  );

  it.each(commonErrors)(
    'translates "$raw" to English when LTR',
    ({ raw, expectedEn }) => {
      expect(translateAuthError(raw, false)).toBe(expectedEn);
    },
  );

  it('returns raw message as fallback for unknown errors', () => {
    const unknown = 'Something completely unexpected happened';
    expect(translateAuthError(unknown, true)).toBe(unknown);
    expect(translateAuthError(unknown, false)).toBe(unknown);
  });

  it('is case-insensitive', () => {
    expect(translateAuthError('INVALID LOGIN CREDENTIALS', true)).toBe(
      'البريد الإلكتروني أو كلمة المرور غير صحيحة',
    );
  });
});

describe('isRateLimitError', () => {
  it.each([
    'too_many_requests',
    'rate_limit exceeded',
    'Too many attempts',
    'over_request_rate_limit',
    'Error 429',
  ])('detects "%s" as rate limit', (msg) => {
    expect(isRateLimitError(msg)).toBe(true);
  });

  it('returns false for non-rate-limit errors', () => {
    expect(isRateLimitError('Invalid login credentials')).toBe(false);
  });
});

describe('isNetworkError', () => {
  it.each(['Network error', 'Failed to fetch', 'fetch timeout'])(
    'detects "%s" as network error',
    (msg) => {
      expect(isNetworkError(msg)).toBe(true);
    },
  );

  it('returns false for non-network errors', () => {
    expect(isNetworkError('Invalid login')).toBe(false);
  });
});

describe('getAuthErrorHelpLinks', () => {
  it('returns forgot-password link for invalid credentials (AR)', () => {
    const links = getAuthErrorHelpLinks('invalid login credentials', true);
    expect(links.length).toBeGreaterThanOrEqual(1);
    expect(links.some((l) => l.action === 'forgot-password')).toBe(true);
    expect(links[0].label).toMatch(/نسيت/);
  });

  it('returns forgot-password link for invalid credentials (EN)', () => {
    const links = getAuthErrorHelpLinks('invalid login credentials', false);
    expect(links.some((l) => l.action === 'forgot-password')).toBe(true);
    expect(links[0].label).toMatch(/Forgot/i);
  });

  it('returns resend-confirmation for unconfirmed email', () => {
    const links = getAuthErrorHelpLinks('email not confirmed', true);
    expect(links.some((l) => l.action === 'resend-confirmation')).toBe(true);
  });

  it('returns register link for user-not-found', () => {
    const links = getAuthErrorHelpLinks('user not found', false);
    expect(links.some((l) => l.action === 'register')).toBe(true);
  });

  it('returns empty array for unknown errors', () => {
    expect(getAuthErrorHelpLinks('unknown thing', true)).toEqual([]);
  });
});