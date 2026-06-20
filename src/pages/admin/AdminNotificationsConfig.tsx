import { useMemo, useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { DashboardLayout } from "@/components/dashboard/DashboardLayout";
import { PageHeader } from "@/components/shared";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Bell, Save, Search, Filter, Mail, MessageSquare, Smartphone, MonitorSmartphone } from "lucide-react";
import { useLanguage } from "@/i18n/LanguageContext";
import { useNoIndex } from "@/hooks/useNoIndex";
import { toast } from "sonner";

type Channel = "in_app" | "email" | "whatsapp" | "sms";
type Role = "client" | "provider" | "admin";

interface Template {
  id: string;
  event_type: string;
  recipient_role: Role;
  channel: Channel;
  enabled: boolean;
  title_ar: string | null;
  title_en: string | null;
  body_ar: string;
  body_en: string;
  notes: string | null;
  updated_at: string;
}

const CHANNEL_META: Record<Channel, { icon: typeof Mail; ar: string; en: string }> = {
  in_app: { icon: MonitorSmartphone, ar: "داخل التطبيق", en: "In-app" },
  email: { icon: Mail, ar: "بريد", en: "Email" },
  whatsapp: { icon: MessageSquare, ar: "واتساب", en: "WhatsApp" },
  sms: { icon: Smartphone, ar: "رسائل", en: "SMS" },
};

const ROLE_LABEL: Record<Role, { ar: string; en: string }> = {
  client: { ar: "عميل", en: "Client" },
  provider: { ar: "مزوّد", en: "Provider" },
  admin: { ar: "أدمن", en: "Admin" },
};

