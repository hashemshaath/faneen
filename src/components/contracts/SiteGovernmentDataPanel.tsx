/**
 * Shows the government / legal data of the selected client_site
 * (municipal license, title deed, owner, plan numbers) as a read-only
 * card inside the contract create/edit flow. The data is owned by the
 * site itself — when the contract is linked to the site via
 * `execution_site_id`, this metadata is automatically associated and
 * exposed to all downstream artifacts (PDF, work orders, invoices).
 */
import { useQuery } from '@tanstack/react-query';
import { Landmark, ScrollText, FileText, AlertCircle, Loader2, ExternalLink } from 'lucide-react';
import { Link } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';

interface SiteGov {
  id: string;
  site_ref: string | null;
  municipal_license_no: string | null;
  municipal_license_issue_date: string | null;
  municipal_license_expiry_date: string | null;
  title_deed_no: string | null;
  title_deed_date: string | null;
  owner_name: string | null;
  owner_id_number: string | null;
  land_use_type: string | null;
  plot_number: string | null;
  block_number: string | null;
  plan_number: string | null;
}

export function SiteGovernmentDataPanel({ siteId, isRTL }: { siteId: string; isRTL: boolean }) {
  const { data, isLoading } = useQuery({
    queryKey: ['site-gov-data', siteId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('client_sites')
        .select('id, site_ref, municipal_license_no, municipal_license_issue_date, municipal_license_expiry_date, title_deed_no, title_deed_date, owner_name, owner_id_number, land_use_type, plot_number, block_number, plan_number')
        .eq('id', siteId)
        .maybeSingle();
      if (error) throw error;
      return data as SiteGov | null;
    },
    enabled: !!siteId,
    staleTime: 60_000,
  });

  if (isLoading) {
    return (
      <div className="mt-3 rounded-xl border border-border/40 bg-card/40 p-3 flex items-center gap-2 text-xs text-muted-foreground">
        <Loader2 className="w-3.5 h-3.5 animate-spin" />
        {isRTL ? 'جاري تحميل بيانات الموقع الحكومية...' : 'Loading site government data...'}
      </div>
    );
  }
  if (!data) return null;

  const hasAny = !!(
    data.municipal_license_no || data.title_deed_no || data.owner_name ||
    data.owner_id_number || data.land_use_type || data.plot_number ||
    data.block_number || data.plan_number
  );

  const today = new Date().toISOString().slice(0, 10);
  const expired = !!data.municipal_license_expiry_date && data.municipal_license_expiry_date < today;

  if (!hasAny) {
    return (
      <div className="mt-3 rounded-xl border border-dashed border-border/50 bg-card/30 p-3 flex items-start gap-2">
        <AlertCircle className="w-4 h-4 text-muted-foreground shrink-0 mt-0.5" />
        <div className="flex-1 text-[11px] text-muted-foreground leading-relaxed">
          {isRTL
            ? 'لا توجد بيانات حكومية مسجلة لهذا الموقع (رخصة بلدية، صك، مالك). '
            : 'No government data registered for this site (license, deed, owner). '}
          {data.site_ref && (
            <Link to={`/dashboard/sites?focus=${encodeURIComponent(data.site_ref)}`} className="text-primary hover:underline inline-flex items-center gap-0.5">
              {isRTL ? 'إضافتها الآن' : 'Add now'}<ExternalLink className="w-2.5 h-2.5" />
            </Link>
          )}
        </div>
      </div>
    );
  }

  const Row = ({ label, value, mono = false }: { label: string; value: string | null; mono?: boolean }) => {
    if (!value) return null;
    return (
      <div className="flex items-baseline justify-between gap-2 py-1 border-b border-border/30 last:border-0">
        <span className="text-[10px] text-muted-foreground">{label}</span>
        <span className={`text-xs font-medium ${mono ? 'tech-content' : ''}`} dir={mono ? 'ltr' : 'auto'}>{value}</span>
      </div>
    );
  };

  return (
    <div className="mt-3 rounded-xl border border-primary/20 bg-gradient-to-br from-primary/5 to-transparent p-3 space-y-3">
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-1.5 text-xs font-bold text-primary">
          <Landmark className="w-3.5 h-3.5" />
          {isRTL ? 'بيانات الموقع الحكومية (مرفقة تلقائياً)' : 'Site Government Data (auto-attached)'}
        </div>
        {expired && (
          <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-destructive/15 text-destructive font-bold">
            {isRTL ? 'الرخصة منتهية' : 'License expired'}
          </span>
        )}
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <div className="rounded-lg bg-background/60 border border-border/40 p-2.5 space-y-0.5">
          <div className="flex items-center gap-1 text-[10px] font-bold text-muted-foreground uppercase tracking-wide">
            <ScrollText className="w-3 h-3" />{isRTL ? 'رخصة البلدية' : 'Municipal License'}
          </div>
          <Row label={isRTL ? 'رقم الرخصة' : 'License No.'} value={data.municipal_license_no} mono />
          <Row label={isRTL ? 'الإصدار' : 'Issued'} value={data.municipal_license_issue_date} mono />
          <Row label={isRTL ? 'الانتهاء' : 'Expires'} value={data.municipal_license_expiry_date} mono />
        </div>

        <div className="rounded-lg bg-background/60 border border-border/40 p-2.5 space-y-0.5">
          <div className="flex items-center gap-1 text-[10px] font-bold text-muted-foreground uppercase tracking-wide">
            <FileText className="w-3 h-3" />{isRTL ? 'الصك والمالك' : 'Deed & Owner'}
          </div>
          <Row label={isRTL ? 'رقم الصك' : 'Deed No.'} value={data.title_deed_no} mono />
          <Row label={isRTL ? 'تاريخ الصك' : 'Deed Date'} value={data.title_deed_date} mono />
          <Row label={isRTL ? 'المالك' : 'Owner'} value={data.owner_name} />
          <Row label={isRTL ? 'هوية المالك' : 'Owner ID'} value={data.owner_id_number} mono />
        </div>

        <div className="rounded-lg bg-background/60 border border-border/40 p-2.5 space-y-0.5">
          <div className="flex items-center gap-1 text-[10px] font-bold text-muted-foreground uppercase tracking-wide">
            <Landmark className="w-3 h-3" />{isRTL ? 'المخطط والاستخدام' : 'Plan & Use'}
          </div>
          <Row label={isRTL ? 'نوع الاستخدام' : 'Land Use'} value={data.land_use_type} />
          <Row label={isRTL ? 'القطعة' : 'Plot'} value={data.plot_number} mono />
          <Row label={isRTL ? 'البلوك' : 'Block'} value={data.block_number} mono />
          <Row label={isRTL ? 'المخطط' : 'Plan'} value={data.plan_number} mono />
        </div>
      </div>

      <p className="text-[10px] text-muted-foreground leading-relaxed">
        {isRTL
          ? 'هذه البيانات مرتبطة بالموقع المحدد وستظهر تلقائياً في تفاصيل العقد والملف الموثّق دون الحاجة لإعادة إدخالها.'
          : 'This data is linked to the selected site and will appear automatically in the contract details and signed PDF — no need to re-enter.'}
      </p>
    </div>
  );
}

export default SiteGovernmentDataPanel;