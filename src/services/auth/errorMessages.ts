/**
 * Centralized auth error message translations.
 * Used by LoginForm, ForgotPasswordForm, and any auth-related component.
 */

interface ErrorMapping {
  patterns: string[];
  ar: string;
  en: string;
}

const ERROR_MAPPINGS: ErrorMapping[] = [
  {
    patterns: ['invalid login', 'invalid_credentials'],
    ar: 'البريد الإلكتروني أو كلمة المرور غير صحيحة',
    en: 'Incorrect email or password',
  },
  {
    patterns: ['email not confirmed', 'email_not_confirmed'],
    ar: 'يرجى تأكيد بريدك الإلكتروني أولاً',
    en: 'Please confirm your email first',
  },
  {
    patterns: ['too_many_requests', 'rate_limit', 'too many', 'over_request_rate_limit', '429'],
    ar: 'تم تجاوز الحد المسموح من المحاولات. يرجى الانتظار بضع دقائق ثم إعادة المحاولة.',
    en: 'Too many attempts. Please wait a few minutes and try again.',
  },
  {
    patterns: ['user not found', 'no user'],
    ar: 'لا يوجد حساب مسجّل بهذا البريد الإلكتروني',
    en: 'No account found with this email',
  },
  {
    patterns: ['user already registered', 'already_exists', 'already registered'],
    ar: 'هذا البريد الإلكتروني مسجّل مسبقاً، جرّب تسجيل الدخول',
    en: 'This email is already registered, try logging in',
  },
  {
    patterns: ['network', 'fetch', 'failed to fetch'],
    ar: 'خطأ في الاتصال بالإنترنت، تحقق من اتصالك وحاول مجدداً',
    en: 'Connection error, check your internet and try again',
  },
  {
    patterns: ['user banned', 'banned'],
    ar: 'تم تعليق هذا الحساب، يرجى التواصل مع الدعم',
    en: 'This account has been suspended, please contact support',
  },
  {
    patterns: ['signups not allowed', 'signup_disabled'],
    ar: 'التسجيل غير متاح حالياً',
    en: 'Signups are not available at this time',
  },
  {
    patterns: ['same_password'],
    ar: 'كلمة المرور الجديدة يجب أن تختلف عن الحالية',
    en: 'New password must be different from the current one',
  },
  {
    patterns: ['weak_password'],
    ar: 'كلمة المرور ضعيفة جداً، استخدم كلمة مرور أقوى',
    en: 'Password is too weak, use a stronger password',
  },
];

/**
 * Translates a raw Supabase/auth error message into a user-friendly
 * Arabic or English message based on the `isRTL` flag.
 */
export function translateAuthError(rawMessage: string, isRTL: boolean): string {
  const lower = rawMessage.toLowerCase();

  for (const mapping of ERROR_MAPPINGS) {
    if (mapping.patterns.some((p) => lower.includes(p))) {
      return isRTL ? mapping.ar : mapping.en;
    }
  }

  // Fallback: return the original message
  return rawMessage;
}

/**
 * Returns true if the error is a rate-limit / too-many-attempts error.
 */
export function isRateLimitError(rawMessage: string): boolean {
  const lower = rawMessage.toLowerCase();
  return ['too_many_requests', 'rate_limit', 'too many', 'over_request_rate_limit', '429']
    .some((p) => lower.includes(p));
}

/**
 * Returns true if the error is a network/connectivity error.
 */
export function isNetworkError(rawMessage: string): boolean {
  const lower = rawMessage.toLowerCase();
  return ['network', 'fetch', 'failed to fetch'].some((p) => lower.includes(p));
}