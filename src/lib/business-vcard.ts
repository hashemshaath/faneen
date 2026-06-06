/**
 * Generates and downloads a vCard 3.0 file for a business.
 * Uses only public-safe fields. Triggered from BusinessProfile share menu.
 */

export interface BusinessVCardInput {
  name: string;
  org?: string | null;
  title?: string | null;
  url?: string | null;
  phones?: Array<string | null | undefined>;
  emails?: Array<string | null | undefined>;
  address?: {
    street?: string | null;
    city?: string | null;
    region?: string | null;
    country?: string | null;
  };
  note?: string | null;
}

const escapeVCard = (value: string): string =>
  value.replace(/\\/g, "\\\\").replace(/;/g, "\\;").replace(/,/g, "\\,").replace(/\r?\n/g, "\\n");

export const buildVCard = (input: BusinessVCardInput): string => {
  const lines: string[] = ["BEGIN:VCARD", "VERSION:3.0"];
  lines.push(`FN:${escapeVCard(input.name)}`);
  if (input.org) lines.push(`ORG:${escapeVCard(input.org)}`);
  if (input.title) lines.push(`TITLE:${escapeVCard(input.title)}`);
  (input.phones ?? [])
    .filter((p): p is string => !!p && p.trim().length > 0)
    .forEach((p) => lines.push(`TEL;TYPE=WORK,VOICE:${escapeVCard(p.trim())}`));
  (input.emails ?? [])
    .filter((e): e is string => !!e && e.trim().length > 0)
    .forEach((e) => lines.push(`EMAIL;TYPE=WORK:${escapeVCard(e.trim())}`));
  if (input.url) lines.push(`URL:${escapeVCard(input.url)}`);
  const a = input.address;
  if (a && (a.street || a.city || a.region || a.country)) {
    lines.push(
      `ADR;TYPE=WORK:;;${escapeVCard(a.street ?? "")};${escapeVCard(a.city ?? "")};${escapeVCard(a.region ?? "")};;${escapeVCard(a.country ?? "")}`,
    );
  }
  if (input.note) lines.push(`NOTE:${escapeVCard(input.note)}`);
  lines.push("END:VCARD");
  return lines.join("\r\n");
};

export const downloadVCard = (input: BusinessVCardInput, fileBase = "contact"): void => {
  if (typeof window === "undefined" || typeof document === "undefined") return;
  const vcf = buildVCard(input);
  const blob = new Blob([vcf], { type: "text/vcard;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = `${fileBase.replace(/[^a-z0-9-_]+/gi, "-").slice(0, 40) || "contact"}.vcf`;
  document.body.appendChild(link);
  link.click();
  link.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
};