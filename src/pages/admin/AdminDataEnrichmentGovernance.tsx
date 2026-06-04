// DATA-ENRICHMENT-GOVERNANCE-1 — Admin dashboard.
// Inline tabs only (no popups, per project UX constraint).
import { useEffect, useMemo, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  listSources, listRecords, listAudit, listSourcesFromDb, listQualitySnapshots,
  approveRecord, runEnrichment, resolveConflict,
  type EnrichmentRecord, type SourceDefinition, type Conflict,
} from "@/modules/dataEnrichment";
import { useLanguage } from "@/i18n/LanguageContext";
import { useNoIndex } from "@/hooks/useNoIndex";

type AuditRow = { id: string; record_id: string | null; action: string; field: string | null; source_key: string | null; created_at: string; reason: string | null };
type QualityRow = { id: string; entity_type: string; entity_id: string; score: number; created_at: string };

export default function AdminDataEnrichmentGovernance() {
  useNoIndex();
  const { isRTL } = useLanguage();
  const ar = isRTL;
  const [sources, setSources] = useState<SourceDefinition[]>(listSources());
  const [records, setRecords] = useState<EnrichmentRecord[]>([]);
  const [audit, setAudit] = useState<AuditRow[]>([]);
  const [quality, setQuality] = useState<QualityRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [tab, setTab] = useState("sources");
  const [sourceStats, setSourceStats] = useState<Record<string, { trust_weight: number; active: boolean }>>({});

  const t = (a: string, e: string) => (ar ? a : e);

  const refresh = async () => {
    setLoading(true);
    const [r, a, src, q] = await Promise.all([
      listRecords(),
      listAudit(),
      listSourcesFromDb(),
      listQualitySnapshots(),
    ]);
    setRecords(r.data ?? []);
    setAudit(((a.data ?? []) as AuditRow[]));
    setQuality(((q.data ?? []) as QualityRow[]));
    const stats: Record<string, { trust_weight: number; active: boolean }> = {};
    ((src.data ?? []) as Array<{ key: string; trust_weight: number; active: boolean }>)
      .forEach((s) => { stats[s.key] = { trust_weight: Number(s.trust_weight), active: s.active }; });
    setSourceStats(stats);
    setLoading(false);
  };

  useEffect(() => { setSources(listSources()); refresh(); }, []);

  const pending = useMemo(() => records.filter((r) => r.status === "pending_review"), [records]);
  const conflicts = useMemo(() => records.filter((r) => (r.conflicts ?? []).length > 0), [records]);
  const lowConfidence = useMemo(() => records.filter((r) => {
    const vals = Object.values(r.confidence ?? {});
    if (vals.length === 0) return false;
    const avg = vals.reduce((s, v) => s + (v ?? 0), 0) / vals.length;
    return avg < 70;
  }), [records]);
  const history = useMemo(() => records.filter((r) => r.status === "approved" || r.status === "applied"), [records]);

  const ingestCountBySource = useMemo(() => {
    const out: Record<string, number> = {};
    records.forEach((r) => { out[r.source_key] = (out[r.source_key] ?? 0) + 1; });
    return out;
  }, [records]);

  return (
    <div className="container mx-auto p-4 md:p-6 space-y-4">
      <header className="flex items-center justify-between flex-wrap gap-2">
        <div>
          <h1 className="text-2xl font-bold">{t("حوكمة إثراء البيانات", "Data Enrichment Governance")}</h1>
          <p className="text-sm text-muted-foreground">
            {t("منصة موحدة لمراقبة جميع مصادر البيانات قبل اعتمادها.", "Unified governance across every data source before approval.")}
          </p>
        </div>
        <Button variant="outline" size="sm" onClick={refresh} disabled={loading}>
          {loading ? t("جارٍ التحديث...", "Refreshing...") : t("تحديث", "Refresh")}
        </Button>
      </header>

      <Tabs value={tab} onValueChange={setTab}>
        <TabsList className="flex-wrap h-auto">
          <TabsTrigger value="sources">{t("المصادر", "Sources")}</TabsTrigger>
          <TabsTrigger value="pending">{t("بانتظار المراجعة", "Pending Reviews")} ({pending.length})</TabsTrigger>
          <TabsTrigger value="conflicts">{t("التعارضات", "Conflicts")} ({conflicts.length})</TabsTrigger>
          <TabsTrigger value="confidence">{t("درجة الثقة", "Confidence")}</TabsTrigger>
          <TabsTrigger value="quality">{t("جودة البيانات", "Quality")}</TabsTrigger>
          <TabsTrigger value="history">{t("السجل", "History")}</TabsTrigger>
          <TabsTrigger value="audit">{t("سجل التدقيق", "Audit Trail")}</TabsTrigger>
        </TabsList>

        <TabsContent value="sources" className="mt-4">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
            {sources.map((s) => {
              const stat = sourceStats[s.key];
              return (
                <Card key={s.key}>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-base flex items-center justify-between">
                      <span>{t(s.label_ar, s.label_en)}</span>
                      <Badge variant={stat?.active === false ? "secondary" : "default"}>
                        {Math.round((stat?.trust_weight ?? s.trust_weight) * 100)}%
                      </Badge>
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="text-sm space-y-1">
                    <div className="text-muted-foreground">{s.kind} · {s.requires_review ? t("يتطلب مراجعة", "Review required") : t("تلقائي", "Auto")}</div>
                    <div>{t("الإدخالات (آخر 200)", "Ingests (last 200)")}: <span className="font-mono">{ingestCountBySource[s.key] ?? 0}</span></div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </TabsContent>

        <TabsContent value="pending" className="mt-4 space-y-2">
          {pending.length === 0 && <p className="text-sm text-muted-foreground">{t("لا توجد سجلات بانتظار المراجعة.", "No records pending review.")}</p>}
          {pending.map((r) => (
            <RecordCard key={r.id} r={r} t={t} onChanged={refresh} />
          ))}
        </TabsContent>

        <TabsContent value="conflicts" className="mt-4 space-y-2">
          {conflicts.length === 0 && <p className="text-sm text-muted-foreground">{t("لا توجد تعارضات.", "No conflicts.")}</p>}
          {conflicts.map((r) => (
            <ConflictCard key={r.id} r={r} t={t} onChanged={refresh} />
          ))}
        </TabsContent>

        <TabsContent value="confidence" className="mt-4 space-y-2">
          <p className="text-sm text-muted-foreground">{t("سجلات بثقة منخفضة (< 70%)", "Low-confidence records (< 70%)")}: {lowConfidence.length}</p>
          {lowConfidence.map((r) => <RecordCard key={r.id} r={r} t={t} onChanged={refresh} />)}
        </TabsContent>

        <TabsContent value="quality" className="mt-4 space-y-2">
          {quality.length === 0 && <p className="text-sm text-muted-foreground">{t("لا توجد لقطات جودة بعد.", "No quality snapshots yet.")}</p>}
          {quality.map((q) => (
            <Card key={q.id}><CardContent className="p-3 flex items-center justify-between text-sm">
              <span className="font-mono">{q.entity_type} · {q.entity_id.slice(0, 8)}</span>
              <Badge>{q.score}/100</Badge>
            </CardContent></Card>
          ))}
        </TabsContent>

        <TabsContent value="history" className="mt-4 space-y-2">
          {history.map((r) => <RecordCard key={r.id} r={r} t={t} onChanged={refresh} />)}
        </TabsContent>

        <TabsContent value="audit" className="mt-4 space-y-1">
          {audit.length === 0 && <p className="text-sm text-muted-foreground">{t("لا توجد إدخالات في سجل التدقيق.", "No audit entries.")}</p>}
          {audit.map((a) => (
            <Card key={a.id}><CardContent className="p-2 text-xs flex items-center justify-between gap-2 flex-wrap">
              <span><Badge variant="outline">{a.action}</Badge></span>
              <span className="text-muted-foreground">{a.source_key ?? "-"}</span>
              <span className="text-muted-foreground">{a.field ?? ""}</span>
              <span className="font-mono text-muted-foreground">{new Date(a.created_at).toLocaleString()}</span>
            </CardContent></Card>
          ))}
        </TabsContent>
      </Tabs>
    </div>
  );
}

function RecordCard({ r, t, onChanged }: { r: EnrichmentRecord; t: (a: string, e: string) => string; onChanged: () => void }) {
  const [busy, setBusy] = useState(false);
  const act = async (decision: "approve" | "reject") => {
    setBusy(true);
    await approveRecord({ record_id: r.id, decision });
    setBusy(false);
    onChanged();
  };
  const enrich = async () => {
    setBusy(true);
    await runEnrichment({ record_id: r.id });
    setBusy(false);
    onChanged();
  };
  return (
    <Card>
      <CardContent className="p-3 space-y-2">
        <div className="flex items-center justify-between flex-wrap gap-2">
          <div className="text-sm">
            <span className="font-medium">{r.normalized?.name_ar || r.normalized?.name_en || r.external_ref || r.id.slice(0, 8)}</span>
            <span className="ml-2 text-muted-foreground">· {r.source_key}</span>
          </div>
          <div className="flex items-center gap-2">
            <Badge variant="outline">{r.status}</Badge>
            <Badge>{r.quality_score}/100</Badge>
          </div>
        </div>
        <div className="flex gap-2">
          <Button size="sm" variant="outline" onClick={enrich} disabled={busy}>{t("تشغيل الإثراء", "Run enrichment")}</Button>
          <Button size="sm" onClick={() => act("approve")} disabled={busy}>{t("اعتماد", "Approve")}</Button>
          <Button size="sm" variant="destructive" onClick={() => act("reject")} disabled={busy}>{t("رفض", "Reject")}</Button>
        </div>
      </CardContent>
    </Card>
  );
}

function ConflictCard({ r, t, onChanged }: { r: EnrichmentRecord; t: (a: string, e: string) => string; onChanged: () => void }) {
  const [conflicts, setConflicts] = useState<Conflict[]>(r.conflicts ?? []);
  const [busy, setBusy] = useState(false);
  const choose = (idx: number, source: string, value: string | null) => {
    setConflicts((prev) => prev.map((c, i) => i === idx ? { ...c, resolved: { source: source as Conflict["values"][number]["source"], value } } : c));
  };
  const save = async () => {
    setBusy(true);
    await resolveConflict({ record_id: r.id, conflicts });
    setBusy(false);
    onChanged();
  };
  return (
    <Card>
      <CardContent className="p-3 space-y-2">
        <div className="text-sm font-medium">{r.id.slice(0, 8)} · {r.source_key}</div>
        {conflicts.map((c, i) => (
          <div key={c.field} className="border rounded-lg p-2 space-y-1">
            <div className="text-xs text-muted-foreground">{c.field}</div>
            <div className="flex flex-wrap gap-2">
              {c.values.map((v) => (
                <Button
                  key={v.source}
                  size="sm"
                  variant={c.resolved?.source === v.source ? "default" : "outline"}
                  onClick={() => choose(i, v.source, v.value)}
                >
                  <span className="font-mono mr-2">{v.source}</span>{v.value ?? "—"} · {v.confidence}%
                </Button>
              ))}
            </div>
          </div>
        ))}
        <Button size="sm" onClick={save} disabled={busy}>{t("حفظ الحل", "Save resolution")}</Button>
      </CardContent>
    </Card>
  );
}