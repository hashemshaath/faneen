export interface PasswordStrength {
  score: number; // 0-4
  label: 'weak' | 'medium' | 'strong' | 'very_strong';
  color: string;
  percentage: number;
}

export function checkPasswordStrength(password: string): PasswordStrength {
  let score = 0;

  if (password.length >= 8) score++;
  if (password.length >= 12) score++;
  if (/[a-z]/.test(password) && /[A-Z]/.test(password)) score++;
  if (/\d/.test(password)) score++;
  if (/[^a-zA-Z0-9]/.test(password)) score++;

  // Penalize common patterns
  if (/^(12345|password|qwerty|abcdef)/i.test(password)) score = Math.max(0, score - 2);
  if (/(.)\1{3,}/.test(password)) score = Math.max(0, score - 1); // Repeated chars

  const normalizedScore = Math.min(4, Math.max(0, score));

  const levels: Record<number, Omit<PasswordStrength, 'score'>> = {
    0: { label: 'weak', color: 'bg-destructive', percentage: 15 },
    1: { label: 'weak', color: 'bg-destructive', percentage: 25 },
    2: { label: 'medium', color: 'hsl(42 85% 55%)', percentage: 50 },
    3: { label: 'strong', color: 'hsl(142 76% 36%)', percentage: 75 },
    4: { label: 'very_strong', color: 'hsl(142 76% 36%)', percentage: 100 },
  };

  return { score: normalizedScore, ...levels[normalizedScore] };
}

export function validateEmail(email: string): boolean {
  if (!email || email.length > 255) return false;
  return /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(email.trim());
}

export function validatePhone(phone: string): boolean {
  // International: 7-15 digits after removing formatting
  const clean = phone.replace(/[\s\-()]/g, '');
  return /^\d{7,15}$/.test(clean);
}

export function validateUsername(username: string): boolean {
  if (!username || username.length < 3 || username.length > 50) return false;
  // Must start with letter, only lowercase alphanumeric, hyphens, underscores
  return /^[a-z][a-z0-9_-]{2,49}$/.test(username);
}

/** Sanitize string input - trim and remove control characters */
export function sanitizeInput(input: string): string {
  // eslint-disable-next-line no-control-regex
  return input.trim().replace(/[\x00-\x1F\x7F]/g, '');
}
