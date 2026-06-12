/**
 * Dedicated print-ready page for a single client_site barcode sticker.
 * Layout is A6-ish, optimized for printing on standard label paper.
 * Use the browser's "Save as PDF" from the print dialog to download.
 * All sensitive PII (full address, phone, coordinates) is intentionally omitted.
 */
import { useEffect, useMemo, useRef, useState } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import QRCode from 'qrcode';
import { Loader2, Printer, ArrowLeft, ShieldCheck, MapPin, Download } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useLanguage } from '@/i18n/LanguageContext';
import { useAuth } from '@/contexts/AuthContext';
import { useNoIndex } from '@/hooks/useNoIndex';
import { useEntityBarcode } from '@/lib/barcodes/useEntityBarcode';
import { buildBarcodeUrl } from '@/lib/barcodes/barcode-url';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';

interface SiteRow {
  id: string;
  label: string;
  site_ref: string | null;
  site_name: string | null;
  site_type: string;
  city_name: string | null;
  district: string | null;
}

export default function DashboardSitePrint() {
  useNoIndex();
  const { isRTL } = useLanguage();
  const { user } = useAuth();
  const navigate = useNavigate();
  const { id } = useParams<{ id: string }>();
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [qrReady, setQrReady] = useState(false);

  const { data: site, isLoading: siteLoading } = useQuery({
    queryKey: ['site-print', id],
    enabled: !!user && !!id,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('client_sites')
        .select('id, label, site_ref, site_name, site_type, city_name, district')
        .eq('id', id!)
        .maybeSingle();
      if (error) throw error;
      return data as SiteRow | null;
    },
  });

  const { data: code, isLoading: codeLoading } = useEntityBarcode('client_site', site?.id ?? null);
  const url = useMemo(() => (code ? buildBarcodeUrl(code) : ''), [code]);

  useEffect(() => {
    if (!canvasRef.current || !url) return;
    QRCode.toCanvas(canvasRef.current, url, {
      width: 320,
      margin: 1,
      errorCorrectionLevel: 'M',
      color: { dark: '#0f172a', light: '#ffffff' },
    })
      .then(() => setQrReady(true))
      .catch(() => setQrReady(false));
  }, [url]);

  const t = (ar: string, en: string) => (isRTL ? ar : en);

  if (siteLoading || codeLoading) {
    return (
      <div className="min-h-dvh flex items-center justify-center text-muted-foreground gap-2">
        <Loader2 className="w-4 h-4 animate-spin" />
        {t('جارٍ التحميل...', 'Loading...')}
      </div>
    );
  }

  if (!site || !code) {
    return (
      <div className="min-h-dvh flex flex-col items-center justify-center gap-3 p-6">
        <p className="text-sm text-muted-foreground">{t('الموقع أو الباركود غير متاح.', 'Site or barcode not available.')}</p>
        <Button variant="outline" size="sm" onClick={() => navigate('/dashboard/sites')}>
          <ArrowLeft className="w-4 h-4 me-1" />{t('عودة للمواقع', 'Back to Sites')}
        </Button>
      </div>
    );
  }

  return (
    <div className="min-h-dvh bg-muted/30" dir={isRTL ? 'rtl' : 'ltr'}>
      {/* Toolbar (hidden during print) */}
      <div className="print:hidden sticky top-0 z-10 bg-background/90 backdrop-blur border-b border-border/40">
        <div className="max-w-3xl mx-auto px-4 h-14 flex items-center justify-between gap-3">
          <div className="flex items-center gap-2 min-w-0">
            <Button variant="ghost" size="sm" onClick={() => navigate('/dashboard/sites')} className="h-8 text-xs">
              <ArrowLeft className="w-4 h-4 me-1" />{t('عودة', 'Back')}
            </Button>
            <div className="min-w-0">
              <p className="text-sm font-semibold truncate">{t('طباعة ملصق الباركود', 'Print Barcode Sticker')}</p>
              <p className="text-[11px] text-muted-foreground truncate">{site.label}</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" className="h-8 text-xs gap-1" onClick={() => window.print()}>
              <Download className="w-3.5 h-3.5" />{t('حفظ PDF', 'Save PDF')}
            </Button>
            <Button variant="hero" size="sm" className="h-8 text-xs gap-1" onClick={() => window.print()}>
              <Printer className="w-3.5 h-3.5" />{t('طباعة', 'Print')}
            </Button>
          </div>
        </div>
      </div>

      {/* Hint */}
      <p className="print:hidden max-w-3xl mx-auto px-4 pt-3 text-[11px] text-muted-foreground">
        {t('من نافذة الطباعة يمكنك اختيار "حفظ كملف PDF" لتحميل الملصق كـ PDF.', 'In the print dialog, choose "Save as PDF" to download the sticker.')}
      </p>

      {/* Sticker */}
      <div className="max-w-3xl mx-auto p-6 print:p-0">
        <div className="sticker mx-auto bg-white text-slate-900 rounded-3xl overflow-hidden shadow-xl print:shadow-none print:rounded-none">
          <div className="header bg-gradient-to-br from-slate-900 via-slate-800 to-emerald-900 text-white px-6 py-5">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-emerald-400 to-emerald-600 flex items-center justify-center text-white font-extrabold text-2xl shadow-lg">ق</div>
              <div>
                <p className="font-extrabold text-lg leading-none tracking-wide">{t('قِطاعات', 'Qitaat')}</p>
                <p className="text-[10px] uppercase tracking-[0.18em] text-slate-300 mt-1">{t('منصة القطاعات الصناعية', 'Industrial Sectors')}</p>
              </div>
            </div>
            <div className="mt-3 inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-emerald-500/20 border border-emerald-400/40 text-emerald-200 text-[10px] font-bold tracking-[0.16em] uppercase">
              <ShieldCheck className="w-3 h-3" />{t('موقع موثّق', 'Verified Site')}
            </div>
          </div>

          <div className="body px-6 py-6 text-center space-y-4">
            <p className="text-[10px] uppercase tracking-[0.2em] text-slate-500 font-bold">{t('امسح الكود لعرض الموقع', 'Scan to view site')}</p>

            <div className="inline-block p-3 bg-white rounded-2xl border border-slate-200">
              <canvas ref={canvasRef} className="block" />
              {!qrReady && <div className="w-[320px] h-[320px] flex items-center justify-center text-slate-400"><Loader2 className="w-5 h-5 animate-spin" /></div>}
            </div>

            <div className="space-y-1.5">
              <h2 className="font-bold text-base flex items-center justify-center gap-1.5">
                <MapPin className="w-4 h-4 text-emerald-600" />
                <span>{site.label}</span>
              </h2>
              {site.site_name && <p className="text-xs text-slate-600">{site.site_name}</p>}
              {(site.district || site.city_name) && (
                <p className="text-[11px] text-slate-500">{[site.district, site.city_name].filter(Boolean).join(' · ')}</p>
              )}
            </div>

            <div className="pt-3 border-t border-dashed border-slate-200 space-y-1.5">
              <p className="text-[10px] uppercase tracking-[0.18em] text-slate-500 font-bold">{t('كود التحقق', 'Verification Code')}</p>
              <p className="font-mono text-base font-bold tracking-wider" dir="ltr">{code}</p>
              {site.site_ref && (
                <p className="text-[10px] text-slate-500 font-mono" dir="ltr">{site.site_ref}</p>
              )}
              <p className="text-[10px] text-slate-400 font-mono break-all px-2" dir="ltr">{url}</p>
            </div>
          </div>

          <div className="footer bg-slate-50 px-6 py-3 text-center border-t border-slate-200">
            <p className="text-[10px] text-slate-500 leading-relaxed">
              {t('وجّه كاميرا هاتفك نحو الرمز لعرض بيانات الموقع والعقود المرتبطة به.', 'Point your phone camera at the code to view site details and linked contracts.')}
            </p>
          </div>
        </div>

        <div className="print:hidden text-center mt-6">
          <Link to={`/dashboard/sites?focus=${encodeURIComponent(site.site_ref ?? site.id)}`} className="text-xs text-primary hover:underline">
            {t('فتح بطاقة الموقع في لوحة التحكم', 'Open site card in dashboard')}
          </Link>
        </div>
      </div>

      {/* Print styles */}
      <style>{`
        .sticker { width: 420px; max-width: 100%; }
        @media print {
          @page { size: A6 portrait; margin: 8mm; }
          html, body { background: #fff !important; }
          .sticker { width: 100% !important; box-shadow: none !important; }
        }
      `}</style>
    </div>
  );
}