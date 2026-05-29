/**
 * BUSINESS-WORKFLOW-PROCUREMENT-1 — Procurement request detail.
 * Shows RFQs + quote comparison. All Supabase access via `@/modules/procurement`.
 */
import { useCallback, useEffect, useMemo, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { ArrowLeft, Loader2, Plus, RefreshCw, Trophy } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { useLanguage } from "@/i18n/LanguageContext";
import { useNoIndex } from "@/hooks/useNoIndex";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  awardSupplierQuote,
  compareSupplierQuotes,
  createRfqFromRequest,
  getProcurementRequestById,
  listRfqs,
  listSupplierQuotesByRfq,
  type ProcurementRequestRow,
  type ProcurementRfqRow,
  type ScoredQuote,
} from "@/modules/procurement";

export default function DashboardProcurementDetail() {
  useNoIndex();
  const { isRTL } = useLanguage();
  const { user } = useAuth();
  const { id } = useParams<{ id: string }>();

  const [request, setRequest] = useState<ProcurementRequestRow | null>(null);
  const [rfqs, setRfqs] = useState<ProcurementRfqRow[]>([]);
  const [activeRfqId, setActiveRfqId] = useState<string | null>(null);
  const [scored, setScored] = useState<ScoredQuote[]>([]);
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
    if (next) {
      const { data: quotes } = await listSupplierQuotesByRfq(next);
      setScored(compareSupplierQuotes(quotes ?? []));
    } else {
      setScored([]);
    }
    setLoading(false);
  }, [id, tx.errLoad]);

  useEffect(() => {
    void load();
  }, [load]);

  const onSelectRfq = useCallback(async (rfqId: string) => {
    setActiveRfqId(rfqId);
    const { data } = await listSupplierQuotesByRfq(rfqId);
    setScored(compareSupplierQuotes(data ?? []));
  }, []);

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

  const onAward = useCallback(
    async (quoteId: string) => {
      setBusy(true);
      const { error: err } = await awardSupplierQuote(quoteId);
      setBusy(false);
      if (err) {
        setError(tx.errAward);
        return;
      }
      await load();
    },
    [load, tx.errAward],
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
          )}
        </CardContent>
      </Card>

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
                <thead className="text-muted-foreground text-left rtl:text-right">
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
                    <tr key={q.id} className="border-t">
                      <td className="py-2 pe-3">{q.rank}</td>
                      <td className="py-2 pe-3 tech-content">{q.supplier_id.slice(0, 8)}</td>
                      <td className="py-2 pe-3 tech-content">
                        {q.total_amount ?? "—"} {q.currency}
                      </td>
                      <td className="py-2 pe-3 tech-content">{q.lead_time_days ?? "—"}</td>
                      <td className="py-2 pe-3 tech-content">{q.score}</td>
                      <td className="py-2 pe-3">
                        {q.status === "selected" ? (
                          <Badge className="bg-emerald-600 hover:bg-emerald-600 text-white">
                            <Trophy className="h-3 w-3 me-1" />
                            {tx.awarded}
                          </Badge>
                        ) : (
                          <Button size="sm" variant="outline" onClick={() => void onAward(q.id)} disabled={busy}>
                            {tx.award}
                          </Button>
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