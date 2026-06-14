import React from 'react';
import { Link } from 'react-router-dom';
import { X, Globe2, MapPin, Calendar, Building2, Tag as TagIcon, ExternalLink } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  DirectoryStatusBadge,
  VerificationStatusBadge,
} from '@/components/admin/content';
import type { AdminStatusTone } from '@/components/admin/AdminStatusBadge';

/**
 * BrandDetailsDrawer — read-only side panel that surfaces the most
 * important facts about a brand row, without leaving the list.
 *
 * Not a Dialog/Modal. Renders as a fixed slide-in panel on the inline
 * side; pages own state and dismissal.
 *
 * No queries, no mutations, no Supabase. All data comes pre-resolved
 * from `buildBrandDetailsDrawerProps`.
 */
export interface BrandDetailsDrawerProps {
  open: boolean;
  onClose: () => void;
  /** Localized brand name. */
  name: string;
  slug?: string | null;
  refId?: string | null;
  statusLabel: string;
  statusTone: AdminStatusTone;
  verificationStatus: 'verified' | 'unverified' | 'pending';
  /** Optional extra verification label (e.g. "Official") rendered as info chip. */
  officialLabel?: string | null;
  logoUrl?: string | null;
  sectorLabel?: string | null;
  countryCode?: string | null;
  countryName?: string | null;
  ownerCompany?: string | null;
  foundedYear?: number | null;
  isLocal?: boolean;
  website?: string | null;
  providerLinkCount?: number;
  sectorLinkCount?: number;
  createdAt?: string | null;
  updatedAt?: string | null;
  /** Link to the full details page (kept as-is, not changed by drawer). */
  detailHref: string;
  closeLabel: string;
  detailLabel: string;
  localLabel?: string;
  sectorFieldLabel: string;
  originFieldLabel: string;
  ownerFieldLabel: string;
  foundedFieldLabel: string;
  providersFieldLabel: string;
  sectorsFieldLabel: string;
  createdFieldLabel: string;
  updatedFieldLabel: string;
  websiteFieldLabel: string;
}

function Row({ icon: Icon, label, value }: {
  icon: React.ElementType;
  label: string;
  value: React.ReactNode;
}) {
  return (
    <div className="flex items-start gap-2 text-sm">
      <Icon className="h-4 w-4 mt-0.5 text-muted-foreground shrink-0" aria-hidden="true" />
      <div className="min-w-0 flex-1">
        <div className="text-xs text-muted-foreground">{label}</div>
        <div className="font-medium break-words">{value}</div>
      </div>
    </div>
  );
}

export const BrandDetailsDrawer: React.FC<BrandDetailsDrawerProps> = ({
  open, onClose, name, slug, refId, statusLabel, statusTone,
  verificationStatus, officialLabel, logoUrl, sectorLabel,
  countryCode, countryName, ownerCompany, foundedYear, isLocal,
  website, providerLinkCount, sectorLinkCount, createdAt, updatedAt,
  detailHref, closeLabel, detailLabel, localLabel,
  sectorFieldLabel, originFieldLabel, ownerFieldLabel, foundedFieldLabel,
  providersFieldLabel, sectorsFieldLabel, createdFieldLabel,
  updatedFieldLabel, websiteFieldLabel,
}) => {
  if (!open) return null;
  const cleanWebsite = website ? website.replace(/^https?:\/\//, '').replace(/\/$/, '') : null;
  const originLabel = countryName || countryCode || null;
  return (
    <aside
      className="rounded-2xl border border-border/60 bg-card/90 backdrop-blur-sm shadow-sm p-4 space-y-4 sticky top-4"
      aria-label={name}
      data-testid="brand-details-drawer"
    >
      <div className="flex items-start justify-between gap-2">
        <div className="flex items-start gap-3 min-w-0">
          {logoUrl ? (
            <img
              src={logoUrl}
              alt={name}
              loading="lazy"
              className="w-12 h-12 rounded-lg object-contain border bg-background p-1 shrink-0"
            />
          ) : (
            <div className="w-12 h-12 rounded-lg bg-muted flex items-center justify-center text-xs text-muted-foreground shrink-0">—</div>
          )}
          <div className="min-w-0">
            <h3 className="font-semibold truncate">{name}</h3>
            {slug && <p className="text-xs text-muted-foreground truncate tech-content">/{slug}</p>}
            {refId && <code className="tech-content text-[10px] bg-muted px-2 py-0.5 rounded mt-1 inline-block">{refId}</code>}
          </div>
        </div>
        <Button
          variant="ghost"
          size="icon"
          onClick={onClose}
          aria-label={closeLabel}
          className="h-8 w-8 shrink-0"
        >
          <X className="h-4 w-4" />
        </Button>
      </div>

      <div className="flex flex-wrap gap-2">
        <DirectoryStatusBadge label={statusLabel} tone={statusTone} />
        <VerificationStatusBadge status={verificationStatus} />
        {officialLabel && <DirectoryStatusBadge label={officialLabel} tone="info" />}
        {isLocal && localLabel && <DirectoryStatusBadge label={localLabel} tone="muted" />}
      </div>

      <div className="grid gap-3">
        {sectorLabel && <Row icon={TagIcon} label={sectorFieldLabel} value={sectorLabel} />}
        {originLabel && (
          <Row
            icon={MapPin}
            label={originFieldLabel}
            value={<span className="tech-content">{originLabel}</span>}
          />
        )}
        {ownerCompany && <Row icon={Building2} label={ownerFieldLabel} value={ownerCompany} />}
        {foundedYear && (
          <Row icon={Calendar} label={foundedFieldLabel} value={<span className="tech-content tabular-nums">{foundedYear}</span>} />
        )}
        {cleanWebsite && (
          <Row
            icon={Globe2}
            label={websiteFieldLabel}
            value={<span className="tech-content break-all">{cleanWebsite}</span>}
          />
        )}
        {typeof providerLinkCount === 'number' && (
          <Row icon={Building2} label={providersFieldLabel} value={<span className="tabular-nums tech-content">{providerLinkCount}</span>} />
        )}
        {typeof sectorLinkCount === 'number' && (
          <Row icon={TagIcon} label={sectorsFieldLabel} value={<span className="tabular-nums tech-content">{sectorLinkCount}</span>} />
        )}
        {createdAt && (
          <Row icon={Calendar} label={createdFieldLabel} value={<span className="tech-content">{createdAt}</span>} />
        )}
        {updatedAt && (
          <Row icon={Calendar} label={updatedFieldLabel} value={<span className="tech-content">{updatedAt}</span>} />
        )}
      </div>

      <Button asChild size="sm" variant="outline" className="w-full rounded-xl">
        <Link to={detailHref}>
          <ExternalLink className="h-4 w-4 me-2" />
          {detailLabel}
        </Link>
      </Button>
    </aside>
  );
};

export default BrandDetailsDrawer;