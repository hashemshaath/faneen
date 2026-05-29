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
      notEligible: isRTL ? "لا يمكن منح هذا العرض الآن." : "This quote cannot be awarded right now.",
      sentAt: isRTL ? "أُرسل في" : "Sent",
      expiresAt: isRTL ? "تنتهي في" : "Expires",
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
    </div>
  );
}