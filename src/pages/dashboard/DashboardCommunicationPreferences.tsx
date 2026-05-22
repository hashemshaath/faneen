import React, { useEffect, useMemo, useState } from "react";
import { DashboardLayout } from "@/components/dashboard/DashboardLayout";
import { useLanguage } from "@/i18n/LanguageContext";
import { useAuth } from "@/contexts/AuthContext";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  Bell, Mail, Smartphone, MessageCircle, Wrench, FileText,
  CalendarCheck, Megaphone, Inbox, Building2, Loader2, Save, ShieldAlert, RotateCcw,
} from "lucide-react";
import { useNoIndex } from "@/hooks/useNoIndex";

type Prefs = {
  email_enabled: boolean;
  in_app_enabled: boolean;
  sms_enabled: boolean;
  email_marketing: boolean;
  email_messages: boolean;
  email_maintenance_updates: boolean;
  email_contracts: boolean;
  email_bookings: boolean;
  email_leads: boolean;
  email_system: boolean;
  inapp_messages: boolean;
  inapp_maintenance_updates: boolean;
  inapp_contracts: boolean;
  inapp_bookings: boolean;
  inapp_leads: boolean;
  inapp_system: boolean;
};

type BizPrefs = {
  email_enabled: boolean;
  email_leads: boolean;
  email_bookings: boolean;
  email_contracts: boolean;
  email_maintenance_updates: boolean;
  email_messages: boolean;
  email_marketing: boolean;
};

const DEFAULTS: Prefs = {
  email_enabled: true, in_app_enabled: true, sms_enabled: false,
  email_marketing: true, email_messages: true, email_maintenance_updates: true,
  email_contracts: true, email_bookings: true, email_leads: true, email_system: true,
  inapp_messages: true, inapp_maintenance_updates: true, inapp_contracts: true,
  inapp_bookings: true, inapp_leads: true, inapp_system: true,
};

const BIZ_DEFAULTS: BizPrefs = {
  email_enabled: true, email_leads: true, email_bookings: true,
  email_contracts: true, email_maintenance_updates: true,
  email_messages: true, email_marketing: false,
};

