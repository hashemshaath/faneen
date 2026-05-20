/**
 * Phase 3 — Unified barcode resolver at /q/:barcode_code.
 *
 * Hard rules (mirror /s/:token):
 *  - anon-callable RPC; no address / phone / map / coords / token / hash ever rendered.
 *  - never reveals whether the code exists, is private, frozen, revoked, or archived.
 *  - noindex; not in sitemap; robots disallows /q/.
 */
import React, { useEffect } from 'react';
import { useParams, Link, Navigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { AlertCircle, Building2, ExternalLink, FileCheck2, Loader2, MapPin, ShieldCheck } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useBi } from '@/components/common/Bilingual';
import { useLanguage } from '@/i18n/LanguageContext';
import { useNoIndex } from '@/hooks/useNoIndex';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { CopyButton } from '@/components/ui/copy-button';
import { BrandLogo } from '@/components/common/BrandLogo';

type ResolveResult =
  | { status: 'unavailable' }
  | {
      status: 'available';
      barcode_code: string;
      entity_type: 'client_site' | 'contract' | 'business';
      visibility: string;
      title: string | null;
      subtitle: string | null;
      data: Record<string, unknown>;
    };

const PublicBarcodeResolve: React.FC = () => {
  useNoIndex();
  const bi = useBi();
  const { language } = useLanguage();
  const isRTL = language === 'ar';
  const { barcode_code: rawCode } = useParams<{ barcode_code: string }>();
  const code = (rawCode ?? '').trim();

  const { data, isLoading } = useQuery({
    queryKey: ['resolve-barcode', code],
    enabled: code.length >= 4,
    retry: false,
    queryFn: async (): Promise<ResolveResult> => {
      const { data, error } = await supabase.rpc('resolve_barcode', { _code: code });
      if (error) throw error;
      return (data as unknown as ResolveResult) ?? { status: 'unavailable' };
    },
  });

  useEffect(() => {
    const prev = document.title;
    document.title = bi('كود — قِطاعات', 'Code — Qitaat');
    return () => { document.title = prev; };
  }, [bi]);

  const unavailable = !isLoading && (!data || data.status !== 'available');

  return (
    <div className="min-h-screen bg-background" dir={isRTL ? 'rtl' : 'ltr'}>
      <header className="border-b border-border/40 bg-background/80 backdrop-blur sticky top-0 z-10">
        <div className="max-w-2xl mx-auto px-4 h-14 flex items-center justify-between gap-3">
          <Link to="/" className="flex items-center gap-2 hover-lift">
            <BrandLogo size={28} />
          </Link>
          <Badge variant="outline" size="sm" className="text-[10px]">
            <ShieldCheck className="w-3 h-3 me-1" />
            {bi('كود قِطاعات', 'Qitaat code')}
          </Badge>
        </div>
      </header>

      <main className="max-w-2xl mx-auto px-4 py-6 space-y-4">
        {isLoading && (
          <div className="flex items-center justify-center gap-2 py-12 text-muted-foreground">
            <Loader2 className="w-4 h-4 animate-spin" />
            <span className="text-sm">{bi('جارٍ التحميل…', 'Loading…')}</span>
          </div>
        )}

        {unavailable && !isLoading && (
          <section className="p-6 rounded-xl border border-border/40 bg-muted/20 text-center space-y-3">
            <AlertCircle className="w-8 h-8 text-muted-foreground mx-auto" />
            <h1 className="text-base font-semibold">
              {bi('الكود غير متاح', 'Code unavailable')}
            </h1>
            <p className="text-xs text-muted-foreground leading-relaxed">
              {bi('الكود غير متاح أو تم إيقافه.', 'This code is unavailable or has been disabled.')}
            </p>
            <Button asChild variant="outline" size="sm" className="h-9 text-xs">
              <Link to="/">{bi('العودة للرئيسية', 'Back to home')}</Link>
            </Button>
          </section>
        )}

        {data && data.status === 'available' && (
          <ResolvedCard data={data} isRTL={isRTL} />
        )}
      </main>
    </div>
  );
};

interface ResolvedCardProps {
  data: Extract<ResolveResult, { status: 'available' }>;
  isRTL: boolean;
}

