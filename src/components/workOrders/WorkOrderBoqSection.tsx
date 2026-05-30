/**
 * BUSINESS-WORKFLOW-5C — Bill of Quantities (BOQ) section.
 *
 * Inline UI (no modals). Generates a draft BOQ from existing measurements,
 * lets the manager set pricing per line, and finalize the BOQ to lock it.
 * Measurements are NEVER mutated. No payment/invoice/notification logic.
 */
import { useCallback, useEffect, useMemo, useState } from "react";
import {
  Loader2,
  AlertCircle,
  Calculator,
  Sparkles,
  Lock,
  CheckCircle2,
  ShoppingCart,
} from "lucide-react";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { ReferenceTag } from "@/components/reference/ReferenceTag";
import { useAuth } from "@/contexts/AuthContext";
import { useLanguage } from "@/i18n/LanguageContext";
import {
  listWorkOrderMeasurements,
  listWorkOrderBoqs,
  listBoqItems,
  createBoqFromMeasurements,
  updateBoqItemPricing,
  finalizeBoq,
  recomputeBoqTotals,
  computeBoqTotals,
  BOQ_SECTOR_KEYS,
  type BoqSectorKey,
  type WorkOrderBoqRow,
  type WorkOrderBoqItemRow,
} from "@/modules/workOrders";
import { RelatedReferencesPanel } from "@/components/reference/RelatedReferencesPanel";
import { createProcurementRfqFromBoq } from "@/modules/procurement";
import { ApprovedBrandPicker } from "@/components/brands/ApprovedBrandPicker";
import { listApprovedBrandsByIds } from "@/modules/brands";
import {
  describeBrandLock,
  type BrandLock,
} from "@/modules/brands/lib/brandSelectionRules";

interface Props {
  workOrderId: string;
  businessId: string;
  canManage: boolean;
  /** Optional WO ref id (e.g. WO-1000001) — surfaced in related references. */
  workOrderRefId?: string | null;
}

function fmt2(n: number | null | undefined): string {
  const v = Number.isFinite(n as number) ? (n as number) : 0;
  return v.toFixed(2);
}

