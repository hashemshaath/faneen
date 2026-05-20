/**
 * Centrally converts Arabic-Indic (٠-٩) and Eastern-Arabic (۰-۹) digits to
 * ASCII 0-9. Applied app-wide via the shared <Input> and <Textarea> wrappers
 * so any numeric input is always stored/submitted as English digits, even
 * when the user types or pastes Arabic numerals.
 */
export function normalizeDigits(value: string): string {
  if (!value) return value;
  return value
    .replace(/[\u0660-\u0669]/g, (d) => String(d.charCodeAt(0) - 0x0660))
    .replace(/[\u06F0-\u06F9]/g, (d) => String(d.charCodeAt(0) - 0x06F0));
}