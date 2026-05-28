/**
 * BUSINESS-WORKFLOW-5D — Printable bilingual quotation document.
 *
 * Pure presentational component. NO supabase, NO fetch. Caller passes a
 * prepared `QuotationPdfData` (see `generateQuotationPdfData`). Browser
 * print-to-PDF is the only export path — no puppeteer, no SaaS, no cloud
 * render.
 */
import type { QuotationPdfData } from "@/modules/workOrders";

interface Props {
  data: QuotationPdfData;
  isRTL: boolean;
}

function fmtMoney(n: number, currency: string): string {
  const v = Number.isFinite(n) ? n : 0;
  return `${v.toFixed(2)} ${currency}`;
}

function fmtDate(iso: string | null): string {
  if (!iso) return "—";
  try {
    const d = new Date(iso);
    if (Number.isNaN(d.getTime())) return "—";
    return d.toISOString().slice(0, 10);
  } catch {
    return "—";
  }
}

export function WorkOrderQuotationPdf({ data, isRTL }: Props) {
  const t = isRTL
    ? {
        quotation: "عرض سعر",
        number: "رقم العرض",
        issued: "تاريخ الإصدار",
        valid_until: "صالح حتى",
        item: "البند",
        qty: "الكمية",
        unit: "الوحدة",
        unit_price: "سعر الوحدة",
        total: "الإجمالي",
        subtotal: "المجموع",
        tax: "ضريبة القيمة المضافة (15%)",
        grand_total: "الإجمالي النهائي",
        notes: "ملاحظات",
        status: "الحالة",
      }
    : {
        quotation: "Quotation",
        number: "Quote #",
        issued: "Issue date",
        valid_until: "Valid until",
        item: "Item",
        qty: "Qty",
        unit: "Unit",
        unit_price: "Unit price",
        total: "Total",
        subtotal: "Subtotal",
        tax: "VAT (15%)",
        grand_total: "Grand total",
        notes: "Notes",
        status: "Status",
      };

  const businessName =
    (isRTL ? data.business.name_ar : data.business.name_en) ||
    data.business.name_ar ||
    data.business.name_en ||
    "";

  return (
    <article
      dir={isRTL ? "rtl" : "ltr"}
      data-testid="wo-quotation-pdf"
      className="bg-white text-black mx-auto print:mx-0 print:my-0 max-w-[820px] p-8 text-[12px] leading-relaxed"
      style={{ fontFamily: 'IBM Plex Sans Arabic, system-ui, sans-serif' }}
    >
      <header className="flex items-start justify-between gap-4 border-b border-black/20 pb-4 mb-4">
        <div className="min-w-0">
          {data.business.logo_url ? (
            <img
              src={data.business.logo_url}
              alt={businessName}
              className="h-12 w-auto object-contain mb-2"
            />
          ) : null}
          <div className="font-semibold text-base truncate">{businessName}</div>
        </div>
        <div className="text-end">
          <div className="font-bold text-lg">{t.quotation}</div>
          <div className="text-[11px] mt-1">
            <span className="opacity-70">{t.number}:</span>{" "}
            <span className="font-mono">{data.quotation_number || data.ref_id}</span>
          </div>
          <div className="text-[11px]">
            <span className="opacity-70">{t.issued}:</span> {fmtDate(data.issue_date)}
          </div>
          <div className="text-[11px]">
            <span className="opacity-70">{t.valid_until}:</span>{" "}
            {fmtDate(data.valid_until)}
          </div>
          <div className="text-[11px]">
            <span className="opacity-70">{t.status}:</span> {data.status}
          </div>
        </div>
      </header>

      <h1 className="text-sm font-semibold mb-3">{data.title}</h1>

      <table className="w-full border-collapse mb-4" data-testid="wo-quotation-pdf-table">
        <thead>
          <tr className="bg-black/[0.04]">
            <th className="border border-black/20 p-2 text-[11px] w-8">#</th>
            <th className="border border-black/20 p-2 text-[11px] text-start">{t.item}</th>
            <th className="border border-black/20 p-2 text-[11px] w-16">{t.qty}</th>
            <th className="border border-black/20 p-2 text-[11px] w-16">{t.unit}</th>
            <th className="border border-black/20 p-2 text-[11px] w-24">{t.unit_price}</th>
            <th className="border border-black/20 p-2 text-[11px] w-24">{t.total}</th>
          </tr>
        </thead>
        <tbody>
          {data.lines.map((line) => (
            <tr key={line.ref_id ?? `${line.index}`}>
              <td className="border border-black/20 p-2 text-center">{line.index}</td>
              <td className="border border-black/20 p-2">
                <div className="font-medium">{isRTL ? line.title_ar : line.title_en}</div>
                <div className="text-[10px] opacity-60">
                  {isRTL ? line.title_en : line.title_ar}
                </div>
              </td>
              <td className="border border-black/20 p-2 text-center tech-content">
                {line.quantity.toFixed(2)}
              </td>
              <td className="border border-black/20 p-2 text-center">{line.unit}</td>
              <td className="border border-black/20 p-2 text-end tech-content">
                {fmtMoney(line.unit_price, data.currency)}
              </td>
              <td className="border border-black/20 p-2 text-end tech-content">
                {fmtMoney(line.total_price, data.currency)}
              </td>
            </tr>
          ))}
        </tbody>
      </table>

      <section className="flex justify-end">
        <table className="text-[12px]">
          <tbody>
            <tr>
              <td className="px-3 py-1 opacity-70">{t.subtotal}</td>
              <td
                className="px-3 py-1 text-end font-medium tech-content"
                data-testid="wo-quotation-pdf-subtotal"
              >
                {fmtMoney(data.subtotal, data.currency)}
              </td>
            </tr>
            <tr>
              <td className="px-3 py-1 opacity-70">{t.tax}</td>
              <td className="px-3 py-1 text-end font-medium tech-content">
                {fmtMoney(data.tax, data.currency)}
              </td>
            </tr>
            <tr className="border-t border-black/30">
              <td className="px-3 py-2 font-semibold">{t.grand_total}</td>
              <td
                className="px-3 py-2 text-end font-bold tech-content"
                data-testid="wo-quotation-pdf-total"
              >
                {fmtMoney(data.total, data.currency)}
              </td>
            </tr>
          </tbody>
        </table>
      </section>

      {data.notes ? (
        <section className="mt-6 border-t border-black/20 pt-3">
          <div className="font-semibold text-[11px] mb-1">{t.notes}</div>
          <p className="text-[11px] whitespace-pre-wrap">{data.notes}</p>
        </section>
      ) : null}
    </article>
  );
}