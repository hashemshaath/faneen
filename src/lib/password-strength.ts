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

  // Normalize to 0-4
  const normalizedScore = Math.min(4, score);

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
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

export function validatePhone(phone: string): boolean {
  // Saudi phone: starts with 5, 9 digits
  return /^5\d{8}$/.test(phone.replace(/\s/g, ''));
}

export function validateUsername(username: string): boolean {
  return /^[a-zA-Z0-9_-]{3,50}$/.test(username);
}
