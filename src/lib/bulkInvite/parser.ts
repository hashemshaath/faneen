/**
 * Bulk Invite CSV parser + validator (pure, no I/O, no React).
 *
 * Used by the Identity Center > Bulk Invite tab. Extracted for unit
 * testing and to keep the React component thin. Every validation rule
 * emits a stable `code` so the UI can localise messages per column.
 */

export type BulkInviteRole = 'admin' | 'moderator' | 'user' | 'business';
export const ALLOWED_ROLES: readonly BulkInviteRole[] = [
  'admin',
  'moderator',
  'user',
  'business',
] as const;

export const BULK_INVITE_HEADERS = ['email', 'full_name', 'role', 'message'] as const;
export type BulkInviteHeader = (typeof BULK_INVITE_HEADERS)[number];

export type FieldErrorCode =
  | 'email_required'
  | 'email_invalid_format'
  | 'email_domain_invalid'
  | 'email_duplicate'
  | 'full_name_required'
  | 'full_name_too_long'
  | 'role_required'
  | 'role_invalid'
  | 'message_too_long';

export type FileErrorCode =
  | 'file_empty'
  | 'header_missing'
  | 'columns_missing'
  | 'unparseable';

export interface FieldError {
  field: BulkInviteHeader;
  code: FieldErrorCode;
}

export interface ParsedRow {
  line: number; // 1-based CSV line including the header row
  email: string;
  full_name: string;
  role: string;
  message: string;
  errors: FieldError[];
}

export interface ParseResult {
  rows: ParsedRow[];
  headerErrors: FileErrorCode[];
  missingColumns: BulkInviteHeader[];
}

// RFC-5322 lite + domain shape check (label.label, no consecutive dots,
// no leading/trailing dash, TLD >= 2 alphanumerics).
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const DOMAIN_LABEL = /^(?!-)[A-Za-z0-9-]{1,63}(?<!-)$/;
const FULL_NAME_MAX = 120;
const MESSAGE_MAX = 500;

export function isValidEmailDomain(domain: string): boolean {
  if (!domain || domain.length > 253) return false;
  if (domain.includes('..')) return false;
  const labels = domain.split('.');
  if (labels.length < 2) return false;
  const tld = labels[labels.length - 1];
  if (!/^[A-Za-z]{2,}$/.test(tld)) return false;
  return labels.every((l) => DOMAIN_LABEL.test(l));
}

/**
 * Minimal CSV tokenizer that supports quoted fields, escaped quotes,
 * and embedded commas / newlines. Returns rows as string arrays.
 */
export function tokenizeCsv(input: string): string[][] {
  const rows: string[][] = [];
  let row: string[] = [];
  let cell = '';
  let inQuotes = false;
  for (let i = 0; i < input.length; i++) {
    const ch = input[i];
    if (inQuotes) {
      if (ch === '"') {
        if (input[i + 1] === '"') {
          cell += '"';
          i++;
        } else {
          inQuotes = false;
        }
      } else {
        cell += ch;
      }
      continue;
    }
    if (ch === '"') {
      inQuotes = true;
    } else if (ch === ',') {
      row.push(cell);
      cell = '';
    } else if (ch === '\n' || ch === '\r') {
      if (ch === '\r' && input[i + 1] === '\n') i++;
      row.push(cell);
      rows.push(row);
      row = [];
      cell = '';
    } else {
      cell += ch;
    }
  }
  if (cell.length > 0 || row.length > 0) {
    row.push(cell);
    rows.push(row);
  }
  return rows.filter((r) => r.some((c) => c.trim().length > 0));
}