const DashboardCommunicationPreferences: React.FC = () => {
  useNoIndex();
  const { isRTL } = useLanguage();
  const { user } = useAuth();
  const qc = useQueryClient();

  const [prefs, setPrefs] = useState<Prefs>(DEFAULTS);
  const [savedPrefs, setSavedPrefs] = useState<Prefs>(DEFAULTS);
  const [bizPrefs, setBizPrefs] = useState<BizPrefs | null>(null);
  const [savedBizPrefs, setSavedBizPrefs] = useState<BizPrefs | null>(null);
  const [bizId, setBizId] = useState<string | null>(null);
  const [bizName, setBizName] = useState<string>("");

  // Load user prefs
  const { isLoading } = useQuery({
    queryKey: ["notification-prefs", user?.id],
    enabled: !!user?.id,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("notification_preferences")
        .select("*")
        .eq("user_id", user!.id)
        .maybeSingle();
      if (error) throw error;
      if (data) {
        const { id: _id, user_id: _u, created_at: _c, updated_at: _up, ...rest } = data as Record<string, unknown>;
        const merged = { ...DEFAULTS, ...(rest as Partial<Prefs>) };
        setPrefs(merged);
        setSavedPrefs(merged);
      }
      return data;
    },
  });

  // Detect a business owned/managed by the user
  useQuery({
    queryKey: ["my-primary-business", user?.id],
    enabled: !!user?.id,
    queryFn: async () => {
      const { data: biz } = await getOwnerBusiness<{ id: string; name_ar: string | null; name_en: string | null }>({
        userId: user!.id,
        select: "id, name_ar, name_en",
        limit: 1,
      });
      if (biz) {
        setBizId(biz.id);
        setBizName(isRTL ? biz.name_ar : (biz.name_en ?? biz.name_ar));
        const { data: bp } = await supabase
          .from("business_notification_preferences")
          .select("*")
          .eq("business_id", biz.id)
          .maybeSingle();
        if (bp) {
          const { id: _id, business_id: _b, created_at: _c, updated_at: _u, ...rest } = bp as Record<string, unknown>;
          const merged = { ...BIZ_DEFAULTS, ...(rest as Partial<BizPrefs>) };
          setBizPrefs(merged);
          setSavedBizPrefs(merged);
        } else {
          setBizPrefs(BIZ_DEFAULTS);
          setSavedBizPrefs(BIZ_DEFAULTS);
        }
      }
      return biz;
    },
  });

  const saveUser = useMutation({
    mutationFn: async () => {
      if (!user?.id) throw new Error("not authenticated");
      // Force essential system alerts ON for safety
      const payload = { ...prefs, email_system: true, inapp_system: true };
      const { error } = await supabase
        .from("notification_preferences")
        .upsert({ user_id: user.id, ...payload }, { onConflict: "user_id" });
      if (error) throw error;
      return payload;
    },
    onSuccess: (payload) => {
      toast.success(isRTL ? "تم حفظ تفضيلاتك" : "Preferences saved");
      setSavedPrefs(payload as Prefs);
      qc.invalidateQueries({ queryKey: ["notification-prefs"] });
    },
    onError: (e: unknown) => toast.error(e instanceof Error ? e.message : "Error"),
  });

  const saveBiz = useMutation({
    mutationFn: async () => {
      if (!bizId || !bizPrefs) throw new Error("no business");
      const { error } = await supabase
        .from("business_notification_preferences")
        .upsert({ business_id: bizId, ...bizPrefs }, { onConflict: "business_id" });
      if (error) throw error;
      return bizPrefs;
    },
    onSuccess: (payload) => {
      toast.success(isRTL ? "تم حفظ تفضيلات الجهة" : "Business preferences saved");
      if (payload) setSavedBizPrefs(payload);
    },
    onError: (e: unknown) => toast.error(e instanceof Error ? e.message : "Error"),
  });

  const setP = (k: keyof Prefs, v: boolean) => setPrefs((p) => ({ ...p, [k]: v }));
  const setB = (k: keyof BizPrefs, v: boolean) => setBizPrefs((b) => (b ? { ...b, [k]: v } : b));

  const userDirty = useMemo(
    () => (Object.keys(prefs) as Array<keyof Prefs>).some((k) => prefs[k] !== savedPrefs[k]),
    [prefs, savedPrefs]
  );
  const bizDirty = useMemo(() => {
    if (!bizPrefs || !savedBizPrefs) return false;
    return (Object.keys(bizPrefs) as Array<keyof BizPrefs>).some((k) => bizPrefs[k] !== savedBizPrefs[k]);
  }, [bizPrefs, savedBizPrefs]);

  const resetUser = () => setPrefs(savedPrefs);
  const resetBiz = () => setBizPrefs(savedBizPrefs);

  const userCategories = useMemo(() => ([
    { key: "messages",            icon: MessageCircle,  ar: "الرسائل",                 en: "Messages" },
    { key: "maintenance_updates", icon: Wrench,         ar: "تحديثات الصيانة",         en: "Maintenance updates" },
    { key: "contracts",           icon: FileText,       ar: "العقود",                  en: "Contracts" },
    { key: "bookings",            icon: CalendarCheck,  ar: "الحجوزات",                en: "Bookings" },
    { key: "leads",               icon: Inbox,          ar: "طلبات العملاء (Leads)",   en: "Lead requests" },
    { key: "marketing",           icon: Megaphone,      ar: "العروض والتسويق",         en: "Marketing & offers" },
  ] as const), []);

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Bell className="h-6 w-6 text-primary" />
            {isRTL ? "تفضيلات التواصل" : "Communication preferences"}
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            {isRTL
              ? "تحكّم في القنوات وأنواع الإشعارات التي تتلقاها. ستحترم رسائل البريد هذه التفضيلات تلقائياً."
              : "Control which channels and categories you receive. Outgoing emails respect these settings automatically."}
          </p>
        </div>

        {isLoading && (
          <div className="space-y-3" aria-busy="true" aria-live="polite">
            <Skeleton className="h-32 w-full rounded-xl" />
            <Skeleton className="h-64 w-full rounded-xl" />
          </div>
        )}

        {!isLoading && (
        <>
        {/* Master channel switches */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">{isRTL ? "القنوات الرئيسية" : "Main channels"}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <ChannelRow icon={Mail} title={isRTL ? "البريد الإلكتروني" : "Email"} desc={isRTL ? "إشعارات إلى بريدك المسجّل." : "Notifications to your registered email."} value={prefs.email_enabled} onChange={(v) => setP("email_enabled", v)} />
            <ChannelRow icon={Bell} title={isRTL ? "الإشعارات داخل التطبيق" : "In-app notifications"} desc={isRTL ? "تظهر داخل لوحة الإشعارات." : "Shown in the in-app notifications panel."} value={prefs.in_app_enabled} onChange={(v) => setP("in_app_enabled", v)} />
            <ChannelRow
              icon={Smartphone}
              title={isRTL ? "الرسائل النصية SMS" : "SMS"}
              desc={isRTL ? "قريباً — لم يتم تفعيل قناة SMS بعد." : "Coming soon — SMS channel is not enabled yet."}
              value={false}
              onChange={() => { /* disabled */ }}
              disabled
              badge={isRTL ? "قريباً" : "Soon"}
            />
          </CardContent>
        </Card>

        {/* Per-category */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">{isRTL ? "أنواع الإشعارات" : "Notification categories"}</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border text-muted-foreground">
                    <th className="text-start py-2 px-2 font-medium">{isRTL ? "النوع" : "Category"}</th>
                    <th className="py-2 px-2 font-medium text-center">{isRTL ? "بريد" : "Email"}</th>
                    <th className="py-2 px-2 font-medium text-center">{isRTL ? "داخل التطبيق" : "In-app"}</th>
                  </tr>
                </thead>
                <tbody>
                  {userCategories.map(({ key, icon: Icon, ar, en }) => {
                    const emailKey = `email_${key}` as keyof Prefs;
                    const inappKey = `inapp_${key}` as keyof Prefs;
                    const hasInapp = key !== "marketing";
                    const label = isRTL ? ar : en;
                    return (
                      <tr key={key} className="border-b border-border/60">
                        <td className="py-3 px-2">
                          <div className="flex items-center gap-2">
                            <Icon className="h-4 w-4 text-muted-foreground" aria-hidden="true" />
                            <span>{label}</span>
                          </div>
                        </td>
                        <td className="py-3 px-2 text-center">
                          <Switch
                            checked={!!prefs[emailKey] && prefs.email_enabled}
                            disabled={!prefs.email_enabled}
                            onCheckedChange={(v) => setP(emailKey, v)}
                            aria-label={`${label} — ${isRTL ? "بريد" : "Email"}`}
                          />
                        </td>
                        <td className="py-3 px-2 text-center">
                          {hasInapp ? (
                            <Switch
                              checked={!!prefs[inappKey] && prefs.in_app_enabled}
                              disabled={!prefs.in_app_enabled}
                              onCheckedChange={(v) => setP(inappKey, v)}
                              aria-label={`${label} — ${isRTL ? "داخل التطبيق" : "In-app"}`}
                            />
                          ) : (
                            <span className="text-muted-foreground text-xs">—</span>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                  {/* Essential system row — locked on */}
                  <tr className="border-b border-border/60 bg-muted/30">
                    <td className="py-3 px-2">
                      <div className="flex items-center gap-2">
                        <ShieldAlert className="h-4 w-4 text-primary" aria-hidden="true" />
                        <div className="flex flex-col">
                          <span>{isRTL ? "إشعارات النظام والأمان" : "System & security alerts"}</span>
                          <span className="text-[11px] text-muted-foreground">
                            {isRTL ? "تنبيهات أساسية لا يمكن تعطيلها" : "Essential — cannot be disabled"}
                          </span>
                        </div>
                      </div>
                    </td>
                    <td className="py-3 px-2 text-center">
                      <Switch checked disabled aria-label={isRTL ? "إشعارات النظام — بريد (مفعّلة دائمًا)" : "System — Email (always on)"} />
                    </td>
                    <td className="py-3 px-2 text-center">
                      <Switch checked disabled aria-label={isRTL ? "إشعارات النظام — داخل التطبيق (مفعّلة دائمًا)" : "System — In-app (always on)"} />
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>

            <div className="flex flex-wrap items-center justify-end gap-2 mt-4">
              {userDirty && (
                <span className="me-auto text-xs text-amber-600 dark:text-amber-400" role="status">
                  {isRTL ? "لديك تغييرات غير محفوظة" : "You have unsaved changes"}
                </span>
              )}
              <Button
                variant="outline"
                onClick={resetUser}
                disabled={!userDirty || saveUser.isPending}
                className="h-11 rounded-xl"
              >
                <RotateCcw className="h-4 w-4 me-2" aria-hidden="true" />
                {isRTL ? "تراجع" : "Reset"}
              </Button>
              <Button
                onClick={() => saveUser.mutate()}
                disabled={saveUser.isPending || isLoading || !userDirty}
                className="h-11 rounded-xl"
              >
                {saveUser.isPending ? <Loader2 className="h-4 w-4 animate-spin me-2" /> : <Save className="h-4 w-4 me-2" />}
                {isRTL ? "حفظ التفضيلات" : "Save preferences"}
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Business preferences */}
        {bizId && bizPrefs && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base">
                <Building2 className="h-5 w-5 text-primary" />
                {isRTL ? "تفضيلات إيميل الجهة" : "Business email preferences"}
                <Badge variant="outline" className="ms-2">{bizName}</Badge>
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <p className="text-xs text-muted-foreground">
                {isRTL
                  ? "تتحكم هنا في أنواع رسائل البريد المرسَلة إلى عنوان البريد المسجّل للجهة."
                  : "Controls which email types are sent to the business's registered email address."}
              </p>
              <ChannelRow icon={Mail} title={isRTL ? "تفعيل بريد الجهة" : "Enable business email"} desc={isRTL ? "إذا أُوقف لن تتلقى الجهة أي إيميلات." : "If disabled the business receives no emails."} value={bizPrefs.email_enabled} onChange={(v) => setB("email_enabled", v)} />
              {([
                { k: "email_leads",                ar: "طلبات العملاء (Leads)", en: "Lead requests",        icon: Inbox },
                { k: "email_bookings",             ar: "الحجوزات",              en: "Bookings",             icon: CalendarCheck },
                { k: "email_contracts",            ar: "العقود",                en: "Contracts",            icon: FileText },
                { k: "email_maintenance_updates",  ar: "تحديثات الصيانة",       en: "Maintenance updates",  icon: Wrench },
                { k: "email_messages",             ar: "الرسائل",               en: "Messages",             icon: MessageCircle },
                { k: "email_marketing",            ar: "تسويق وعروض",           en: "Marketing",            icon: Megaphone },
              ] as const).map(({ k, ar, en, icon: Icon }) => (
                <div key={k} className="flex items-center justify-between gap-3 rounded-xl border border-border p-3">
                  <div className="flex items-center gap-3">
                    <Icon className="h-4 w-4 text-muted-foreground" aria-hidden="true" />
                    <span className="text-sm">{isRTL ? ar : en}</span>
                  </div>
                  <Switch
                    checked={!!bizPrefs[k] && bizPrefs.email_enabled}
                    disabled={!bizPrefs.email_enabled}
                    onCheckedChange={(v) => setB(k, v)}
                    aria-label={`${isRTL ? ar : en} — ${isRTL ? "بريد الجهة" : "Business email"}`}
                  />
                </div>
              ))}
              <div className="flex flex-wrap items-center justify-end gap-2 pt-2">
                {bizDirty && (
                  <span className="me-auto text-xs text-amber-600 dark:text-amber-400" role="status">
                    {isRTL ? "تغييرات غير محفوظة" : "Unsaved changes"}
                  </span>
                )}
                <Button
                  variant="outline"
                  onClick={resetBiz}
                  disabled={!bizDirty || saveBiz.isPending}
                  className="h-11 rounded-xl"
                >
                  <RotateCcw className="h-4 w-4 me-2" aria-hidden="true" />
                  {isRTL ? "تراجع" : "Reset"}
                </Button>
                <Button onClick={() => saveBiz.mutate()} disabled={saveBiz.isPending || !bizDirty} className="h-11 rounded-xl">
                  {saveBiz.isPending ? <Loader2 className="h-4 w-4 animate-spin me-2" /> : <Save className="h-4 w-4 me-2" />}
                  {isRTL ? "حفظ تفضيلات الجهة" : "Save business preferences"}
                </Button>
              </div>
            </CardContent>
          </Card>
        )}
        </>
        )}
      </div>
    </DashboardLayout>
  );
};

const ChannelRow: React.FC<{
  icon: React.ComponentType<{ className?: string }>;
  title: string;
  desc: string;
  value: boolean;
  onChange: (v: boolean) => void;
  disabled?: boolean;
  badge?: string;
}> = ({ icon: Icon, title, desc, value, onChange, disabled, badge }) => (
  <div className="flex items-start justify-between gap-3 rounded-xl border border-border p-3">
    <div className="flex items-start gap-3">
      <Icon className="h-5 w-5 text-primary mt-0.5" aria-hidden="true" />
      <div>
        <p className="text-sm font-medium flex items-center gap-2">
          {title}
          {badge && <Badge variant="secondary" className="text-[10px] py-0 px-1.5">{badge}</Badge>}
        </p>
        <p className="text-xs text-muted-foreground mt-0.5">{desc}</p>
      </div>
    </div>
    <Switch checked={value} onCheckedChange={onChange} disabled={disabled} aria-label={title} />
  </div>
);

export default DashboardCommunicationPreferences;