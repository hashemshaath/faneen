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

/**
 * Encode an email using HTML entities to defeat naive scraper bots
 * that scan raw HTML/JSON-LD for `name@domain` patterns.
 * Browsers decode entities transparently so `mailto:` and display still work.
 * Note: not a substitute for true privacy — only an anti-harvest deterrent.
 */
export function obfuscateEmail(email: string | null | undefined): string {
  if (!email) return '';
  return email
    .split('')
    .map((c) => `&#${c.charCodeAt(0)};`)
    .join('');
}

/**
 * Mask a personal full name for previews (e.g., reviewer lists).
 * Keeps the first word visible and abbreviates the rest: "Ahmed Al-Saud" → "Ahmed A.".
 */
export function maskName(name: string | null | undefined): string {
  if (!name) return '—';
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return '—';
  if (parts.length === 1) return parts[0];
  return `${parts[0]} ${parts[1][0]}.`;
}