export function parseBulkInviteCsv(text: string): ParseResult {
  const stripped = text.replace(/^\uFEFF/, '');
  if (!stripped.trim()) {
    return { rows: [], headerErrors: ['file_empty'], missingColumns: [] };
  }
  let table: string[][];
  try {
    table = tokenizeCsv(stripped);
  } catch {
    return { rows: [], headerErrors: ['unparseable'], missingColumns: [] };
  }
  if (table.length === 0) {
    return { rows: [], headerErrors: ['file_empty'], missingColumns: [] };
  }
  const header = table[0].map((h) => h.trim().toLowerCase());
  const idx = {} as Record<BulkInviteHeader, number>;
  const missing: BulkInviteHeader[] = [];
  for (const h of BULK_INVITE_HEADERS) {
    idx[h] = header.indexOf(h);
    if (idx[h] < 0 && h !== 'message') missing.push(h);
  }
  const headerErrors: FileErrorCode[] = [];
  if (missing.length > 0) headerErrors.push('columns_missing');
  if (header.length === 0) headerErrors.push('header_missing');

  const seenEmails = new Set<string>();
  const rows: ParsedRow[] = table.slice(1).map((cells, i) => {
    const get = (h: BulkInviteHeader) => (idx[h] >= 0 ? (cells[idx[h]] ?? '').trim() : '');
    const email = get('email').toLowerCase();
    const full_name = get('full_name');
    const role = get('role').toLowerCase();
    const message = get('message');
    const errors: FieldError[] = [];

    if (!email) errors.push({ field: 'email', code: 'email_required' });
    else if (!EMAIL_RE.test(email)) errors.push({ field: 'email', code: 'email_invalid_format' });
    else {
      const domain = email.split('@')[1] ?? '';
      if (!isValidEmailDomain(domain)) errors.push({ field: 'email', code: 'email_domain_invalid' });
      if (seenEmails.has(email)) errors.push({ field: 'email', code: 'email_duplicate' });
      seenEmails.add(email);
    }

    if (!full_name) errors.push({ field: 'full_name', code: 'full_name_required' });
    else if (full_name.length > FULL_NAME_MAX)
      errors.push({ field: 'full_name', code: 'full_name_too_long' });

    if (!role) errors.push({ field: 'role', code: 'role_required' });
    else if (!ALLOWED_ROLES.includes(role as BulkInviteRole))
      errors.push({ field: 'role', code: 'role_invalid' });

    if (message.length > MESSAGE_MAX)
      errors.push({ field: 'message', code: 'message_too_long' });

    return { line: i + 2, email, full_name, role, message, errors };
  });

  return { rows, headerErrors, missingColumns: missing };
}

export function summarizeParseResult(result: ParseResult) {
  const valid = result.rows.filter((r) => r.errors.length === 0).length;
  return {
    total: result.rows.length,
    valid,
    invalid: result.rows.length - valid,
    hasFileError: result.headerErrors.length > 0,
  };
}

export const FIELD_ERROR_LABELS: Record<
  FieldErrorCode,
  { ar: string; en: string }
> = {
  email_required: { ar: 'البريد مطلوب', en: 'Email is required' },
  email_invalid_format: { ar: 'صيغة البريد غير صحيحة', en: 'Invalid email format' },
  email_domain_invalid: { ar: 'اسم النطاق غير صالح', en: 'Invalid email domain' },
  email_duplicate: { ar: 'البريد مكرر في الملف', en: 'Duplicate email in file' },
  full_name_required: { ar: 'الاسم مطلوب', en: 'Full name is required' },
  full_name_too_long: { ar: 'الاسم طويل جدًا', en: 'Full name too long' },
  role_required: { ar: 'الدور مطلوب', en: 'Role is required' },
  role_invalid: {
    ar: 'الدور غير مسموح (admin, moderator, user, business)',
    en: 'Role not allowed (admin, moderator, user, business)',
  },
  message_too_long: { ar: 'الرسالة طويلة جدًا', en: 'Message too long' },
};

export const FILE_ERROR_LABELS: Record<FileErrorCode, { ar: string; en: string }> = {
  file_empty: { ar: 'الملف فارغ', en: 'File is empty' },
  header_missing: { ar: 'صف العناوين مفقود', en: 'Header row missing' },
  columns_missing: { ar: 'أعمدة مطلوبة مفقودة', en: 'Required columns missing' },
  unparseable: { ar: 'تعذّر قراءة الملف', en: 'File could not be parsed' },
};