const AdminNotificationsConfig = () => {
  useNoIndex();
  const { isRTL } = useLanguage();
  const qc = useQueryClient();

  const [search, setSearch] = useState("");
  const [roleFilter, setRoleFilter] = useState<"all" | Role>("all");
  const [channelFilter, setChannelFilter] = useState<"all" | Channel>("all");
  const [drafts, setDrafts] = useState<Record<string, Partial<Template>>>({});

  const { data: rows = [], isLoading } = useQuery({
    queryKey: ["notification-event-templates"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("notification_event_templates")
        .select("*")
        .order("event_type", { ascending: true })
        .order("recipient_role", { ascending: true })
        .order("channel", { ascending: true });
      if (error) throw error;
      return (data ?? []) as Template[];
    },
  });

  const filtered = useMemo(() => {
    return rows.filter((r) => {
      if (roleFilter !== "all" && r.recipient_role !== roleFilter) return false;
      if (channelFilter !== "all" && r.channel !== channelFilter) return false;
      if (search.trim()) {
        const q = search.toLowerCase();
        return (
          r.event_type.toLowerCase().includes(q) ||
          (r.title_ar ?? "").toLowerCase().includes(q) ||
          (r.title_en ?? "").toLowerCase().includes(q) ||
          r.body_ar.toLowerCase().includes(q) ||
          r.body_en.toLowerCase().includes(q)
        );
      }
      return true;
    });
  }, [rows, roleFilter, channelFilter, search]);

  const save = useMutation({
    mutationFn: async ({ id, patch }: { id: string; patch: Partial<Template> }) => {
      const { error } = await supabase
        .from("notification_event_templates")
        .update(patch)
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: (_d, vars) => {
      setDrafts((prev) => {
        const { [vars.id]: _, ...rest } = prev;
        return rest;
      });
      qc.invalidateQueries({ queryKey: ["notification-event-templates"] });
      toast.success(isRTL ? "تم الحفظ" : "Saved");
    },
    onError: (err: unknown) => {
      toast.error(err instanceof Error ? err.message : isRTL ? "تعذّر الحفظ" : "Save failed");
    },
  });

  const toggleEnabled = (row: Template, enabled: boolean) => {
    save.mutate({ id: row.id, patch: { enabled } });
  };

  const updateDraft = (id: string, patch: Partial<Template>) => {
    setDrafts((prev) => ({ ...prev, [id]: { ...prev[id], ...patch } }));
  };

  const eventGroups = useMemo(() => {
    const map = new Map<string, Template[]>();
    for (const r of filtered) {
      const list = map.get(r.event_type) ?? [];
      list.push(r);
      map.set(r.event_type, list);
    }
    return Array.from(map.entries());
  }, [filtered]);

  return (
    <DashboardLayout>
      <div className="space-y-4">
        <PageHeader
          icon={Bell}
          tone="accent"
          eyebrow={isRTL ? "إعدادات" : "Settings"}
          title={isRTL ? "قنوات وقوالب الإشعارات" : "Notification channels & templates"}
          subtitle={isRTL
            ? "تحكّم في القنوات والقوالب ثنائية اللغة وتفعيل/تعطيل الإشعارات حسب الدور"
            : "Manage channels, bilingual templates, and per-role toggles"}
        />

        <Card className="border-border/40">
          <CardContent className="p-3 flex flex-col sm:flex-row gap-2">
            <div className="relative flex-1">
              <Search className="absolute start-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
              <Input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder={isRTL ? "بحث في الأحداث والقوالب..." : "Search events and templates..."}
                className="ps-9 h-9 text-xs"
              />
            </div>
            <Select value={roleFilter} onValueChange={(v) => setRoleFilter(v as "all" | Role)}>
              <SelectTrigger className="w-full sm:w-36 h-9 text-xs">
                <Filter className="w-3 h-3 me-1" /><SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">{isRTL ? "كل الأدوار" : "All roles"}</SelectItem>
                {(Object.keys(ROLE_LABEL) as Role[]).map((r) => (
                  <SelectItem key={r} value={r}>{isRTL ? ROLE_LABEL[r].ar : ROLE_LABEL[r].en}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={channelFilter} onValueChange={(v) => setChannelFilter(v as "all" | Channel)}>
              <SelectTrigger className="w-full sm:w-36 h-9 text-xs">
                <Filter className="w-3 h-3 me-1" /><SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">{isRTL ? "كل القنوات" : "All channels"}</SelectItem>
                {(Object.keys(CHANNEL_META) as Channel[]).map((c) => (
                  <SelectItem key={c} value={c}>{isRTL ? CHANNEL_META[c].ar : CHANNEL_META[c].en}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </CardContent>
        </Card>

        {isLoading ? (
          <p className="text-xs text-muted-foreground py-8 text-center">{isRTL ? "جاري التحميل..." : "Loading..."}</p>
        ) : eventGroups.length === 0 ? (
          <Card className="border-dashed border-2"><CardContent className="py-10 text-center text-xs text-muted-foreground">
            {isRTL ? "لا توجد قوالب مطابقة" : "No matching templates"}
          </CardContent></Card>
        ) : (
          <div className="space-y-3">
            {eventGroups.map(([event, items]) => (
              <Card key={event} className="border-border/40">
                <CardContent className="p-3 space-y-2">
                  <div className="flex items-center gap-2">
                    <Badge variant="secondary" className="text-[10px] font-mono">{event}</Badge>
                    <span className="text-[10px] text-muted-foreground">
                      {items.length} {isRTL ? "قالب" : "templates"}
                    </span>
                  </div>
                  <div className="grid gap-2">
                    {items.map((row) => {
                      const meta = CHANNEL_META[row.channel];
                      const Icon = meta.icon;
                      const draft = drafts[row.id] ?? {};
                      const dirty = Object.keys(draft).length > 0;
                      return (
                        <div key={row.id} className="rounded-lg border border-border/40 p-2.5 bg-card/40 space-y-2">
                          <div className="flex items-center justify-between gap-2 flex-wrap">
                            <div className="flex items-center gap-2 flex-wrap">
                              <Icon className="w-3.5 h-3.5 text-primary" />
                              <span className="text-[11px] font-semibold">{isRTL ? meta.ar : meta.en}</span>
                              <Badge variant="outline" className="text-[9px]">
                                {isRTL ? ROLE_LABEL[row.recipient_role].ar : ROLE_LABEL[row.recipient_role].en}
                              </Badge>
                            </div>
                            <div className="flex items-center gap-2">
                              <span className="text-[10px] text-muted-foreground">
                                {row.enabled ? (isRTL ? "مفعّل" : "Enabled") : (isRTL ? "معطّل" : "Disabled")}
                              </span>
                              <Switch checked={row.enabled} onCheckedChange={(v) => toggleEnabled(row, v)} />
                            </div>
                          </div>

                          {(row.channel === "in_app" || row.channel === "email") && (
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                              <Input
                                dir="auto"
                                value={(draft.title_ar ?? row.title_ar) ?? ""}
                                onChange={(e) => updateDraft(row.id, { title_ar: e.target.value })}
                                placeholder={isRTL ? "العنوان (عربي)" : "Title (Arabic)"}
                                className="h-8 text-xs"
                              />
                              <Input
                                dir="auto"
                                value={(draft.title_en ?? row.title_en) ?? ""}
                                onChange={(e) => updateDraft(row.id, { title_en: e.target.value })}
                                placeholder={isRTL ? "العنوان (إنجليزي)" : "Title (English)"}
                                className="h-8 text-xs"
                              />
                            </div>
                          )}

                          <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                            <Textarea
                              dir="auto"
                              value={draft.body_ar ?? row.body_ar}
                              onChange={(e) => updateDraft(row.id, { body_ar: e.target.value })}
                              placeholder={isRTL ? "النص (عربي)" : "Body (Arabic)"}
                              className="min-h-[60px] text-xs"
                            />
                            <Textarea
                              dir="auto"
                              value={draft.body_en ?? row.body_en}
                              onChange={(e) => updateDraft(row.id, { body_en: e.target.value })}
                              placeholder={isRTL ? "النص (إنجليزي)" : "Body (English)"}
                              className="min-h-[60px] text-xs"
                            />
                          </div>

                          {dirty && (
                            <div className="flex justify-end gap-2">
                              <Button
                                variant="ghost"
                                size="sm"
                                className="h-7 text-[10px]"
                                onClick={() => setDrafts((p) => { const { [row.id]: _, ...rest } = p; return rest; })}
                              >
                                {isRTL ? "إلغاء" : "Cancel"}
                              </Button>
                              <Button
                                size="sm"
                                className="h-7 text-[10px] gap-1"
                                disabled={save.isPending}
                                onClick={() => save.mutate({ id: row.id, patch: draft })}
                              >
                                <Save className="w-3 h-3" />
                                {isRTL ? "حفظ" : "Save"}
                              </Button>
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </DashboardLayout>
  );
};

export default AdminNotificationsConfig;