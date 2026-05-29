/**
 * BUSINESS-WORKFLOW-PROCUREMENT-1 — Procurement requests list.
 * Read/write Supabase access goes through `@/modules/procurement` only.
 */
import { useCallback, useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { Loader2, Plus, RefreshCw, ShoppingCart } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { useLanguage } from "@/i18n/LanguageContext";
import { useActiveWorkspace } from "@/modules/workspace";
import useNoIndex from "@/hooks/useNoIndex";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  createProcurementRequest,
  listProcurementRequests,
  type ProcurementRequestRow,
} from "@/modules/procurement";

export default function DashboardProcurement() {
  useNoIndex();
  const { isRTL } = useLanguage();
  const { user } = useAuth();
  const workspace = useActiveWorkspace();
  const businessId = workspace.active_entity_id;

  const [items, setItems] = useState<ProcurementRequestRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [saving, setSaving] = useState(false);

  const tx = useMemo(
    () => ({
      title: isRTL ? "المشتريات وطلبات العروض" : "Procurement & RFQs",
      subtitle: isRTL
        ? "إدارة طلبات الشراء وعروض الموردين"
        : "Manage purchasing requests and supplier RFQs",
      pickBusiness: isRTL
        ? "اختر منشأة من شريط العمل للبدء."
        : "Pick a business from the workspace switcher to begin.",
      empty: isRTL ? "لا توجد طلبات شراء بعد." : "No procurement requests yet.",
      newTitle: isRTL ? "عنوان الطلب" : "Request title",
      newDescription: isRTL ? "الوصف (اختياري)" : "Description (optional)",
      create: isRTL ? "إنشاء طلب" : "Create request",
      refresh: isRTL ? "تحديث" : "Refresh",
      open: isRTL ? "فتح" : "Open",
      status: isRTL ? "الحالة" : "Status",
      created: isRTL ? "تاريخ الإنشاء" : "Created",
      errLoad: isRTL ? "تعذر تحميل الطلبات." : "Failed to load requests.",
      errCreate: isRTL ? "تعذر إنشاء الطلب." : "Failed to create request.",
    }),
    [isRTL],
  );

  const load = useCallback(async () => {
    if (!businessId) return;
    setLoading(true);
    setError(null);
    const { data, error: err } = await listProcurementRequests({ businessId });
    if (err) setError(tx.errLoad);
    setItems(data ?? []);
    setLoading(false);
  }, [businessId, tx.errLoad]);

  useEffect(() => {
    void load();
  }, [load]);

  const onCreate = useCallback(async () => {
    if (!businessId || !user?.id || !title.trim()) return;
    setSaving(true);
    setError(null);
    const { error: err } = await createProcurementRequest({
      business_id: businessId,
      created_by: user.id,
      title: title.trim(),
      description: description.trim() || null,
    });
    setSaving(false);
    if (err) {
      setError(tx.errCreate);
      return;
    }
    setTitle("");
    setDescription("");
    await load();
  }, [businessId, user?.id, title, description, tx.errCreate, load]);

  if (!businessId) {
    return (
      <div className="container mx-auto py-10" dir={isRTL ? "rtl" : "ltr"}>
        <h1 className="text-2xl font-semibold mb-2">{tx.title}</h1>
        <p className="text-muted-foreground">{tx.pickBusiness}</p>
      </div>
    );
  }

  return (
    <div className="container mx-auto py-10 space-y-6" dir={isRTL ? "rtl" : "ltr"}>
      <header className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <ShoppingCart className="h-6 w-6 text-primary" aria-hidden />
          <div>
            <h1 className="text-2xl font-semibold">{tx.title}</h1>
            <p className="text-sm text-muted-foreground">{tx.subtitle}</p>
          </div>
        </div>
        <Button variant="outline" size="sm" onClick={() => void load()} disabled={loading}>
          {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />}
          <span className="ms-2">{tx.refresh}</span>
        </Button>
      </header>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">{tx.create}</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <Input
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder={tx.newTitle}
            dir="auto"
            maxLength={200}
          />
          <Textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder={tx.newDescription}
            dir="auto"
            rows={3}
          />
          <div className="flex justify-end">
            <Button onClick={onCreate} disabled={saving || !title.trim()}>
              {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
              <span className="ms-2">{tx.create}</span>
            </Button>
          </div>
          {error && <p className="text-sm text-destructive">{error}</p>}
        </CardContent>
      </Card>

      {items.length === 0 && !loading ? (
        <p className="text-muted-foreground text-center py-10">{tx.empty}</p>
      ) : (
        <ul className="space-y-2">
          {items.map((it) => (
            <li key={it.id}>
              <Link
                to={`/dashboard/procurement/${it.id}`}
                className="block rounded-xl border bg-card p-4 hover:bg-accent transition"
              >
                <div className="flex items-center justify-between gap-3">
                  <div className="min-w-0">
                    <h2 className="font-medium truncate">{it.title}</h2>
                    {it.description && (
                      <p className="text-sm text-muted-foreground line-clamp-1">{it.description}</p>
                    )}
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <Badge variant="secondary">{it.status}</Badge>
                  </div>
                </div>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}