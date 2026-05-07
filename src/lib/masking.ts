/**
 * Mask sensitive PII for display when the viewer is not authorized.
 * Logic-only utilities — no side effects.
 */

export function maskEmail(email: string | null | undefined): string {
  if (!email) return '—';
  const [user, domain] = email.split('@');
  if (!domain) return '••••••';
  const u = user.length <= 2 ? user[0] + '•' : user.slice(0, 2) + '•'.repeat(Math.max(2, user.length - 2));
  const [d, ...rest] = domain.split('.');
  const dm = d.length <= 2 ? d[0] + '•' : d[0] + '•'.repeat(Math.max(2, d.length - 2));
  return `${u}@${dm}${rest.length ? '.' + rest.join('.') : ''}`;
}

export function maskPhone(phone: string | null | undefined): string {
  if (!phone) return '—';
  const digits = phone.replace(/\D/g, '');
  if (digits.length < 4) return '•'.repeat(digits.length || 3);
  const tail = digits.slice(-3);
  const head = phone.startsWith('+') ? '+' : '';
  return `${head}${'•'.repeat(Math.max(3, digits.length - 3))}${tail}`;
}