export function WorkOrderBoqSection({ workOrderId, businessId, canManage, workOrderRefId }: Props) {
  const { user } = useAuth();
  const { isRTL } = useLanguage();

  const [boqs, setBoqs] = useState<WorkOrderBoqRow[]>([]);
  const [activeBoqId, setActiveBoqId] = useState<string | null>(null);
  const [items, setItems] = useState<WorkOrderBoqItemRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Generate form (inline)
  const [generateOpen, setGenerateOpen] = useState(false);
  const [sector, setSector] = useState<BoqSectorKey>("aluminum");
  const [title, setTitle] = useState("");
  const [notes, setNotes] = useState("");
  const [rfqRefId, setRfqRefId] = useState<{ rfqId: string; rfqNumber: string | null } | null>(null);

  // RFQ-BRAND-PICKER-1C — resolved approved-brand labels for items in view.
  const [brandLabels, setBrandLabels] = useState<
    Record<string, { name_ar: string; name_en: string; ref_id: string | null; slug: string }>
  >({});

  const tx = useMemo(
    () => ({
      title: isRTL ? "جدول الكميات" : "Bill of Quantities",
      generate: isRTL ? "إنشاء جدول كميات" : "Generate BOQ",
      sector: isRTL ? "القطاع" : "Sector",
      titleLabel: isRTL ? "العنوان" : "Title",
      notes: isRTL ? "ملاحظات" : "Notes",
      cancel: isRTL ? "إلغاء" : "Cancel",
      create: isRTL ? "إنشاء" : "Create",
      empty: isRTL
        ? "لا توجد جداول كميات لهذا الأمر بعد."
        : "No bills of quantities yet for this order.",
      noMeasurements: isRTL
        ? "لا توجد مقاسات لتوليد جدول الكميات منها."
        : "No measurements available to generate a BOQ from.",
      drafts: isRTL ? "مسودات" : "Drafts",
      finalized: isRTL ? "معتمدة" : "Finalized",
      draft: isRTL ? "مسودة" : "Draft",
      pricing: isRTL ? "التسعير" : "Pricing",
      itemTitle: isRTL ? "البند" : "Item",
      qty: isRTL ? "الكمية" : "Qty",
      unit: isRTL ? "الوحدة" : "Unit",
      unitPrice: isRTL ? "سعر الوحدة" : "Unit price",
      lineTotal: isRTL ? "الإجمالي" : "Line total",
      type: isRTL ? "النوع" : "Type",
      subtotal: isRTL ? "المجموع" : "Subtotal",
      tax: isRTL ? "ضريبة القيمة المضافة (15%)" : "VAT (15%)",
      total: isRTL ? "الإجمالي النهائي" : "Total",
      finalize: isRTL ? "اعتماد الجدول" : "Finalize BOQ",
      confirmFinalize: isRTL
        ? "بعد الاعتماد لن يمكن تعديل الجدول."
        : "Once finalized, the BOQ cannot be edited.",
      errLoad: isRTL ? "تعذّر تحميل البيانات." : "Failed to load data.",
      errGen: isRTL ? "تعذّر إنشاء الجدول." : "Failed to generate BOQ.",
      errUpdate: isRTL ? "تعذّر حفظ التسعير." : "Failed to save pricing.",
      errFinalize: isRTL ? "تعذّر اعتماد الجدول." : "Failed to finalize BOQ.",
      noItems: isRTL ? "لا توجد بنود في هذا الجدول." : "No items in this BOQ.",
      created: isRTL ? "أُنشئ" : "Created",
      view: isRTL ? "عرض" : "Open",
      itemTypeMaterial: isRTL ? "مادة" : "Material",
      itemTypeLabor: isRTL ? "عمالة" : "Labor",
      itemTypeService: isRTL ? "خدمة" : "Service",
      itemTypeFabrication: isRTL ? "تصنيع" : "Fabrication",
      saving: isRTL ? "جارٍ الحفظ…" : "Saving…",
      createRfq: isRTL ? "إنشاء طلب عروض (RFQ) من الجدول" : "Create RFQ from BOQ",
      rfqCreated: isRTL ? "تم إنشاء RFQ" : "RFQ created",
      errCreateRfq: isRTL ? "تعذّر إنشاء RFQ." : "Failed to create RFQ.",
      openRfq: isRTL ? "فتح RFQ" : "Open RFQ",
      brand: isRTL ? "العلامة التجارية" : "Brand",
      brandLock: isRTL ? "نمط الالتزام" : "Brand lock",
      lockExact: isRTL ? "مطابق" : "Exact",
      lockPreferred: isRTL ? "مفضّل" : "Preferred",
      lockFlexible: isRTL ? "مرن" : "Flexible",
      brandUnavailable: isRTL ? "العلامة غير متاحة" : "Brand unavailable",
      noBrand: isRTL ? "بدون علامة" : "No brand",
    }),
    [isRTL],
  );

  const typeLabel = useCallback(
    (t: WorkOrderBoqItemRow["item_type"]): string => {
      switch (t) {
        case "material": return tx.itemTypeMaterial;
        case "labor": return tx.itemTypeLabor;
        case "service": return tx.itemTypeService;
        case "fabrication": return tx.itemTypeFabrication;
      }
    },
    [tx],
  );

  /* ─── Loaders ─── */
  const loadBoqs = useCallback(async () => {
    setLoading(true);
    const { data, error: err } = await listWorkOrderBoqs({ workOrderId });
    if (err) { setError(tx.errLoad); setLoading(false); return; }
    const rows = data ?? [];
    setBoqs(rows);
    if (!activeBoqId && rows.length > 0) setActiveBoqId(rows[0].id);
    setLoading(false);
  }, [workOrderId, tx.errLoad, activeBoqId]);

  const loadItems = useCallback(async (boqId: string) => {
    const { data, error: err } = await listBoqItems({ boqId });
    if (err) { setError(tx.errLoad); return; }
    setItems(data ?? []);
  }, [tx.errLoad]);

  useEffect(() => { void loadBoqs(); }, [loadBoqs]);
  useEffect(() => {
    if (activeBoqId) void loadItems(activeBoqId);
    else setItems([]);
  }, [activeBoqId, loadItems]);

  // Resolve approved-brand labels for any brand_id referenced in current items.
  useEffect(() => {
    const ids = Array.from(
      new Set(items.map((i) => i.brand_id).filter((x): x is string => Boolean(x))),
    );
    const missing = ids.filter((id) => !brandLabels[id]);
    if (missing.length === 0) return;
    let cancelled = false;
    (async () => {
      try {
        const rows = await listApprovedBrandsByIds(missing);
        if (cancelled) return;
        setBrandLabels((prev) => {
          const next = { ...prev };
          for (const r of rows) {
            next[r.id] = {
              name_ar: r.name_ar,
              name_en: r.name_en,
              ref_id: r.ref_id ?? null,
              slug: r.slug,
            };
          }
          return next;
        });
      } catch {
        /* swallow — UI falls back to "Brand unavailable" label */
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [items, brandLabels]);

  const activeBoq = useMemo(
    () => boqs.find((b) => b.id === activeBoqId) ?? null,
    [boqs, activeBoqId],
  );
  const isFinalized = activeBoq?.status === "finalized";

  // Live totals (preview) — server is the source of truth, but recompute locally
  // so the user sees instant feedback while editing.
  const liveTotals = useMemo(() => computeBoqTotals(items), [items]);

  /* ─── Actions ─── */
  const onGenerate = useCallback(async () => {
    if (!user) return;
    setBusy(true);
    setError(null);
    // Pull measurements at generate-time so we always snapshot the latest.
    const { data: measurements, error: mErr } = await listWorkOrderMeasurements({ workOrderId });
    if (mErr) { setError(tx.errGen); setBusy(false); return; }
    if (!measurements || measurements.length === 0) {
      setError(tx.noMeasurements);
      setBusy(false);
      return;
    }
    const finalTitle = title.trim() || (isRTL ? "جدول كميات جديد" : "New BOQ");
    const { boq, error: err } = await createBoqFromMeasurements({
      work_order_id: workOrderId,
      business_id: businessId,
      created_by: user.id,
      sector_key: sector,
      title: finalTitle,
      notes: notes.trim() || null,
      measurements,
    });
    setBusy(false);
    if (err || !boq) { setError(tx.errGen); return; }
    setGenerateOpen(false);
    setTitle("");
    setNotes("");
    setActiveBoqId(boq.id);
    await loadBoqs();
  }, [user, workOrderId, businessId, sector, title, notes, isRTL, tx, loadBoqs]);

  const onPriceChange = useCallback(
    async (
      item: WorkOrderBoqItemRow,
      patch: {
        quantity?: number;
        unit_price?: number;
        brand_id?: string | null;
        brand_lock?: BrandLock | null;
      },
    ) => {
      if (isFinalized) return;
      // Optimistic local update for instant totals
      setItems((prev) =>
        prev.map((it) =>
          it.id === item.id
            ? {
                ...it,
                quantity: patch.quantity ?? it.quantity,
                unit_price: patch.unit_price ?? it.unit_price,
                brand_id:
                  patch.brand_id === undefined ? it.brand_id : patch.brand_id,
                brand_lock:
                  patch.brand_id === null
                    ? null
                    : patch.brand_lock === undefined
                      ? it.brand_lock
                      : patch.brand_lock,
              }
            : it,
        ),
      );
      const { error: err } = await updateBoqItemPricing(item.id, patch);
      if (err) {
        setError(tx.errUpdate);
        // Reload to reset
        if (activeBoqId) void loadItems(activeBoqId);
        return;
      }
      // Recompute header totals server-side
      const rec = await recomputeBoqTotals(item.boq_id);
      if (rec.data) {
        setBoqs((prev) => prev.map((b) => (b.id === rec.data!.id ? rec.data! : b)));
      }
    },
    [isFinalized, activeBoqId, loadItems, tx.errUpdate],
  );

  const onFinalize = useCallback(async () => {
    if (!user || !activeBoq || isFinalized) return;
    setBusy(true);
    setError(null);
    const { data, error: err } = await finalizeBoq({
      boq_id: activeBoq.id,
      actor_id: user.id,
    });
    setBusy(false);
    if (err || !data) { setError(tx.errFinalize); return; }
    setBoqs((prev) => prev.map((b) => (b.id === data.id ? data : b)));
  }, [user, activeBoq, isFinalized, tx.errFinalize]);

  const onCreateRfqFromBoq = useCallback(async () => {
    if (!user || !activeBoq || activeBoq.status !== "finalized") return;
    setBusy(true);
    setError(null);
    const { rfq, error: err } = await createProcurementRfqFromBoq({
      boq_id: activeBoq.id,
      work_order_id: workOrderId,
      business_id: businessId,
      created_by: user.id,
      title: activeBoq.title,
    });
    setBusy(false);
    if (err || !rfq) {
      setError(tx.errCreateRfq);
      return;
    }
    setRfqRefId({ rfqId: rfq.id, rfqNumber: rfq.rfq_number });
  }, [user, activeBoq, workOrderId, businessId, tx.errCreateRfq]);

  /* ─── Render ─── */
  return (
    <section
      className="rounded-2xl border border-border/60 bg-card p-4 sm:p-5 space-y-3"
      aria-label={tx.title}
      data-testid="wo-boq-section"
    >
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <Calculator className="w-4 h-4 text-accent" />
          <h2 className="font-semibold text-sm">{tx.title}</h2>
        </div>
        {canManage && (
          <Button
            type="button"
            size="sm"
            variant="outline"
            className="rounded-xl h-9"
            onClick={() => setGenerateOpen((v) => !v)}
            disabled={busy}
          >
            <Sparkles className="w-3.5 h-3.5 me-1" />
            {tx.generate}
          </Button>
        )}
      </div>

      {error && (
        <div className="flex items-center gap-2 text-xs text-destructive">
          <AlertCircle className="w-3.5 h-3.5" /> {error}
        </div>
      )}

      {activeBoq && (
        <RelatedReferencesPanel
          entries={[
            { label: { ar: 'أمر العمل', en: 'Work Order' }, refId: workOrderRefId ?? null },
            { label: { ar: 'الكشف', en: 'BOQ' }, refId: activeBoq.ref_id },
          ]}
        />
      )}

      {/* Inline generate form */}
      {generateOpen && canManage && (
        <div className="rounded-xl border border-border/40 bg-background/40 p-3 space-y-2">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            <label className="text-xs space-y-1">
              <span className="text-muted-foreground">{tx.sector}</span>
              <select
                className="w-full h-9 rounded-lg border border-input bg-background px-2 text-sm"
                value={sector}
                onChange={(e) => setSector(e.target.value as BoqSectorKey)}
                aria-label={tx.sector}
              >
                {BOQ_SECTOR_KEYS.map((s) => (
                  <option key={s} value={s}>{s}</option>
                ))}
              </select>
            </label>
            <label className="text-xs space-y-1">
              <span className="text-muted-foreground">{tx.titleLabel}</span>
              <Input
                dir="auto"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                className="h-9 rounded-lg"
                maxLength={200}
              />
            </label>
          </div>
          <label className="text-xs space-y-1 block">
            <span className="text-muted-foreground">{tx.notes}</span>
            <Textarea
              dir="auto"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              className="rounded-lg min-h-[60px]"
              maxLength={1000}
            />
          </label>
          <div className="flex items-center justify-end gap-2">
            <Button
              type="button"
              size="sm"
              variant="ghost"
              className="rounded-xl h-9"
              onClick={() => setGenerateOpen(false)}
              disabled={busy}
            >
              {tx.cancel}
            </Button>
            <Button
              type="button"
              size="sm"
              className="rounded-xl h-9"
              onClick={() => void onGenerate()}
              disabled={busy}
            >
              {busy ? <Loader2 className="w-3.5 h-3.5 me-1 animate-spin" /> : null}
              {tx.create}
            </Button>
          </div>
        </div>
      )}

      {/* BOQ list tabs */}
      {loading ? (
        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          <Loader2 className="w-3.5 h-3.5 animate-spin" />
        </div>
      ) : boqs.length === 0 ? (
        <p className="text-xs text-muted-foreground">{tx.empty}</p>
      ) : (
        <>
          <div className="flex flex-wrap items-center gap-1.5">
            {boqs.map((b) => {
              const active = b.id === activeBoqId;
              return (
                <button
                  key={b.id}
                  type="button"
                  onClick={() => setActiveBoqId(b.id)}
                  className={`inline-flex items-center gap-1 rounded-lg border px-2 py-1 text-[11px] transition-colors ${
                    active
                      ? "border-primary bg-primary/10 text-primary"
                      : "border-border/40 hover:bg-accent/5"
                  }`}
                  aria-pressed={active}
                >
                  <ReferenceTag refId={b.ref_id} isRTL={isRTL} />
                  <Badge
                    variant="outline"
                    className={`text-[9px] ${
                      b.status === "finalized"
                        ? "border-emerald-500/40 text-emerald-600"
                        : "border-amber-500/40 text-amber-600"
                    }`}
                  >
                    {b.status === "finalized" ? tx.finalized : tx.draft}
                  </Badge>
                </button>
              );
            })}
          </div>

          {activeBoq && (
            <div className="space-y-3">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div className="min-w-0">
                  <div className="text-sm font-medium text-foreground truncate" dir="auto">
                    {activeBoq.title}
                  </div>
                  {activeBoq.notes && (
                    <div className="text-[11px] text-muted-foreground truncate" dir="auto">
                      {activeBoq.notes}
                    </div>
                  )}
                </div>
                {isFinalized ? (
                  <div className="flex items-center gap-2">
                    <Badge variant="outline" className="text-[10px] border-emerald-500/40 text-emerald-600">
                      <Lock className="w-3 h-3 me-1" /> {tx.finalized}
                    </Badge>
                    {canManage && (
                      <Button
                        type="button"
                        size="sm"
                        variant="outline"
                        className="rounded-xl h-9"
                        onClick={() => void onCreateRfqFromBoq()}
                        disabled={busy}
                        data-testid="wo-boq-create-rfq"
                        aria-label={tx.createRfq}
                      >
                        {busy ? (
                          <Loader2 className="w-3.5 h-3.5 me-1 animate-spin" />
                        ) : (
                          <ShoppingCart className="w-3.5 h-3.5 me-1" />
                        )}
                        {tx.createRfq}
                      </Button>
                    )}
                  </div>
                ) : canManage ? (
                  <Button
                    type="button"
                    size="sm"
                    className="rounded-xl h-9"
                    onClick={() => void onFinalize()}
                    disabled={busy || items.length === 0}
                    aria-label={tx.finalize}
                  >
                    {busy ? (
                      <Loader2 className="w-3.5 h-3.5 me-1 animate-spin" />
                    ) : (
                      <CheckCircle2 className="w-3.5 h-3.5 me-1" />
                    )}
                    {tx.finalize}
                  </Button>
                ) : null}
              </div>

              {rfqRefId && (
                <div className="flex items-center gap-2 rounded-lg border border-emerald-500/30 bg-emerald-500/5 px-3 py-2 text-xs">
                  <ShoppingCart className="w-3.5 h-3.5 text-emerald-600" />
                  <span className="text-emerald-700 dark:text-emerald-400">
                    {tx.rfqCreated}
                    {rfqRefId.rfqNumber ? `: ${rfqRefId.rfqNumber}` : ""}
                  </span>
                  <Link
                    to={`/dashboard/procurement`}
                    className="ms-auto text-primary hover:underline"
                  >
                    {tx.openRfq}
                  </Link>
                </div>
              )}

              {/* Items table */}
              {items.length === 0 ? (
                <p className="text-xs text-muted-foreground">{tx.noItems}</p>
              ) : (
                <div className="overflow-x-auto -mx-2">
                  <table
                    className="w-full text-xs"
                    data-testid="wo-boq-items-table"
                  >
                    <thead className="text-[10px] uppercase tracking-wide text-muted-foreground">
                      <tr>
                        <th className="px-2 py-1 text-start">{tx.itemTitle}</th>
                        <th className="px-2 py-1 text-start">{tx.type}</th>
                        <th className="px-2 py-1 text-end">{tx.qty}</th>
                        <th className="px-2 py-1 text-start">{tx.unit}</th>
                        <th className="px-2 py-1 text-end">{tx.unitPrice}</th>
                        <th className="px-2 py-1 text-end">{tx.lineTotal}</th>
                      </tr>
                    </thead>
                    <tbody>
                      {items.map((it) => (
                        <tr key={it.id} className="border-t border-border/30">
                          <td className="px-2 py-1.5" dir="auto">
                            {isRTL ? it.title_ar : it.title_en}
                          </td>
                          <td className="px-2 py-1.5">
                            <Badge variant="outline" className="text-[9px]">
                              {typeLabel(it.item_type)}
                            </Badge>
                          </td>
                          <td className="px-2 py-1.5 text-end tech-content">
                            {isFinalized ? (
                              fmt2(it.quantity)
                            ) : (
                              <Input
                                type="number"
                                min={0}
                                step="0.01"
                                inputMode="decimal"
                                defaultValue={String(it.quantity)}
                                onBlur={(e) => {
                                  const v = Number(e.target.value);
                                  if (Number.isFinite(v) && v >= 0 && v !== it.quantity) {
                                    void onPriceChange(it, { quantity: v });
                                  }
                                }}
                                className="h-8 w-20 rounded-md text-end tech-content"
                                aria-label={`${tx.qty} — ${it.title_en}`}
                              />
                            )}
                          </td>
                          <td className="px-2 py-1.5 tech-content">{it.unit}</td>
                          <td className="px-2 py-1.5 text-end tech-content">
                            {isFinalized ? (
                              fmt2(it.unit_price)
                            ) : (
                              <Input
                                type="number"
                                min={0}
                                step="0.01"
                                inputMode="decimal"
                                defaultValue={String(it.unit_price)}
                                onBlur={(e) => {
                                  const v = Number(e.target.value);
                                  if (Number.isFinite(v) && v >= 0 && v !== it.unit_price) {
                                    void onPriceChange(it, { unit_price: v });
                                  }
                                }}
                                className="h-8 w-24 rounded-md text-end tech-content"
                                aria-label={`${tx.unitPrice} — ${it.title_en}`}
                              />
                            )}
                          </td>
                          <td className="px-2 py-1.5 text-end tech-content font-medium">
                            {fmt2(it.quantity * it.unit_price)}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}

              {/* Totals */}
              <div className="rounded-xl border border-border/40 bg-background/40 p-3 space-y-1.5 text-xs">
                <div className="flex items-center justify-between">
                  <span className="text-muted-foreground">{tx.subtotal}</span>
                  <span className="tech-content font-medium" data-testid="wo-boq-subtotal">
                    {fmt2(liveTotals.subtotal)}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-muted-foreground">{tx.tax}</span>
                  <span className="tech-content font-medium" data-testid="wo-boq-tax">
                    {fmt2(liveTotals.tax)}
                  </span>
                </div>
                <div className="flex items-center justify-between border-t border-border/40 pt-1.5">
                  <span className="font-semibold">{tx.total}</span>
                  <span className="tech-content font-bold" data-testid="wo-boq-total">
                    {fmt2(liveTotals.total)}
                  </span>
                </div>
              </div>
            </div>
          )}
        </>
      )}
    </section>
  );
}