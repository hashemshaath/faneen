/**
 * BUSINESS-WORKFLOW-PROCUREMENT-1 — Procurement request detail.
 * Shows RFQs + quote comparison. All Supabase access via `@/modules/procurement`.
 */
import { useCallback, useEffect, useMemo, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { ArrowLeft, Loader2, Plus, RefreshCw, Send, Trophy, X, CheckCheck, Star } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { useLanguage } from "@/i18n/LanguageContext";
import { useNoIndex } from "@/hooks/useNoIndex";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { RelatedReferencesPanel } from "@/components/reference/RelatedReferencesPanel";
import { UnifiedTimeline } from "@/components/timeline/UnifiedTimeline";
import { DiagnosticsCard } from "@/components/dashboard/DiagnosticsCard";
import { computeProcurementDiagnostics } from "@/modules/analytics/diagnostics";
import { useWorkOrderRealtimeInvalidation } from "@/hooks/useWorkOrderRealtimeInvalidation";
import {
  awardRfqQuote,
  closeRfq,
  compareSupplierQuotes,
  createRfqFromRequest,
  evaluateAwardEligibility,
  getProcurementRequestById,
  getRfqById,
  inviteSuppliersToRfq,
  listInvitationsByRfq,
  listRfqs,
  listSupplierQuotesByRfq,
  listSuppliers,
  rejectQuote,
  sendRfq,
  shortlistQuote,
  listRfqItemsByRfq,
  listQuoteItemsByRfq,
  compareQuotesWithLineItems,
  listPurchaseOrdersByRfq,
  updateRfqItem,
  type ProcurementRfqInvitationRow,
  type ProcurementRequestRow,
  type ProcurementRfqRow,
  type ProcurementSupplierRow,
  type ScoredQuote,
  type ProcurementRfqItemRow,
  type ProcurementSupplierQuoteItemRow,
  type ProcurementPurchaseOrderRow,
  type QuoteComparisonResult,
} from "@/modules/procurement";
import { ApprovedBrandPicker } from "@/components/brands/ApprovedBrandPicker";
import { listApprovedBrandsByIds } from "@/modules/brands";
import {
  describeBrandLock,
  type BrandLock,
} from "@/modules/brands/lib/brandSelectionRules";

export default function DashboardProcurementDetail() {
  useNoIndex();
  const { isRTL } = useLanguage();
  const { user } = useAuth();
  const { id } = useParams<{ id: string }>();

  const [request, setRequest] = useState<ProcurementRequestRow | null>(null);
  const [rfqs, setRfqs] = useState<ProcurementRfqRow[]>([]);
  const [activeRfqId, setActiveRfqId] = useState<string | null>(null);
  const [activeRfq, setActiveRfq] = useState<ProcurementRfqRow | null>(null);
  const [scored, setScored] = useState<ScoredQuote[]>([]);
  const [rfqItems, setRfqItems] = useState<ProcurementRfqItemRow[]>([]);
  const [quoteItems, setQuoteItems] = useState<ProcurementSupplierQuoteItemRow[]>([]);
  const [matrix, setMatrix] = useState<QuoteComparisonResult[]>([]);
  const [purchaseOrders, setPurchaseOrders] = useState<ProcurementPurchaseOrderRow[]>([]);
  const [suppliers, setSuppliers] = useState<ProcurementSupplierRow[]>([]);
  const [invitations, setInvitations] = useState<ProcurementRfqInvitationRow[]>([]);
  const [selectedSupplierIds, setSelectedSupplierIds] = useState<string[]>([]);
  const [awardConfirmId, setAwardConfirmId] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  // RFQ-BRAND-PICKER-1D — resolved approved-brand labels for line items.
  const [brandLabels, setBrandLabels] = useState<
    Record<string, { name_ar: string; name_en: string; ref_id: string | null; slug: string }>
  >({});

  const tx = useMemo(
    () => ({
      back: isRTL ? "رجوع" : "Back",
      title: isRTL ? "تفاصيل طلب الشراء" : "Procurement Request",
      rfqs: isRTL ? "طلبات العروض (RFQ)" : "Requests for Quotation (RFQ)",
      newRfq: isRTL ? "إنشاء RFQ جديد" : "Create new RFQ",
      noRfqs: isRTL ? "لا توجد طلبات عروض بعد." : "No RFQs yet.",
      noQuotes: isRTL ? "لا توجد عروض موردين." : "No supplier quotes.",
      compare: isRTL ? "مقارنة العروض" : "Quote comparison",
      supplier: isRTL ? "المورد" : "Supplier",
      amount: isRTL ? "المبلغ" : "Amount",
      lead: isRTL ? "مدة التوريد (يوم)" : "Lead time (days)",
      score: isRTL ? "النقاط" : "Score",
      award: isRTL ? "منح" : "Award",
      awarded: isRTL ? "ممنوح" : "Awarded",
      refresh: isRTL ? "تحديث" : "Refresh",
      notFound: isRTL ? "لم يتم العثور على الطلب." : "Request not found.",
      errLoad: isRTL ? "تعذر التحميل." : "Failed to load.",
      errAward: isRTL ? "تعذر منح العرض." : "Failed to award quote.",
      sendRfq: isRTL ? "إرسال RFQ" : "Send RFQ",
      closeRfq: isRTL ? "إغلاق RFQ" : "Close RFQ",
      shortlist: isRTL ? "إدراج" : "Shortlist",
      shortlisted: isRTL ? "مُدرَج" : "Shortlisted",
      reject: isRTL ? "رفض" : "Reject",
      rejected: isRTL ? "مرفوض" : "Rejected",
      confirmAward: isRTL ? "تأكيد المنح" : "Confirm award",
      cancel: isRTL ? "إلغاء" : "Cancel",
      suppliersTitle: isRTL ? "الموردون والدعوات" : "Suppliers & Invitations",
      invite: isRTL ? "دعوة" : "Invite",
      selectSuppliers: isRTL ? "اختر موردين لدعوتهم لهذا الـ RFQ" : "Select suppliers to invite to this RFQ",
      invited: isRTL ? "تمت الدعوة" : "Invited",
      responded: isRTL ? "تم الرد" : "Responded",
      noSuppliers: isRTL ? "لا يوجد موردون نشطون." : "No active suppliers.",
      lineMatrix: isRTL ? "مصفوفة المقارنة (بنود)" : "Line-item Comparison Matrix",
      item: isRTL ? "البند" : "Item",
      qty: isRTL ? "الكمية" : "Qty",
      unit: isRTL ? "الوحدة" : "Unit",
      best: isRTL ? "الأفضل" : "Best",
      missing: isRTL ? "—" : "—",
      noLineItems: isRTL ? "لا توجد بنود RFQ." : "No RFQ line items.",
      poDrafts: isRTL ? "أوامر شراء (مسودة)" : "Purchase Order Drafts",
      noPoDrafts: isRTL ? "لا توجد مسودات." : "No drafts yet.",
      poTotal: isRTL ? "الإجمالي" : "Total",
      notEligible: isRTL ? "لا يمكن منح هذا العرض الآن." : "This quote cannot be awarded right now.",
      sentAt: isRTL ? "أُرسل في" : "Sent",
      expiresAt: isRTL ? "تنتهي في" : "Expires",
      brand: isRTL ? "العلامة" : "Brand",
      brandLock: isRTL ? "نمط الالتزام" : "Brand lock",
      lockExact: isRTL ? "مطابق" : "Exact",
      lockPreferred: isRTL ? "مفضّل" : "Preferred",
      lockFlexible: isRTL ? "مرن" : "Flexible",
      brandUnavailable: isRTL ? "العلامة غير متاحة" : "Brand unavailable",
      noBrand: isRTL ? "بدون علامة" : "No brand",
    }),
    [isRTL],
  );

  const load = useCallback(async () => {
    if (!id) return;
    setLoading(true);
    setError(null);
    const { data: req, error: rErr } = await getProcurementRequestById(id);
    if (rErr || !req) {
      setError(tx.errLoad);
      setLoading(false);
      return;
    }
    setRequest(req);
    const { data: rfqList } = await listRfqs({
      businessId: req.business_id,
      procurementRequestId: req.id,
    });
    setRfqs(rfqList ?? []);
    const next = (rfqList ?? [])[0]?.id ?? null;
    setActiveRfqId(next);
    setActiveRfq((rfqList ?? [])[0] ?? null);
    const { data: sup } = await listSuppliers({ businessId: req.business_id });
    setSuppliers(sup ?? []);
    if (next) {
      const { data: quotes } = await listSupplierQuotesByRfq(next);
      setScored(compareSupplierQuotes(quotes ?? []));
      const { data: invs } = await listInvitationsByRfq(next);
      setInvitations(invs ?? []);
      const { data: ri } = await listRfqItemsByRfq(next);
      setRfqItems(ri ?? []);
      const { data: qi } = await listQuoteItemsByRfq(next, req.business_id);
      setQuoteItems(qi ?? []);
      setMatrix(
        compareQuotesWithLineItems(
          ri ?? [],
          (quotes ?? []).map((q) => ({
            quote: q,
            items: (qi ?? []).filter((it) => it.quote_id === q.id),
          })),
        ),
      );
      const { data: pos } = await listPurchaseOrdersByRfq(next);
      setPurchaseOrders(pos ?? []);
    } else {
      setScored([]);
      setInvitations([]);
      setRfqItems([]);
      setQuoteItems([]);
      setMatrix([]);
      setPurchaseOrders([]);
    }
    setLoading(false);
  }, [id, tx.errLoad]);

  useEffect(() => {
    void load();
  }, [load]);

  // Workflow change-stream: invalidate + refetch on DB changes.
  useWorkOrderRealtimeInvalidation({
    businessId: request?.business_id ?? null,
    onChange: () => { void load(); },
  });

  const onSelectRfq = useCallback(
    async (rfqId: string) => {
      setActiveRfqId(rfqId);
      setAwardConfirmId(null);
      const found = rfqs.find((r) => r.id === rfqId) ?? null;
      setActiveRfq(found);
      const { data } = await listSupplierQuotesByRfq(rfqId);
      setScored(compareSupplierQuotes(data ?? []));
      const { data: invs } = await listInvitationsByRfq(rfqId);
      setInvitations(invs ?? []);
      const { data: ri } = await listRfqItemsByRfq(rfqId);
      setRfqItems(ri ?? []);
      const businessId = found?.business_id ?? request?.business_id ?? '';
      const { data: qi } = await listQuoteItemsByRfq(rfqId, businessId);
      setQuoteItems(qi ?? []);
      setMatrix(
        compareQuotesWithLineItems(
          ri ?? [],
          (data ?? []).map((q) => ({
            quote: q,
            items: (qi ?? []).filter((it) => it.quote_id === q.id),
          })),
        ),
      );
      const { data: pos } = await listPurchaseOrdersByRfq(rfqId);
      setPurchaseOrders(pos ?? []);
    },
    [rfqs, request?.business_id],
  );

  // RFQ-BRAND-PICKER-1D — resolve approved-brand labels for items in view.
  useEffect(() => {
    const ids = Array.from(
      new Set(rfqItems.map((i) => i.requested_brand_id).filter((x): x is string => Boolean(x))),
    );
    const missing = ids.filter((id) => !brandLabels[id]);
    if (missing.length === 0) return;
    let cancelled = false;
    (async () => {
      try {
        const rows = (await listApprovedBrandsByIds(missing)) as Array<{
          id: string;
          ref_id: string | null;
          name_ar: string;
          name_en: string;
          slug: string;
        }>;
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
        /* swallow — UI falls back to "Brand unavailable" */
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [rfqItems, brandLabels]);

  // RFQ-BRAND-PICKER-1D — patch a line item's brand fields.
  const onPatchItemBrand = useCallback(
    async (
      item: ProcurementRfqItemRow,
      patch: { requested_brand_id?: string | null; brand_lock?: BrandLock | null },
    ) => {
      if (!activeRfq || activeRfq.status !== 'draft') return;
      setRfqItems((prev) =>
        prev.map((it) =>
          it.id === item.id
            ? {
                ...it,
                requested_brand_id:
                  patch.requested_brand_id === undefined
                    ? it.requested_brand_id
                    : patch.requested_brand_id,
                brand_lock:
                  patch.requested_brand_id === null
                    ? null
                    : patch.brand_lock === undefined
                      ? it.brand_lock
                      : patch.brand_lock,
              }
            : it,
        ),
      );
      const { error: err } = await updateRfqItem(item.id, patch);
      if (err) {
        setError(tx.errLoad);
        // Reload items to reset to server state.
        if (activeRfqId) {
          const { data: ri } = await listRfqItemsByRfq(activeRfqId);
          setRfqItems(ri ?? []);
        }
      }
    },
    [activeRfq, activeRfqId, tx.errLoad],
  );

  const onCreateRfq = useCallback(async () => {
    if (!request || !user?.id) return;
    setBusy(true);
    await createRfqFromRequest({
      business_id: request.business_id,
      procurement_request_id: request.id,
      created_by: user.id,
      advanceRequestStatus: request.status === "requested",
    });
    setBusy(false);
    await load();
  }, [request, user?.id, load]);

  const onSendRfq = useCallback(async () => {
    if (!activeRfqId) return;
    setBusy(true);
    const { error: err } = await sendRfq(activeRfqId);
    setBusy(false);
    if (err) setError(tx.errLoad);
    await load();
  }, [activeRfqId, load, tx.errLoad]);

  const onCloseRfq = useCallback(async () => {
    if (!activeRfqId) return;
    setBusy(true);
    await closeRfq(activeRfqId);
    setBusy(false);
    await load();
  }, [activeRfqId, load]);

  const onInvite = useCallback(async () => {
    if (!activeRfqId || !request || !user?.id || selectedSupplierIds.length === 0) return;
    setBusy(true);
    await inviteSuppliersToRfq({
      business_id: request.business_id,
      rfq_id: activeRfqId,
      supplier_ids: selectedSupplierIds,
      invited_by: user.id,
    });
    setSelectedSupplierIds([]);
    setBusy(false);
    await load();
  }, [activeRfqId, request, user?.id, selectedSupplierIds, load]);

  const onShortlist = useCallback(
    async (quoteId: string) => {
      setBusy(true);
      await shortlistQuote(quoteId);
      setBusy(false);
      await load();
    },
    [load],
  );

  const onReject = useCallback(
    async (quoteId: string) => {
      setBusy(true);
      await rejectQuote(quoteId);
      setBusy(false);
      await load();
    },
    [load],
  );

  const onConfirmAward = useCallback(
    async (quoteId: string) => {
      if (!activeRfq) return;
      const quoteRow = scored.find((q) => q.id === quoteId);
      const eligibility = evaluateAwardEligibility(quoteRow ?? null, activeRfq);
      if (!eligibility.eligible) {
        setError(tx.notEligible);
        return;
      }
      setBusy(true);
      const { error: err } = await awardRfqQuote(quoteId);
      setBusy(false);
      setAwardConfirmId(null);
      if (err) {
        setError(tx.errAward);
        return;
      }
      // Refetch RFQ so awarded_quote_id propagates
      const { data: freshRfq } = await getRfqById(activeRfq.id);
      if (freshRfq) setActiveRfq(freshRfq);
      await load();
    },
    [activeRfq, scored, load, tx.errAward, tx.notEligible],
  );

  if (loading && !request) {
    return (
      <div className="container mx-auto py-10" dir={isRTL ? "rtl" : "ltr"}>
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!request) {
    return (
      <div className="container mx-auto py-10" dir={isRTL ? "rtl" : "ltr"}>
        <p className="text-muted-foreground">{tx.notFound}</p>
        <Link to="/dashboard/procurement" className="text-primary inline-flex items-center gap-2 mt-3">
          <ArrowLeft className="h-4 w-4" /> {tx.back}
        </Link>
      </div>
    );
  }

  return (
    <div className="container mx-auto py-10 space-y-6" dir={isRTL ? "rtl" : "ltr"}>
      <Link to="/dashboard/procurement" className="text-sm text-muted-foreground inline-flex items-center gap-2">
        <ArrowLeft className="h-4 w-4" /> {tx.back}
      </Link>
      <header className="flex items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold">{request.title}</h1>
          {request.description && (
            <p className="text-sm text-muted-foreground mt-1">{request.description}</p>
          )}
        </div>
        <Badge variant="secondary">{request.status}</Badge>
      </header>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between gap-3">
          <CardTitle className="text-base">{tx.rfqs}</CardTitle>
          <div className="flex items-center gap-2">
            <Button size="sm" variant="outline" onClick={() => void load()} disabled={loading}>
              <RefreshCw className="h-4 w-4" />
            </Button>
            <Button size="sm" onClick={onCreateRfq} disabled={busy}>
              <Plus className="h-4 w-4" />
              <span className="ms-2">{tx.newRfq}</span>
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {rfqs.length === 0 ? (
            <p className="text-muted-foreground text-sm">{tx.noRfqs}</p>
          ) : (
            <>
            <ul className="flex flex-wrap gap-2">
              {rfqs.map((r) => (
                <li key={r.id}>
                  <Button
                    size="sm"
                    variant={r.id === activeRfqId ? "default" : "outline"}
                    onClick={() => void onSelectRfq(r.id)}
                  >
                    <span className="tech-content">{r.rfq_number ?? r.id.slice(0, 6)}</span>
                    <span className="ms-2 text-xs opacity-70">{r.status}</span>
                  </Button>
                </li>
              ))}
            </ul>
            {activeRfq && (
              <div className="mt-4 flex flex-wrap items-center gap-3 text-sm">
                {activeRfq.sent_at && (
                  <span className="text-muted-foreground">
                    {tx.sentAt}: <span className="tech-content">{new Date(activeRfq.sent_at).toLocaleDateString()}</span>
                  </span>
                )}
                {activeRfq.expires_at && (
                  <span className="text-muted-foreground">
                    {tx.expiresAt}: <span className="tech-content">{new Date(activeRfq.expires_at).toLocaleDateString()}</span>
                  </span>
                )}
                <div className="ms-auto flex items-center gap-2">
                  {activeRfq.status === "draft" && (
                    <Button size="sm" onClick={onSendRfq} disabled={busy}>
                      <Send className="h-4 w-4" />
                      <span className="ms-2">{tx.sendRfq}</span>
                    </Button>
                  )}
                  {(activeRfq.status === "draft" || activeRfq.status === "sent") && (
                    <Button size="sm" variant="outline" onClick={onCloseRfq} disabled={busy}>
                      <X className="h-4 w-4" />
                      <span className="ms-2">{tx.closeRfq}</span>
                    </Button>
                  )}
                </div>
              </div>
            )}
            </>
          )}
        </CardContent>
      </Card>

      {activeRfqId && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">{tx.suppliersTitle}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {suppliers.length === 0 ? (
              <p className="text-muted-foreground text-sm">{tx.noSuppliers}</p>
            ) : (
              <>
                <p className="text-sm text-muted-foreground">{tx.selectSuppliers}</p>
                <ul className="flex flex-wrap gap-2">
                  {suppliers.map((s) => {
                    const invited = invitations.some((i) => i.supplier_id === s.id);
                    const selected = selectedSupplierIds.includes(s.id);
                    return (
                      <li key={s.id}>
                        <Button
                          size="sm"
                          variant={selected ? "default" : invited ? "secondary" : "outline"}
                          onClick={() =>
                            setSelectedSupplierIds((cur) =>
                              cur.includes(s.id) ? cur.filter((x) => x !== s.id) : [...cur, s.id],
                            )
                          }
                          disabled={invited}
                          title={invited ? tx.invited : undefined}
                        >
                          {s.name}
                          {invited && <span className="ms-2 text-xs opacity-70">{tx.invited}</span>}
                        </Button>
                      </li>
                    );
                  })}
                </ul>
                <div className="flex justify-end">
                  <Button
                    size="sm"
                    onClick={onInvite}
                    disabled={busy || selectedSupplierIds.length === 0}
                  >
                    <Send className="h-4 w-4" />
                    <span className="ms-2">{tx.invite} ({selectedSupplierIds.length})</span>
                  </Button>
                </div>
              </>
            )}
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader>
          <CardTitle className="text-base">{tx.compare}</CardTitle>
        </CardHeader>
        <CardContent>
          {scored.length === 0 ? (
            <p className="text-muted-foreground text-sm">{tx.noQuotes}</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="text-muted-foreground text-start">
                  <tr>
                    <th className="py-2 pe-3">#</th>
                    <th className="py-2 pe-3">{tx.supplier}</th>
                    <th className="py-2 pe-3">{tx.amount}</th>
                    <th className="py-2 pe-3">{tx.lead}</th>
                    <th className="py-2 pe-3">{tx.score}</th>
                    <th className="py-2 pe-3" />
                  </tr>
                </thead>
                <tbody>
                  {scored.map((q) => (
                    <tr key={q.id} className="border-t align-top">
                      <td className="py-2 pe-3">{q.rank}</td>
                      <td className="py-2 pe-3 tech-content">{q.supplier_id.slice(0, 8)}</td>
                      <td className="py-2 pe-3 tech-content">
                        {q.total_amount ?? "—"} {q.currency}
                      </td>
                      <td className="py-2 pe-3 tech-content">{q.lead_time_days ?? "—"}</td>
                      <td className="py-2 pe-3 tech-content">{q.score}</td>
                      <td className="py-2 pe-3">
                        {q.status === "awarded" || q.status === "selected" ? (
                          <Badge className="bg-emerald-600 hover:bg-emerald-600 text-white">
                            <Trophy className="h-3 w-3 me-1" />
                            {tx.awarded}
                          </Badge>
                        ) : awardConfirmId === q.id ? (
                          <div className="flex items-center gap-2">
                            <Button size="sm" onClick={() => void onConfirmAward(q.id)} disabled={busy}>
                              <CheckCheck className="h-4 w-4" />
                              <span className="ms-2">{tx.confirmAward}</span>
                            </Button>
                            <Button size="sm" variant="ghost" onClick={() => setAwardConfirmId(null)}>
                              {tx.cancel}
                            </Button>
                          </div>
                        ) : (
                          <div className="flex items-center gap-2">
                            {q.status === "shortlisted" ? (
                              <Badge variant="secondary">
                                <Star className="h-3 w-3 me-1" />
                                {tx.shortlisted}
                              </Badge>
                            ) : (
                              <Button size="sm" variant="outline" onClick={() => void onShortlist(q.id)} disabled={busy}>
                                <Star className="h-4 w-4" />
                                <span className="ms-2">{tx.shortlist}</span>
                              </Button>
                            )}
                            <Button size="sm" onClick={() => setAwardConfirmId(q.id)} disabled={busy}>
                              {tx.award}
                            </Button>
                            <Button size="sm" variant="ghost" onClick={() => void onReject(q.id)} disabled={busy}>
                              <X className="h-4 w-4" />
                            </Button>
                          </div>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
          {error && <p className="text-sm text-destructive mt-3">{error}</p>}
        </CardContent>
      </Card>

      {activeRfqId && rfqItems.length > 0 && (
        <Card data-testid="proc-line-matrix-card">
          <CardHeader>
            <CardTitle className="text-base">{tx.lineMatrix}</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <table className="w-full text-sm" data-testid="proc-line-matrix-table">
                <thead className="text-muted-foreground text-start">
                  <tr>
                    <th className="py-2 pe-3">{tx.item}</th>
                    <th className="py-2 pe-3 text-end">{tx.qty}</th>
                    <th className="py-2 pe-3">{tx.unit}</th>
                    <th className="py-2 pe-3">{tx.brand}</th>
                    {scored.map((q) => {
                      const supName =
                        suppliers.find((s) => s.id === q.supplier_id)?.name ?? q.supplier_id.slice(0, 6);
                      return (
                        <th key={q.id} className="py-2 pe-3 text-end">
                          <span dir="auto">{supName}</span>
                        </th>
                      );
                    })}
                  </tr>
                </thead>
                <tbody>
                  {rfqItems.map((ri) => {
                    // Compute best unit price per row.
                    const cells = scored.map((q) => {
                      const li = quoteItems.find(
                        (it) => it.quote_id === q.id && it.rfq_item_id === ri.id,
                      );
                      return { quoteId: q.id, line: li ?? null };
                    });
                    const bestUnit = cells
                      .map((c) => c.line?.unit_price)
                      .filter((v): v is number => typeof v === "number" && v >= 0)
                      .reduce<number | null>((a, b) => (a === null || b < a ? b : a), null);
                    const isDraft = activeRfq?.status === 'draft';
                    const brandLabel = ri.requested_brand_id
                      ? brandLabels[ri.requested_brand_id]
                        ? isRTL
                          ? brandLabels[ri.requested_brand_id].name_ar
                          : brandLabels[ri.requested_brand_id].name_en
                        : tx.brandUnavailable
                      : null;
                    return (
                      <tr key={ri.id} className="border-t align-top">
                        <td className="py-2 pe-3" dir="auto">{ri.name}</td>
                        <td className="py-2 pe-3 text-end tech-content">{ri.quantity}</td>
                        <td className="py-2 pe-3 tech-content">{ri.unit ?? ""}</td>
                        <td
                          className="py-2 pe-3 align-top min-w-[180px]"
                          data-testid="proc-rfq-item-brand"
                        >
                          {isDraft ? (
                            <div className="space-y-1">
                              <ApprovedBrandPicker
                                mode="single"
                                value={ri.requested_brand_id ?? null}
                                onChange={(v) => {
                                  if (v === null) {
                                    void onPatchItemBrand(ri, {
                                      requested_brand_id: null,
                                      brand_lock: null,
                                    });
                                  } else if (v !== ri.requested_brand_id) {
                                    void onPatchItemBrand(ri, {
                                      requested_brand_id: v,
                                      brand_lock: ri.brand_lock ?? 'preferred',
                                    });
                                  }
                                }}
                              />
                              {ri.requested_brand_id && (
                                <div
                                  className="flex flex-wrap items-center gap-1"
                                  role="radiogroup"
                                  aria-label={tx.brandLock}
                                  data-testid="proc-rfq-item-brand-lock"
                                >
                                  {(['exact', 'preferred', 'flexible'] as const).map((lk) => {
                                    const active = (ri.brand_lock ?? 'preferred') === lk;
                                    const lkLabel =
                                      lk === 'exact'
                                        ? tx.lockExact
                                        : lk === 'preferred'
                                          ? tx.lockPreferred
                                          : tx.lockFlexible;
                                    return (
                                      <button
                                        key={lk}
                                        type="button"
                                        role="radio"
                                        aria-checked={active}
                                        onClick={() => {
                                          if (!active) {
                                            void onPatchItemBrand(ri, { brand_lock: lk });
                                          }
                                        }}
                                        className={`rounded-full border px-2 py-0.5 text-[10px] transition-colors ${
                                          active
                                            ? 'border-primary bg-primary/10 text-primary'
                                            : 'border-border/40 hover:bg-accent/5 text-muted-foreground'
                                        }`}
                                        title={describeBrandLock(lk, isRTL ? 'ar' : 'en')}
                                      >
                                        {lkLabel}
                                      </button>
                                    );
                                  })}
                                  <span
                                    className="ms-1 text-[10px] text-muted-foreground"
                                    dir="auto"
                                  >
                                    {describeBrandLock(ri.brand_lock ?? 'preferred', isRTL ? 'ar' : 'en')}
                                  </span>
                                </div>
                              )}
                            </div>
                          ) : (
                            <span className="text-[11px]" dir="auto">
                              {brandLabel ?? (
                                <span className="text-muted-foreground">{tx.noBrand}</span>
                              )}
                            </span>
                          )}
                        </td>
                        {cells.map((c) => {
                          if (!c.line || c.line.unit_price == null) {
                            return (
                              <td key={c.quoteId} className="py-2 pe-3 text-end text-muted-foreground tech-content">
                                {tx.missing}
                              </td>
                            );
                          }
                          const isBest = bestUnit !== null && c.line.unit_price === bestUnit;
                          return (
                            <td
                              key={c.quoteId}
                              className={`py-2 pe-3 text-end tech-content ${isBest ? "text-emerald-600 font-semibold" : ""}`}
                            >
                              {c.line.unit_price}
                              {isBest && <span className="ms-1 text-[10px]">★ {tx.best}</span>}
                            </td>
                          );
                        })}
                      </tr>
                    );
                  })}
                  <tr className="border-t font-medium">
                    <td className="py-2 pe-3" colSpan={4}>{tx.poTotal}</td>
                    {scored.map((q) => {
                      const m = matrix.find((mm) => mm.quote_id === q.id);
                      const total = m?.computed_total ?? q.total_amount ?? 0;
                      return (
                        <td key={q.id} className="py-2 pe-3 text-end tech-content">
                          {total} {q.currency}
                        </td>
                      );
                    })}
                  </tr>
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      )}

      {activeRfqId && (
        <Card data-testid="proc-po-drafts-card">
          <CardHeader>
            <CardTitle className="text-base">{tx.poDrafts}</CardTitle>
          </CardHeader>
          <CardContent>
            {purchaseOrders.length === 0 ? (
              <p className="text-muted-foreground text-sm">{tx.noPoDrafts}</p>
            ) : (
              <ul className="space-y-2">
                {purchaseOrders.map((po) => (
                  <li
                    key={po.id}
                    className="flex items-center justify-between gap-3 rounded-xl border bg-card p-3"
                  >
                    <div className="min-w-0">
                      <div className="font-medium tech-content">{po.po_number ?? po.id.slice(0, 8)}</div>
                      <div className="text-xs text-muted-foreground" dir="auto">{po.supplier_name}</div>
                    </div>
                    <div className="flex items-center gap-3">
                      <Badge variant="secondary">{po.status}</Badge>
                      <span className="tech-content text-sm">
                        {po.total} {po.currency}
                      </span>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>
      )}

      {activeRfq && request && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          <RelatedReferencesPanel
            className="lg:col-span-1"
            entries={[
              { label: { ar: 'RFQ', en: 'RFQ' }, refId: activeRfq.rfq_number },
              ...purchaseOrders.map((po) => ({
                label: { ar: 'أمر شراء', en: 'PO' },
                refId: po.po_number,
              })),
            ]}
          />
          <UnifiedTimeline
            className="lg:col-span-2"
            businessId={request.business_id}
            limit={30}
            filter={(e) =>
              e.entity_id === activeRfq.id ||
              (typeof e.metadata?.ref_id === 'string' && e.metadata.ref_id === activeRfq.rfq_number)
            }
          />
          <DiagnosticsCard
            className="lg:col-span-3"
            title={isRTL ? 'ملاحظات المشتريات' : 'Procurement diagnostics'}
            entries={(() => {
              const d = computeProcurementDiagnostics([
                {
                  rfq_id: activeRfq.id,
                  status: activeRfq.status,
                  awarded_quote_id: activeRfq.awarded_quote_id,
                  supplier_quote_count: scored.length,
                  po_count: purchaseOrders.length,
                },
              ]);
              return [
                {
                  key: 'rfq-no-quote',
                  label: isRTL ? 'RFQ بدون عروض موردين' : 'RFQ without supplier quote',
                  count: d.rfqWithoutSupplierQuote,
                },
                {
                  key: 'awarded-no-po',
                  label: isRTL ? 'تمت الترسية دون أمر شراء' : 'Awarded without PO',
                  count: d.awardedWithoutPo,
                },
              ];
            })()}
          />
        </div>
      )}
    </div>
  );
}