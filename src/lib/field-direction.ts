/**
 * Global Forms RTL/LTR Hotfix — central direction resolver used by
 * `<Input />` and `<Textarea />` so individual forms don't have to
 * sprinkle `dir="ltr"` / `dir="auto"` across every page.
 *
 * Rules (callers can always override with an explicit `dir` prop):
 * 1. Technical input types (email, url, tel, number, date/time, color)
 *    and matching `inputMode` values → `ltr`.
 * 2. Field name/id matches a technical pattern (phone, mobile, email,
 *    slug, code, sku, iban, vat, cr, reference, url, website, domain,
 *    coupon, tracking, order/invoice/quote number, id/uuid) → `ltr`.
 * 3. Field name/id ends with `_en` (or `_en_…`) → `ltr`.
 * 4. Field name/id ends with `_ar` (or `_ar_…`) → `rtl`.
 * 5. Otherwise `auto` — supports mixed Arabic/Latin content without
 *    mirroring inside an RTL paragraph context.
 */

const LTR_INPUT_TYPES = new Set([
  "email",
  "url",
  "tel",
  "number",
  "date",
  "datetime-local",
  "month",
  "week",
  "time",
  "color",
]);

const LTR_INPUT_MODES = new Set([
  "numeric",
  "decimal",
  "tel",
  "email",
  "url",
]);

// Snake/kebab/camel tokens that mark a technical/LTR field by name.
const TECHNICAL_NAME_TOKENS = [
  "phone",
  "mobile",
  "whatsapp",
  "fax",
  "email",
  "mail",
  "url",
  "website",
  "site",
  "link",
  "domain",
  "slug",
  "code",
  "coupon",
  "tracking",
  "sku",
  "barcode",
  "iban",
  "swift",
  "bic",
  "vat",
  "tax",
  "cr",
  "reference",
  "ref",
  "uuid",
  "id",
  "order",
  "invoice",
  "receipt",
  "quote",
  "contract",
  "license",
  "ipaddress",
  "ip",
] as const;

const SUFFIX_AR = /(?:^|[_-])ar(?:[_-]|$)/i;
const SUFFIX_EN = /(?:^|[_-])en(?:[_-]|$)/i;

function normalizeIdentifier(value: string): string {
  // Split camelCase → snake-case-ish so we can match whole tokens.
  return value
    .replace(/([a-z0-9])([A-Z])/g, "$1_$2")
    .toLowerCase();
}

function isTechnicalName(name: string): boolean {
  const n = normalizeIdentifier(name);
  return TECHNICAL_NAME_TOKENS.some((t) => {
    const re = new RegExp(`(?:^|[_-])${t}(?:[_-]|s?$)`);
    return re.test(n);
  });
}

export type FieldDirectionInput = {
  type?: string;
  inputMode?: string;
  name?: string;
  id?: string;
};

export function resolveFieldDirection(
  input: FieldDirectionInput,
): "ltr" | "rtl" | "auto" {
  const { type, inputMode, name, id } = input;

  if (type && LTR_INPUT_TYPES.has(type)) return "ltr";
  if (inputMode && LTR_INPUT_MODES.has(inputMode)) return "ltr";

  const ident = name ?? id ?? "";
  if (ident) {
    if (SUFFIX_AR.test(ident)) return "rtl";
    if (SUFFIX_EN.test(ident)) return "ltr";
    if (isTechnicalName(ident)) return "ltr";
  }

  // Free-form text — let the browser pick based on first strong character.
  return "auto";
}