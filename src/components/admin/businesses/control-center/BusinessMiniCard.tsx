import React, { useCallback } from 'react';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { ShieldCheck, ExternalLink, Copy, Edit3, Building2 } from 'lucide-react';
import { pickBi } from '@/components/common/Bilingual';
import { toast } from 'sonner';
import {
  getBusinessProfileHref,
  getBusinessProfileUrl,
} from '@/lib/business/profileHref';
import type { BusinessMetricsRow } from '@/modules/admin/businesses/businessAdminMetrics';

export interface BusinessMiniCardProps {
  business: BusinessMetricsRow & {
    name_ar?: string | null;
    name_en?: string | null;
    ref_id?: string | null;
    logo_url?: string | null;
  };
  isRTL: boolean;
  /** Reason chips (already localized). */
  reasons?: ReadonlyArray<string>;
  /** Optional tone for the reason chips. */
  reasonTone?: 'warning' | 'destructive' | 'muted';
  /** Jump to the businesses tab and focus this row in the table. */
  onJumpToBusiness?: (b: BusinessMetricsRow) => void;
}

const toneClass: Record<NonNullable<BusinessMiniCardProps['reasonTone']>, string> = {
  warning: 'border-warning/40 text-warning-foreground bg-warning/10',
  destructive: 'border-destructive/40 text-destructive bg-destructive/10',
  muted: 'border-border/60 text-muted-foreground bg-muted/60',
};

export const BusinessMiniCard: React.FC<BusinessMiniCardProps> = ({
  business,
  isRTL,
  reasons,
  reasonTone = 'warning',
  onJumpToBusiness,
}) => {
  const name = pickBi(isRTL, business.name_ar || business.name_en || '—', business.name_en || business.name_ar || '—');
  const href = getBusinessProfileHref(business);
  const url = getBusinessProfileUrl(business);

  const copyLink = useCallback(async () => {
    if (!url) return;
    try {
      await navigator.clipboard.writeText(url);
      toast.success(pickBi(isRTL, 'تم نسخ الرابط', 'Link copied'));
    } catch {
      toast.error(pickBi(isRTL, 'تعذّر النسخ', 'Could not copy'));
    }
  }, [url, isRTL]);

  return (
    <Card
      className="rounded-2xl border-border/60 bg-card/80 p-3 flex items-start gap-3"
      data-testid="business-mini-card"
    >
      <Avatar className="h-10 w-10 rounded-xl">
        {business.logo_url ? (
          <AvatarImage src={business.logo_url} alt={name} />
        ) : null}
        <AvatarFallback className="rounded-xl bg-muted">
          <Building2 className="h-4 w-4 text-muted-foreground" />
        </AvatarFallback>
      </Avatar>

      <div className="min-w-0 flex-1 space-y-1.5">
        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-sm font-medium truncate">{name}</span>
          {business.is_verified ? (
            <span className="inline-flex items-center gap-0.5 text-emerald-600 text-[10px]">
              <ShieldCheck className="h-3 w-3" aria-hidden />
            </span>
          ) : null}
          {business.is_demo ? (
            <Badge variant="outline" className="text-[10px] h-4 px-1.5">
              {pickBi(isRTL, 'تجريبي', 'Demo')}
            </Badge>
          ) : null}
        </div>

        <div className="flex items-center gap-2 text-[11px] text-muted-foreground tech-content">
          {business.ref_id ? <span>{business.ref_id}</span> : null}
          {business.username ? <span>· @{business.username}</span> : null}
        </div>

        {reasons && reasons.length > 0 ? (
          <div className="flex flex-wrap gap-1 pt-0.5">
            {reasons.map((r) => (
              <span
                key={r}
                className={`inline-flex items-center text-[10px] px-1.5 py-0.5 rounded-md border ${toneClass[reasonTone]}`}
              >
                {r}
              </span>
            ))}
          </div>
        ) : null}
      </div>

      <div className="flex flex-col gap-1">
        {onJumpToBusiness ? (
          <Button
            size="sm"
            variant="ghost"
            className="h-7 px-2 text-[11px] gap-1"
            onClick={() => onJumpToBusiness(business)}
            aria-label={pickBi(isRTL, 'تعديل', 'Edit')}
          >
            <Edit3 className="h-3.5 w-3.5" />
            {pickBi(isRTL, 'تعديل', 'Edit')}
          </Button>
        ) : null}
        {href ? (
          <a
            href={href}
            target="_blank"
            rel="noreferrer"
            className="inline-flex items-center gap-1 text-[11px] text-muted-foreground hover:text-foreground px-2 h-7"
          >
            <ExternalLink className="h-3.5 w-3.5" />
            {pickBi(isRTL, 'عام', 'Public')}
          </a>
        ) : null}
        {url ? (
          <button
            type="button"
            onClick={copyLink}
            className="inline-flex items-center gap-1 text-[11px] text-muted-foreground hover:text-foreground px-2 h-7"
          >
            <Copy className="h-3.5 w-3.5" />
            {pickBi(isRTL, 'نسخ', 'Copy')}
          </button>
        ) : null}
      </div>
    </Card>
  );
};

export default BusinessMiniCard;