import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { Card, CardContent } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { CopyButton } from '@/components/ui/copy-button';
import { supabase } from '@/integrations/supabase/client';
import { useBi } from '@/components/common/Bilingual';
import { MapPin, Phone, ExternalLink } from 'lucide-react';

/**
 * Admin monitoring — inline sensitive viewer.
 * Auto-reveals address / phone / coordinates / map for the selected site
 * by calling the SECURITY DEFINER RPC `admin_get_client_site_sensitive_detail`
 * with a fixed audited reason. Each open is still written to the reveal log.
 */
interface SensitiveDetail {
  id: string;
  site_ref: string;
  address_line1: string | null;
  address_line2: string | null;
  city_name: string | null;
  district: string | null;
  contact_name: string | null;
  contact_phone: string | null;
  map_url: string | null;
  latitude: number | null;
  longitude: number | null;
  access_notes: string | null;
}

const AdminSiteSensitiveInline: React.FC<{ siteId: string }> = ({ siteId }) => {
  const bi = useBi();

  const q = useQuery({
    queryKey: ['admin-site-sensitive-inline', siteId],
    enabled: !!siteId,
    staleTime: 60_000,
    queryFn: async (): Promise<SensitiveDetail> => {
      const { data, error } = await supabase.rpc('admin_get_client_site_sensitive_detail', {
        _site_id: siteId,
        _reason: 'admin_monitoring_inline_view',
      });
      if (error) throw error;
      return data as unknown as SensitiveDetail;
    },
  });

  if (q.isLoading) return <Skeleton className="h-32 rounded-lg" />;
  if (q.error) {
    return (
      <Card className="border-destructive/40">
        <CardContent className="p-3 text-xs text-destructive">
          {bi('تعذّر تحميل البيانات الحساسة', 'Failed to load sensitive data')}: {(q.error as Error).message}
        </CardContent>
      </Card>
    );
  }
  const d = q.data;
  if (!d) return null;

  const mapsHref =
    d.map_url ||
    (d.latitude != null && d.longitude != null
      ? `https://www.google.com/maps?q=${d.latitude},${d.longitude}`
      : null);

  return (
    <section>
      <div className="mb-2 flex items-center gap-2">
        <h3 className="text-sm font-semibold">{bi('بيانات حساسة (مراقبة)', 'Sensitive (monitoring)')}</h3>
        <Badge variant="outline" className="text-[10px]">{bi('سُجِّل في سجل الكشف', 'Reveal logged')}</Badge>
      </div>
      <Card className="border-warning/40 bg-warning/5">
        <CardContent className="p-3 space-y-3 text-sm">
          <div className="space-y-1">
            <p className="text-xs text-muted-foreground">{bi('العنوان الكامل', 'Full address')}</p>
            <div className="flex items-start gap-2">
              <p className="tech-content flex-1">
                {d.address_line1 || '—'}
                {d.address_line2 ? ` · ${d.address_line2}` : ''}
              </p>
              {(d.address_line1 || d.address_line2) && (
                <CopyButton
                  value={[d.address_line1, d.address_line2].filter(Boolean).join(' · ')}
                  label={bi('العنوان', 'Address')}
                />
              )}
            </div>
            <p className="text-xs text-muted-foreground tech-content">
              {[d.city_name, d.district].filter(Boolean).join(' · ') || '—'}
            </p>
          </div>

          <div className="space-y-1">
            <p className="text-xs text-muted-foreground">{bi('جهة الاتصال', 'Contact')}</p>
            {d.contact_name && <p>{d.contact_name}</p>}
            {d.contact_phone ? (
              <div className="flex items-center gap-2 flex-wrap">
                <span className="tech-content">{d.contact_phone}</span>
                <CopyButton value={d.contact_phone} label={bi('هاتف', 'Phone')} />
                <Button asChild size="sm" variant="outline" className="h-7">
                  <a href={`tel:${d.contact_phone}`}><Phone className="h-3 w-3 me-1" />{bi('اتصال', 'Call')}</a>
                </Button>
                <Button asChild size="sm" variant="outline" className="h-7">
                  <a
                    href={`https://wa.me/${d.contact_phone.replace(/[^\d]/g, '')}`}
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    WhatsApp
                  </a>
                </Button>
              </div>
            ) : (
              <p className="text-xs text-muted-foreground">—</p>
            )}
          </div>

          <div className="space-y-1">
            <p className="text-xs text-muted-foreground">{bi('الإحداثيات والخريطة', 'Coordinates & map')}</p>
            {d.latitude != null && d.longitude != null ? (
              <div className="flex items-center gap-2 flex-wrap">
                <span className="tech-content" dir="ltr">{d.latitude}, {d.longitude}</span>
                <CopyButton value={`${d.latitude}, ${d.longitude}`} label={bi('إحداثيات', 'Coordinates')} />
              </div>
            ) : (
              <p className="text-xs text-muted-foreground">{bi('لا توجد إحداثيات', 'No coordinates')}</p>
            )}
            {mapsHref && (
              <Button asChild size="sm" variant="outline" className="h-7 mt-1">
                <a href={mapsHref} target="_blank" rel="noopener noreferrer">
                  <MapPin className="h-3 w-3 me-1" />
                  {bi('فتح الخريطة', 'Open map')}
                  <ExternalLink className="h-3 w-3 ms-1" />
                </a>
              </Button>
            )}
          </div>

          {d.access_notes && (
            <div className="space-y-1">
              <p className="text-xs text-muted-foreground">{bi('ملاحظات الوصول', 'Access notes')}</p>
              <p className="whitespace-pre-wrap text-xs">{d.access_notes}</p>
            </div>
          )}
        </CardContent>
      </Card>
    </section>
  );
};

export default AdminSiteSensitiveInline;