const ResolvedCard: React.FC<ResolvedCardProps> = ({ data, isRTL }) => {
  const bi = useBi();

  const codeChip = (
    <div className="flex items-center gap-2 flex-wrap">
      <Badge variant="outline" size="sm" className="tech-content text-[11px]" dir="ltr">
        {data.barcode_code}
      </Badge>
      <CopyButton value={data.barcode_code} label={bi('الكود', 'Code')} />
    </div>
  );

  if (data.entity_type === 'client_site') {
    return (
      <section className="p-5 rounded-xl border border-border/40 bg-card space-y-3">
        <div className="flex items-center gap-2">
          <MapPin className="w-4 h-4 text-primary" />
          <h1 className="text-base font-semibold truncate">
            {data.title || bi('موقع', 'Site')}
          </h1>
        </div>
        <p className="text-[11px] text-muted-foreground uppercase tracking-wide">
          {bi('كود المشروع', 'Project code')}
        </p>
        {codeChip}
        {data.subtitle && (
          <p className="text-xs text-muted-foreground">{data.subtitle}</p>
        )}
        <p className="text-[11px] text-muted-foreground bg-info/5 border border-info/20 rounded-md p-2 leading-relaxed">
          {bi(
            'لا تظهر تفاصيل الموقع إلا بعد موافقة صاحب الموقع.',
            'Site details are only shown after the site owner approves access.',
          )}
        </p>
      </section>
    );
  }

  if (data.entity_type === 'contract') {
    const cstatus = String((data.data as { contract_status?: string }).contract_status ?? '');
    const provider = (data.data as { provider_name?: string | null; provider_username?: string | null });
    return (
      <section className="p-5 rounded-xl border border-border/40 bg-card space-y-3">
        <div className="flex items-center gap-2">
          <FileCheck2 className="w-4 h-4 text-primary" />
          <h1 className="text-base font-semibold truncate">
            {data.title || bi('عقد', 'Contract')}
          </h1>
        </div>
        <p className="text-[11px] text-muted-foreground uppercase tracking-wide">
          {bi('كود العقد', 'Contract code')}
        </p>
        {codeChip}
        <div className="flex items-center gap-2 text-xs flex-wrap">
          <span className="text-muted-foreground">{bi('الحالة', 'Status')}:</span>
          <Badge variant="outline" size="sm" className="text-[10px]">{cstatus || '—'}</Badge>
        </div>
        {provider.provider_name && (
          <div className="text-xs flex items-center gap-2">
            <Building2 className="w-3.5 h-3.5 text-muted-foreground" />
            <span className="text-muted-foreground">{bi('المزوّد', 'Provider')}:</span>
            {provider.provider_username ? (
              <Link to={`/${provider.provider_username}`} className="text-primary hover:underline">
                {provider.provider_name}
              </Link>
            ) : (
              <span>{provider.provider_name}</span>
            )}
          </div>
        )}
        <p className="text-[11px] text-muted-foreground bg-info/5 border border-info/20 rounded-md p-2 leading-relaxed">
          {bi(
            'هذه صفحة تحقق عامة لا تعرض بنود أو أسعار العقد.',
            'This is a public verification page. Contract terms and pricing are not shown.',
          )}
        </p>
      </section>
    );
  }

  if (data.entity_type === 'business') {
    const biz = data.data as { username?: string | null; public_profile_path?: string | null; approved?: boolean };
    // Show explicit redirect card (avoid surprise navigation in QA)
    return (
      <section className="p-5 rounded-xl border border-border/40 bg-card space-y-3">
        <div className="flex items-center gap-2">
          <Building2 className="w-4 h-4 text-primary" />
          <h1 className="text-base font-semibold truncate">
            {data.title || bi('منشأة', 'Business')}
          </h1>
        </div>
        <p className="text-[11px] text-muted-foreground uppercase tracking-wide">
          {bi('كود المنشأة', 'Business code')}
        </p>
        {codeChip}
        {biz.username && (
          <p className="text-xs text-muted-foreground tech-content" dir="ltr">@{biz.username}</p>
        )}
        {biz.approved && biz.public_profile_path ? (
          <Button asChild variant="hero" size="sm" className="h-10 w-full text-xs gap-1.5">
            <Link to={biz.public_profile_path}>
              <ExternalLink className="w-3.5 h-3.5" />
              {bi('فتح الملف العام', 'Open public profile')}
            </Link>
          </Button>
        ) : (
          <p className="text-[11px] text-muted-foreground bg-muted/30 border border-border/40 rounded-md p-2">
            {bi('الملف العام غير متاح حالياً.', 'Public profile is currently unavailable.')}
          </p>
        )}
      </section>
    );
  }

  // Defensive fallback (should never hit — RPC returns 'unavailable' for other types)
  return <Navigate to="/" replace />;
};

export default PublicBarcodeResolve;