import { useCallback, useEffect, useMemo, useState } from "react";
import { Loader2, AlertCircle, Ruler, Trash2, Plus, Sparkles, Eye } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { ReferenceTag } from "@/components/reference/ReferenceTag";
import { useAuth } from "@/contexts/AuthContext";
import { useLanguage } from "@/i18n/LanguageContext";
import {
  listWorkOrderMeasurements,
  insertWorkOrderMeasurement,
  softDeleteWorkOrderMeasurement,
  listMeasurementTemplates,
  buildMeasurementFromTemplate,
  createMeasurementsFromTemplate,
  WORK_ORDER_MEASUREMENT_TYPES,
  WORK_ORDER_MEASUREMENT_UNITS,
  type WorkOrderMeasurementRow,
  type WorkOrderMeasurementUnit,
  type WorkOrderMeasurementTemplateRow,
  type TemplateValueMap,
} from "@/modules/workOrders";

interface Props {
  workOrderId: string;
  businessId: string;
  canManage: boolean;
}

function toNum(v: string): number | null {
  if (v.trim() === "") return null;
  const n = Number(v);
  return Number.isFinite(n) ? n : null;
}

export function WorkOrderMeasurementsSection({ workOrderId, businessId, canManage }: Props) {
  const { isRTL } = useLanguage();
  const { user } = useAuth();
  const [rows, setRows] = useState<WorkOrderMeasurementRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [adding, setAdding] = useState(false);
  const [busy, setBusy] = useState(false);

  // Template flow state — completely independent from the manual form.
  const [templateMode, setTemplateMode] = useState(false);
  const [templates, setTemplates] = useState<WorkOrderMeasurementTemplateRow[]>([]);
  const [templatesLoading, setTemplatesLoading] = useState(false);
  const [selectedTemplateKey, setSelectedTemplateKey] = useState<string>("");
  const [templateValues, setTemplateValues] = useState<TemplateValueMap>({});
  const [templateNotes, setTemplateNotes] = useState<string>("");
  const [templateBusy, setTemplateBusy] = useState(false);

  const [form, setForm] = useState({
    measurement_type: "site",
    label: "",
    width: "",
    height: "",
    depth: "",
    length: "",
    quantity: "1",
    unit: "cm" as WorkOrderMeasurementUnit,
    notes: "",
  });

  const tx = {
    title: isRTL ? "المقاسات" : "Measurements",
    empty: isRTL ? "لا توجد مقاسات." : "No measurements yet.",
    emptyHint: isRTL ? "ابدأ بقالب جاهز أو أضِف يدويًا." : "Start from a template or add manually.",
    add: isRTL ? "إضافة قياس" : "Add measurement",
    useTemplate: isRTL ? "استخدام قالب" : "Use template",
    template: isRTL ? "القالب" : "Template",
    sector: isRTL ? "القطاع" : "Sector",
    preview: isRTL ? "معاينة الصف" : "Row preview",
    pickTemplate: isRTL ? "اختر قالبًا" : "Choose a template",
    requiredMissing: isRTL ? "حقول مطلوبة ناقصة." : "Required fields are missing.",
    invalidValue: isRTL ? "قيمة غير صالحة." : "Invalid value.",
    cancel: isRTL ? "إلغاء" : "Cancel",
    save: isRTL ? "حفظ" : "Save",
    type: isRTL ? "النوع" : "Type",
    label: isRTL ? "الوصف" : "Label",
    width: isRTL ? "العرض" : "Width",
    height: isRTL ? "الارتفاع" : "Height",
    depth: isRTL ? "العمق" : "Depth",
    length: isRTL ? "الطول" : "Length",
    quantity: isRTL ? "الكمية" : "Quantity",
    unit: isRTL ? "الوحدة" : "Unit",
    notes: isRTL ? "ملاحظات" : "Notes",
    errLoad: isRTL ? "تعذّر تحميل المقاسات." : "Failed to load measurements.",
    errSave: isRTL ? "تعذّر حفظ القياس." : "Failed to save measurement.",
    errTemplates: isRTL ? "تعذّر تحميل القوالب." : "Failed to load templates.",
    errDelete: isRTL ? "تعذّر حذف القياس." : "Failed to delete measurement.",
    confirm: isRTL ? "حذف هذا القياس؟" : "Delete this measurement?",
  };

  const load = useCallback(async () => {
    setLoading(true);
    const { data, error: err } = await listWorkOrderMeasurements({ workOrderId });
    if (err) setError(tx.errLoad);
    setRows(data ?? []);
    setLoading(false);
  }, [workOrderId, tx.errLoad]);

  useEffect(() => { void load(); }, [load]);

  const openTemplateMode = useCallback(async () => {
    setTemplateMode(true);
    setError(null);
    if (templates.length > 0) return;
    setTemplatesLoading(true);
    const { data, error: err } = await listMeasurementTemplates({});
    setTemplatesLoading(false);
    if (err) { setError(tx.errTemplates); return; }
    setTemplates(data ?? []);
  }, [templates.length, tx.errTemplates]);

  const closeTemplateMode = useCallback(() => {
    setTemplateMode(false);
    setSelectedTemplateKey("");
    setTemplateValues({});
    setTemplateNotes("");
  }, []);

  const selectedTemplate = useMemo<WorkOrderMeasurementTemplateRow | null>(
    () => templates.find((t) => t.template_key === selectedTemplateKey) ?? null,
    [templates, selectedTemplateKey],
  );

  const draftPreview = useMemo(() => {
    if (!selectedTemplate) return null;
    const built = buildMeasurementFromTemplate({
      template: selectedTemplate,
      values: templateValues,
      notes: templateNotes,
    });
    return built.ok ? built.draft : null;
  }, [selectedTemplate, templateValues, templateNotes]);

  const onTemplateSubmit = useCallback(async () => {
    if (!user || !selectedTemplate) return;
    setTemplateBusy(true);
    setError(null);
    const { data, error: err, validation } = await createMeasurementsFromTemplate({
      workOrderId,
      businessId,
      recordedByUserId: user.id,
      templateKey: selectedTemplate.template_key,
      values: templateValues,
      notes: templateNotes,
    });
    setTemplateBusy(false);
    if (err || !data) {
      if (validation && validation.length > 0) {
        const hasRequired = validation.some((v) => v.code === "required_missing");
        setError(hasRequired ? tx.requiredMissing : tx.invalidValue);
      } else {
        setError(tx.errSave);
      }
      return;
    }
    setRows((prev) => [...data, ...prev]);
    closeTemplateMode();
  }, [user, selectedTemplate, workOrderId, businessId, templateValues, templateNotes, tx.errSave, tx.invalidValue, tx.requiredMissing, closeTemplateMode]);

  const onSave = useCallback(async () => {
    if (!user) return;
    setBusy(true);
    setError(null);
    const { data, error: err } = await insertWorkOrderMeasurement({
      work_order_id: workOrderId,
      business_id: businessId,
      recorded_by_user_id: user.id,
      measurement_type: form.measurement_type,
      label: form.label,
      width: toNum(form.width),
      height: toNum(form.height),
      depth: toNum(form.depth),
      length: toNum(form.length),
      quantity: toNum(form.quantity) ?? 1,
      unit: form.unit,
      notes: form.notes.trim() ? form.notes.trim() : null,
    });
    setBusy(false);
    if (err || !data) { setError(tx.errSave); return; }
    setRows((prev) => [data, ...prev]);
    setForm({
      measurement_type: "site",
      label: "",
      width: "",
      height: "",
      depth: "",
      length: "",
      quantity: "1",
      unit: "cm",
      notes: "",
    });
    setAdding(false);
  }, [user, workOrderId, businessId, form, tx.errSave]);

  const onDelete = useCallback(async (row: WorkOrderMeasurementRow) => {
    if (!user) return;
    if (typeof window !== "undefined" && !window.confirm(tx.confirm)) return;
    const { error: err } = await softDeleteWorkOrderMeasurement({
      measurementId: row.id,
      actorUserId: user.id,
      businessId,
      workOrderId,
    });
    if (err) { setError(tx.errDelete); return; }
    setRows((prev) => prev.filter((r) => r.id !== row.id));
  }, [user, businessId, workOrderId, tx.confirm, tx.errDelete]);

  return (
    <section className="rounded-2xl border border-border/60 bg-card p-4 sm:p-5 space-y-3" aria-label={tx.title}>
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <Ruler className="w-4 h-4 text-accent" />
          <h2 className="font-semibold text-sm">{tx.title}</h2>
        </div>
        {canManage && !adding && !templateMode && (
          <div className="flex items-center gap-2">
            <Button type="button" size="sm" variant="outline" className="rounded-xl" onClick={() => void openTemplateMode()}>
              <Sparkles className="w-3.5 h-3.5 me-1" /> {tx.useTemplate}
            </Button>
            <Button type="button" size="sm" variant="outline" className="rounded-xl" onClick={() => setAdding(true)}>
              <Plus className="w-3.5 h-3.5 me-1" /> {tx.add}
            </Button>
          </div>
        )}
      </div>

      {error && (
        <div className="flex items-center gap-2 text-xs text-destructive">
          <AlertCircle className="w-3.5 h-3.5" /> {error}
        </div>
      )}

      {templateMode && (
        <div className="rounded-xl border border-accent/30 bg-accent/5 p-3 space-y-2" aria-label={tx.useTemplate}>
          {templatesLoading ? (
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              <Loader2 className="w-3.5 h-3.5 animate-spin" />
            </div>
          ) : (
            <>
              <select
                value={selectedTemplateKey}
                onChange={(e) => {
                  setSelectedTemplateKey(e.target.value);
                  setTemplateValues({});
                  setError(null);
                }}
                aria-label={tx.template}
                className="w-full rounded-lg h-9 text-xs bg-background border border-border px-2"
              >
                <option value="">{tx.pickTemplate}</option>
                {templates.map((t) => (
                  <option key={t.template_key} value={t.template_key}>
                    {(isRTL ? t.title_ar : t.title_en)} · {t.sector_key}
                  </option>
                ))}
              </select>

              {selectedTemplate && (
                <>
                  {(isRTL ? selectedTemplate.description_ar : selectedTemplate.description_en) && (
                    <p className="text-[11px] text-muted-foreground" dir="auto">
                      {isRTL ? selectedTemplate.description_ar : selectedTemplate.description_en}
                    </p>
                  )}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    {selectedTemplate.fields.map((field) => {
                      const label = isRTL ? field.label_ar : field.label_en;
                      const raw = templateValues[field.key];
                      const setVal = (val: string | number | boolean) =>
                        setTemplateValues((prev) => ({ ...prev, [field.key]: val }));
                      const idAttr = `tpl-${field.key}`;
                      if (field.type === "select") {
                        return (
                          <div key={field.key} className="space-y-1">
                            <label htmlFor={idAttr} className="text-[11px] text-muted-foreground">
                              {label}{field.required ? " *" : ""}
                            </label>
                            <select
                              id={idAttr}
                              value={typeof raw === "string" ? raw : ""}
                              onChange={(e) => setVal(e.target.value)}
                              className="w-full rounded-lg h-9 text-xs bg-background border border-border px-2"
                            >
                              <option value="">—</option>
                              {(field.options ?? []).map((o) => (
                                <option key={o.value} value={o.value}>{isRTL ? o.label_ar : o.label_en}</option>
                              ))}
                            </select>
                          </div>
                        );
                      }
                      if (field.type === "boolean") {
                        return (
                          <label key={field.key} htmlFor={idAttr} className="flex items-center gap-2 text-xs">
                            <input
                              id={idAttr}
                              type="checkbox"
                              checked={Boolean(raw)}
                              onChange={(e) => setVal(e.target.checked)}
                              className="rounded"
                            />
                            <span>{label}{field.required ? " *" : ""}</span>
                          </label>
                        );
                      }
                      if (field.type === "text") {
                        return (
                          <div key={field.key} className="space-y-1">
                            <label htmlFor={idAttr} className="text-[11px] text-muted-foreground">
                              {label}{field.required ? " *" : ""}
                            </label>
                            <Input
                              id={idAttr}
                              value={typeof raw === "string" ? raw : ""}
                              onChange={(e) => setVal(e.target.value)}
                              dir="auto"
                              maxLength={500}
                              className="rounded-lg h-9 text-xs"
                            />
                          </div>
                        );
                      }
                      // number
                      return (
                        <div key={field.key} className="space-y-1">
                          <label htmlFor={idAttr} className="text-[11px] text-muted-foreground">
                            {label}{field.unit ? ` (${field.unit})` : ""}{field.required ? " *" : ""}
                          </label>
                          <Input
                            id={idAttr}
                            value={raw === undefined || raw === null ? "" : String(raw)}
                            onChange={(e) => setVal(e.target.value)}
                            inputMode="decimal"
                            type="number"
                            min={0}
                            step="0.01"
                            className="rounded-lg h-9 text-xs tech-content"
                          />
                        </div>
                      );
                    })}
                  </div>
                  <Textarea
                    value={templateNotes}
                    onChange={(e) => setTemplateNotes(e.target.value)}
                    placeholder={tx.notes}
                    aria-label={tx.notes}
                    dir="auto"
                    className="rounded-lg min-h-[44px] text-xs"
                    maxLength={1000}
                  />

                  {draftPreview && (
                    <div className="rounded-lg border border-border/40 bg-background/60 p-2.5 space-y-1" aria-label={tx.preview}>
                      <div className="flex items-center gap-1.5 text-[10px] text-muted-foreground">
                        <Eye className="w-3 h-3" />
                        <span>{tx.preview}</span>
                      </div>
                      <p className="text-xs font-medium" dir="auto">{draftPreview.label}</p>
                      <p className="text-[10px] text-muted-foreground tech-content">
                        {[
                          draftPreview.width != null && `${tx.width}: ${draftPreview.width}`,
                          draftPreview.height != null && `${tx.height}: ${draftPreview.height}`,
                          draftPreview.depth != null && `${tx.depth}: ${draftPreview.depth}`,
                          draftPreview.length != null && `${tx.length}: ${draftPreview.length}`,
                          `${tx.quantity}: ${draftPreview.quantity}`,
                        ].filter(Boolean).join("  ·  ")} {draftPreview.unit}
                      </p>
                    </div>
                  )}
                </>
              )}

              <div className="flex justify-end gap-2">
                <Button type="button" variant="ghost" size="sm" className="rounded-lg" onClick={closeTemplateMode}>
                  {tx.cancel}
                </Button>
                <Button
                  type="button"
                  size="sm"
                  className="rounded-lg"
                  onClick={() => void onTemplateSubmit()}
                  disabled={templateBusy || !selectedTemplate}
                >
                  {templateBusy ? <Loader2 className="w-3.5 h-3.5 me-1 animate-spin" /> : null}
                  {tx.save}
                </Button>
              </div>
            </>
          )}
        </div>
      )}

      {adding && (
        <form
          className="rounded-xl border border-border/40 bg-background/40 p-3 space-y-2"
          onSubmit={(e) => { e.preventDefault(); void onSave(); }}
          aria-label={tx.add}
        >
          <div className="grid grid-cols-2 gap-2">
            <select
              value={form.measurement_type}
              onChange={(e) => setForm((f) => ({ ...f, measurement_type: e.target.value }))}
              aria-label={tx.type}
              className="rounded-lg h-9 text-xs bg-background border border-border px-2"
            >
              {WORK_ORDER_MEASUREMENT_TYPES.map((t) => (
                <option key={t} value={t}>{t}</option>
              ))}
            </select>
            <select
              value={form.unit}
              onChange={(e) => setForm((f) => ({ ...f, unit: e.target.value as WorkOrderMeasurementUnit }))}
              aria-label={tx.unit}
              className="rounded-lg h-9 text-xs bg-background border border-border px-2 tech-content"
            >
              {WORK_ORDER_MEASUREMENT_UNITS.map((u) => (
                <option key={u} value={u}>{u}</option>
              ))}
            </select>
          </div>
          <Input
            value={form.label}
            onChange={(e) => setForm((f) => ({ ...f, label: e.target.value }))}
            placeholder={tx.label}
            aria-label={tx.label}
            dir="auto"
            maxLength={200}
            className="rounded-lg h-9 text-xs"
            required
          />
          <div className="grid grid-cols-2 sm:grid-cols-5 gap-2">
            {(["width", "height", "depth", "length", "quantity"] as const).map((k) => (
              <Input
                key={k}
                value={form[k]}
                onChange={(e) => setForm((f) => ({ ...f, [k]: e.target.value }))}
                placeholder={tx[k]}
                aria-label={tx[k]}
                inputMode="decimal"
                type="number"
                min={0}
                step="0.01"
                className="rounded-lg h-9 text-xs tech-content"
              />
            ))}
          </div>
          <Textarea
            value={form.notes}
            onChange={(e) => setForm((f) => ({ ...f, notes: e.target.value }))}
            placeholder={tx.notes}
            aria-label={tx.notes}
            dir="auto"
            className="rounded-lg min-h-[48px] text-xs"
            maxLength={1000}
          />
          <div className="flex justify-end gap-2">
            <Button type="button" variant="ghost" size="sm" className="rounded-lg" onClick={() => setAdding(false)}>
              {tx.cancel}
            </Button>
            <Button type="submit" size="sm" className="rounded-lg" disabled={busy || !form.label.trim()}>
              {busy ? <Loader2 className="w-3.5 h-3.5 me-1 animate-spin" /> : null}
              {tx.save}
            </Button>
          </div>
        </form>
      )}

      {loading ? (
        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          <Loader2 className="w-3.5 h-3.5 animate-spin" />
        </div>
      ) : rows.length === 0 ? (
        <div className="text-xs text-muted-foreground space-y-1">
          <p>{tx.empty}</p>
          {canManage && !adding && !templateMode && (
            <p className="text-[11px]">{tx.emptyHint}</p>
          )}
        </div>
      ) : (
        <ul className="space-y-1.5">
          {rows.map((r) => (
            <li key={r.id} className="rounded-xl border border-border/40 bg-background/40 p-2.5 space-y-1">
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0 flex-1 space-y-1">
                  <div className="flex items-center gap-1.5 flex-wrap">
                    {r.ref_id && <ReferenceTag refId={r.ref_id} isRTL={isRTL} />}
                    <Badge variant="outline" className="text-[10px]">{r.measurement_type}</Badge>
                  </div>
                  <p className="text-xs font-medium text-foreground truncate" dir="auto">{r.label}</p>
                  <p className="text-[10px] text-muted-foreground tech-content">
                    {[r.width && `${tx.width}: ${r.width}`, r.height && `${tx.height}: ${r.height}`, r.depth && `${tx.depth}: ${r.depth}`, r.length && `${tx.length}: ${r.length}`, r.quantity != null && `${tx.quantity}: ${r.quantity}`]
                      .filter(Boolean).join("  ·  ")} {r.unit}
                  </p>
                  {r.notes && <p className="text-[11px] text-muted-foreground" dir="auto">{r.notes}</p>}
                </div>
                {canManage && (
                  <Button type="button" variant="ghost" size="icon" className="h-7 w-7 rounded-lg text-destructive" onClick={() => void onDelete(r)} aria-label="delete">
                    <Trash2 className="w-3.5 h-3.5" />
                  </Button>
                )}
              </div>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}