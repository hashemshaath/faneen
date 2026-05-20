import React from 'react';
import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { CopyButton } from '@/components/ui/copy-button';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Building2, ExternalLink, FileText, Globe, IdCard, User,
} from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';

type Bi = (ar: string, en: string) => string;

interface BusinessLite {
  id: string;
  ref_id: string | null;
  username: string | null;
  name_ar: string | null;
  name_en: string | null;
  logo_url: string | null;
  website: string | null;
}

interface Props {
  businessId: string | null;
  fallbackNameAr: string | null;
  fallbackNameEn: string | null;
  contractsTotal: number;
  contractsActive: number;
  bi: Bi;
  isRTL: boolean;
}

/**
 * Admin-side client business header card. Shows logo + name + ref + quick
 * navigation to the public business profile and the contracts list.
 * Renders nothing risky by default — only the same public-safe fields
 * (logo_url, username, names, ref_id, website). Owner contact PII still
 * lives behind the audited sensitive-reveal panel.
 */
const AdminClientBusinessCard: React.FC<Props> = ({
  businessId, fallbackNameAr, fallbackNameEn, contractsTotal, contractsActive,
  bi, isRTL,
}) => {
  const q = useQuery({
    queryKey: ['admin-client-business-lite', businessId],
    enabled: !!businessId,
    staleTime: 5 * 60_000,
    queryFn: async (): Promise<BusinessLite | null> => {
      if (!businessId) return null;
      const { data, error } = await supabase
        .from('businesses')
        .select('id, ref_id, username, name_ar, name_en, logo_url, website')
        .eq('id', businessId)
        .maybeSingle();
      if (error) throw error;
      return (data as BusinessLite | null) ?? null;
    },
  });

  // No business linked → render a soft placeholder (individual client).
  if (!businessId) {
    return (
      <div className="rounded-xl border bg-muted/20 p-4 flex items-center gap-3">
        <div className="h-12 w-12 rounded-xl bg-muted flex items-center justify-center text-muted-foreground shrink-0">
          <User className="h-5 w-5" aria-hidden />
        </div>
        <div className="min-w-0 flex-1">
          <p className="text-[10px] uppercase tracking-wide text-muted-foreground font-medium">
            {bi('العميل', 'Client')}
          </p>
          <p className="font-semibold truncate">
            {isRTL
              ? (fallbackNameAr || fallbackNameEn || bi('عميل فردي', 'Individual client'))
              : (fallbackNameEn || fallbackNameAr || bi('عميل فردي', 'Individual client'))}
          </p>
          <p className="text-xs text-muted-foreground">
            {bi('غير مرتبط بحساب أعمال', 'Not linked to a business account')}
          </p>
        </div>
      </div>
    );
  }

  if (q.isLoading) {
    return <Skeleton className="h-24 rounded-xl" />;
  }

  const b = q.data;
  const displayName = isRTL
    ? (b?.name_ar || b?.name_en || fallbackNameAr || fallbackNameEn)
    : (b?.name_en || b?.name_ar || fallbackNameEn || fallbackNameAr);
  const initials = (displayName ?? '?').trim().slice(0, 2).toUpperCase();
  const profileHref = b?.username ? `/${b.username}` : null;

  return (
    <div className="rounded-xl border bg-gradient-to-br from-primary/5 via-background to-background p-4">
      <div className="flex items-start gap-3 flex-wrap">
        <Avatar className="h-14 w-14 rounded-xl border bg-background shrink-0">
          {b?.logo_url && <AvatarImage src={b.logo_url} alt={displayName ?? ''} className="object-contain" />}
          <AvatarFallback className="rounded-xl bg-primary/10 text-primary font-semibold">
            {b?.logo_url ? initials : <Building2 className="h-6 w-6" aria-hidden />}
          </AvatarFallback>
        </Avatar>

        <div className="min-w-0 flex-1">
          <p className="text-[10px] uppercase tracking-wide text-muted-foreground font-medium">
            {bi('شركة العميل', 'Client business')}
          </p>
          <h4 className="font-bold text-base truncate">{displayName ?? bi('غير معروف', 'Unknown')}</h4>

          <div className="mt-1.5 flex items-center gap-1.5 flex-wrap text-xs">
            {b?.ref_id && (
              <span className="inline-flex items-center gap-1 font-mono tech-content px-1.5 py-0.5 rounded bg-muted">
                <IdCard className="h-3 w-3 opacity-70" aria-hidden />
                {b.ref_id}
                <CopyButton value={b.ref_id} label={bi('معرّف الأعمال', 'Business ref')} />
              </span>
            )}
            {b?.username && (
              <Badge variant="outline" className="text-[10px] tech-content">@{b.username}</Badge>
            )}
            <Badge variant="secondary" className="text-[10px] gap-1">
              <FileText className="h-3 w-3" aria-hidden />
              {contractsTotal} {bi('عقد', 'contracts')}
              {contractsActive > 0 && (
                <span className="text-success font-medium ms-1">· {contractsActive} {bi('نشط', 'active')}</span>
              )}
            </Badge>
          </div>
        </div>

        <div className="flex items-center gap-2 ms-auto flex-wrap">
          {profileHref && (
            <Button asChild variant="outline" size="sm" className="h-8">
              <Link to={profileHref} target="_blank" rel="noopener noreferrer" aria-label={bi('فتح الملف العام', 'Open public profile')}>
                <ExternalLink className="h-3.5 w-3.5 me-1.5" aria-hidden />
                {bi('الملف العام', 'Profile')}
              </Link>
            </Button>
          )}
          {b?.website && (
            <Button asChild variant="ghost" size="sm" className="h-8">
              <a href={b.website} target="_blank" rel="noopener noreferrer" aria-label={bi('الموقع', 'Website')}>
                <Globe className="h-3.5 w-3.5 me-1.5" aria-hidden />
                {bi('الموقع', 'Website')}
              </a>
            </Button>
          )}
          <Button asChild variant="ghost" size="sm" className="h-8">
            <Link to="/contracts" aria-label={bi('عرض العقود', 'View contracts')}>
              <FileText className="h-3.5 w-3.5 me-1.5" aria-hidden />
              {bi('عقود', 'Contracts')}
            </Link>
          </Button>
        </div>
      </div>
    </div>
  );
};

export default AdminClientBusinessCard;