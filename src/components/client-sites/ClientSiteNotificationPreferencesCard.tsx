/**
 * Client Sites Phase 2.5C — Notification preferences card.
 *
 * Owner-controlled toggles for site event notifications.
 * RPCs: get_client_site_notification_preferences / update_client_site_notification_preferences
 * Manager-only (enforced server-side). UI hidden if RPC denies.
 */
import React, { useEffect, useState } from 'react';
import { useQuery, useMutation } from '@tanstack/react-query';
import { Bell, Loader2, Save } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';

interface Prefs {
  notify_on_qr_scan: boolean;
  notify_on_access_request: boolean;
  notify_on_locked_section_attempt: boolean;
  notify_on_provider_interest: boolean;
  auto_ignore_anonymous_visits: boolean;
  auto_ignore_repeated_visits: boolean;
}

const DEFAULTS: Prefs = {
  notify_on_qr_scan: false,
  notify_on_access_request: true,
  notify_on_locked_section_attempt: false,
  notify_on_provider_interest: true,
  auto_ignore_anonymous_visits: true,
  auto_ignore_repeated_visits: true,
};

interface Props {
  isRTL: boolean;
  siteId: string;
}

const ClientSiteNotificationPreferencesCard: React.FC<Props> = ({ isRTL, siteId }) => {
  const [local, setLocal] = useState<Prefs>(DEFAULTS);
  const [dirty, setDirty] = useState(false);

  const { data, isLoading, refetch } = useQuery({
    queryKey: ['client-site-notif-prefs', siteId],
    queryFn: async () => {
      const { data, error } = await supabase.rpc('get_client_site_notification_preferences', {
        _site_id: siteId,
      });
      if (error) throw error;
      return data as unknown as Prefs;
    },
    enabled: !!siteId,
  });

  useEffect(() => {
    if (data) {
      setLocal({
        notify_on_qr_scan: !!data.notify_on_qr_scan,
        notify_on_access_request: !!data.notify_on_access_request,
        notify_on_locked_section_attempt: !!data.notify_on_locked_section_attempt,
        notify_on_provider_interest: !!data.notify_on_provider_interest,
        auto_ignore_anonymous_visits: !!data.auto_ignore_anonymous_visits,
        auto_ignore_repeated_visits: !!data.auto_ignore_repeated_visits,
      });
      setDirty(false);
    }
  }, [data]);

  const saveMut = useMutation({
    mutationFn: async () => {
      const { error } = await supabase.rpc('update_client_site_notification_preferences', {
        _site_id: siteId,
        _patch: local as never,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success(isRTL ? 'تم حفظ التفضيلات' : 'Preferences saved');
      setDirty(false);
      refetch();
    },
    onError: (e: Error) => {
      toast.error(isRTL ? `تعذر الحفظ: ${e.message}` : `Save failed: ${e.message}`);
    },
  });

  const toggle = (k: keyof Prefs) => {
    setLocal((p) => ({ ...p, [k]: !p[k] }));
    setDirty(true);
  };

  const rows: Array<{ key: keyof Prefs; ar: string; en: string }> = [
    { key: 'notify_on_access_request', ar: 'تنبيه عند طلب وصول', en: 'Notify on access request' },
    { key: 'notify_on_provider_interest', ar: 'تنبيه عند اهتمام مزود', en: 'Notify on provider interest' },
    { key: 'notify_on_qr_scan', ar: 'تنبيه عند مسح رمز QR', en: 'Notify on QR scan' },
    { key: 'notify_on_locked_section_attempt', ar: 'تنبيه عند محاولة قسم محمي', en: 'Notify on locked section attempt' },
    { key: 'auto_ignore_anonymous_visits', ar: 'تجاهل الزيارات المجهولة تلقائياً', en: 'Auto-ignore anonymous visits' },
    { key: 'auto_ignore_repeated_visits', ar: 'تجاهل الزيارات المتكررة تلقائياً', en: 'Auto-ignore repeated visits' },
  ];

  if (isLoading) {
    return (
      <div className="p-3 rounded-lg border border-border/40 bg-background/60 flex items-center gap-2 text-[11px] text-muted-foreground">
        <Loader2 className="w-3.5 h-3.5 animate-spin" />
        {isRTL ? 'جارٍ تحميل تفضيلات التنبيهات…' : 'Loading notification preferences…'}
      </div>
    );
  }

  return (
    <section
      className="p-3 rounded-lg border border-border/40 bg-background/60 space-y-3"
      aria-labelledby="site-notif-prefs-heading"
    >
      <div className="flex items-center gap-2">
        <Bell className="w-4 h-4 text-primary" aria-hidden="true" />
        <h4 id="site-notif-prefs-heading" className="text-sm font-semibold">
          {isRTL ? 'تفضيلات تنبيهات الموقع' : 'Site notification preferences'}
        </h4>
      </div>
      <p className="text-[11px] text-muted-foreground leading-relaxed">
        {isRTL
          ? 'يمكنك التحكم في التنبيهات المرتبطة بزيارات الموقع وطلبات الوصول.'
          : 'You can control notifications related to site visits and access requests.'}
      </p>

      <ul className="space-y-2">
        {rows.map((r) => (
          <li key={r.key} className="flex items-center justify-between gap-3 py-1">
            <Label htmlFor={`csnp-${r.key}`} className="text-xs cursor-pointer flex-1">
              {isRTL ? r.ar : r.en}
            </Label>
            <Switch
              id={`csnp-${r.key}`}
              checked={local[r.key]}
              onCheckedChange={() => toggle(r.key)}
            />
          </li>
        ))}
      </ul>

      <div className="flex justify-end pt-1">
        <Button
          type="button"
          size="sm"
          variant="hero"
          className="h-8 gap-1.5 text-xs"
          disabled={!dirty || saveMut.isPending}
          onClick={() => saveMut.mutate()}
        >
          {saveMut.isPending ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Save className="w-3.5 h-3.5" />}
          {isRTL ? 'حفظ التفضيلات' : 'Save preferences'}
        </Button>
      </div>
    </section>
  );
};

export default ClientSiteNotificationPreferencesCard;