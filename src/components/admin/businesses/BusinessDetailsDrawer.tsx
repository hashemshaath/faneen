import React from 'react';
import { Link } from 'react-router-dom';
import {
  Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription,
} from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import {
  Phone, Mail, Globe, MapPin, ExternalLink, Edit, Package,
  Star, FileText,
} from 'lucide-react';
import { pickBi } from '@/components/common/Bilingual';
import { BusinessStatusBadge } from './BusinessStatusBadge';
import { TIERS } from '@/pages/admin/businesses/_shared';

/**
 * BusinessDetailsDrawer — read-only side panel for quick admin preview.
 *
 * Renders ONLY non-sensitive, already-loaded columns from the safe
 * select. NEVER queries Supabase, NEVER reads sensitive fields
 * (cr_scan_*, cr_document_url, national_id, approval_notes,
 * cr_owner_name). For full sensitive-field access, callers must go
 * through the dedicated sensitive-fields panel + RPCs.
 *
 * No publish / approval / verification mutations — pure preview.
 */
export interface BusinessDrawerRow {
  id: string;
  ref_id: string;
  username: string;
  name_ar: string;
  name_en?: string | null;
  membership_tier?: string | null;
  is_active?: boolean | null;
  is_verified?: boolean | null;
  approval_status?: string | null;
  phone?: string | null;
  email?: string | null;
  website?: string | null;
  address?: string | null;
  logo_url?: string | null;
  rating_avg?: number | null;
  rating_count?: number | null;
  short_description_ar?: string | null;
  short_description_en?: string | null;
  created_at?: string | null;
}

interface BusinessDetailsDrawerProps {
  business: BusinessDrawerRow | null;
  isRTL: boolean;
  hasContracts: boolean;
  onClose: () => void;
  onEdit: (b: BusinessDrawerRow) => void;
  onOpenServices: (id: string) => void;
}

const InfoRow: React.FC<{ icon: React.ElementType; label: string; value?: React.ReactNode }> = ({
  icon: Icon, label, value,
}) => {
  if (!value) return null;
  return (
    <div className="flex items-start gap-3 py-2 border-b border-border/40 last:border-0">
      <Icon className="w-4 h-4 mt-0.5 text-muted-foreground shrink-0" />
      <div className="min-w-0 flex-1">
        <p className="text-[10px] uppercase tracking-wider text-muted-foreground">{label}</p>
        <div className="text-sm font-medium break-words tech-content">{value}</div>
      </div>
    </div>
  );
};

export const BusinessDetailsDrawer: React.FC<BusinessDetailsDrawerProps> = ({
  business, isRTL, hasContracts, onClose, onEdit, onOpenServices,
}) => {
  const open = !!business;
  const b = business;
  const tier = b ? TIERS.find((t) => t.value === b.membership_tier) : undefined;
  return (
    <Sheet open={open} onOpenChange={(o) => { if (!o) onClose(); }}>
      <SheetContent
        side={isRTL ? 'left' : 'right'}
        className="w-full sm:max-w-md overflow-y-auto"
      >
        {b && (
          <>
            <SheetHeader className="space-y-3 text-start">
              <div className="flex items-center gap-3">
                <Avatar className="h-14 w-14 rounded-2xl">
                  <AvatarImage src={b.logo_url || undefined} alt={b.name_ar} />
                  <AvatarFallback className="rounded-2xl bg-muted">
                    {(b.name_ar || b.name_en || '?').charAt(0)}
                  </AvatarFallback>
                </Avatar>
                <div className="min-w-0 flex-1">
                  <SheetTitle className="text-base font-heading truncate">
                    {pickBi(isRTL, b.name_ar, b.name_en || b.name_ar)}
                  </SheetTitle>
                  <SheetDescription className="text-[11px] font-mono tech-content truncate">
                    {b.ref_id} · @{b.username}
                  </SheetDescription>
                </div>
              </div>
              <div className="flex flex-wrap items-center gap-1.5">
                <BusinessStatusBadge business={b} isRTL={isRTL} />
                {tier && (
                  <span className={`inline-flex items-center gap-1 rounded-full px-2.5 h-6 text-[11px] font-semibold ${tier.color}`}>
                    <span aria-hidden>{tier.icon}</span>
                    {pickBi(isRTL, tier.label_ar, tier.label_en)}
                  </span>
                )}
                {hasContracts && (
                  <span className="inline-flex items-center gap-1 rounded-full px-2.5 h-6 text-[11px] font-semibold bg-accent/15 text-accent-foreground">
                    <FileText className="w-3 h-3" />
                    {pickBi(isRTL, 'بعقود', 'Has contracts')}
                  </span>
                )}
              </div>
            </SheetHeader>

            {(b.short_description_ar || b.short_description_en) && (
              <p className="mt-4 text-sm text-muted-foreground leading-relaxed">
                {pickBi(isRTL, b.short_description_ar || '', b.short_description_en || b.short_description_ar || '')}
              </p>
            )}

            <div className="mt-4">
              <InfoRow icon={Phone} label={pickBi(isRTL, 'الهاتف', 'Phone')} value={b.phone} />
              <InfoRow icon={Mail} label={pickBi(isRTL, 'البريد', 'Email')} value={b.email} />
              <InfoRow icon={Globe} label={pickBi(isRTL, 'الموقع', 'Website')} value={b.website} />
              <InfoRow icon={MapPin} label={pickBi(isRTL, 'العنوان', 'Address')} value={b.address} />
              <InfoRow
                icon={Star}
                label={pickBi(isRTL, 'التقييم', 'Rating')}
                value={
                  b.rating_avg != null
                    ? `${b.rating_avg.toFixed(1)} (${b.rating_count ?? 0})`
                    : undefined
                }
              />
            </div>

            <div className="mt-6 flex flex-wrap gap-2">
              <Button size="sm" variant="default" className="gap-1.5 rounded-xl" onClick={() => onEdit(b)}>
                <Edit className="w-3.5 h-3.5" />
                {pickBi(isRTL, 'تعديل', 'Edit')}
              </Button>
              <Button size="sm" variant="outline" className="gap-1.5 rounded-xl" onClick={() => onOpenServices(b.id)}>
                <Package className="w-3.5 h-3.5" />
                {pickBi(isRTL, 'الخدمات', 'Services')}
              </Button>
              <Button asChild size="sm" variant="outline" className="gap-1.5 rounded-xl">
                <Link to={`/@${b.username}`} target="_blank" rel="noreferrer">
                  <ExternalLink className="w-3.5 h-3.5" />
                  {pickBi(isRTL, 'الملف العام', 'Public profile')}
                </Link>
              </Button>
            </div>
          </>
        )}
      </SheetContent>
    </Sheet>
  );
};

export default BusinessDetailsDrawer;