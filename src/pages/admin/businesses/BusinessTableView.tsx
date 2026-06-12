import React from 'react';
import { Link } from 'react-router-dom';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  CheckSquare,
  Square,
  Star,
  Languages,
  Edit,
  Package,
  Eye,
  FlaskConical,
} from 'lucide-react';
import { pickBi } from '@/components/common/Bilingual';
import { AdminStatusBadge } from '@/components/admin/AdminStatusBadge';
import type {
  AdminBusinessImageVariants,
} from '../adminBusinesses.types';
import { TIERS } from './_shared';

/**
 * Pure-presentational table view extracted from `AdminBusinesses.tsx`.
 * All state lives in the parent — this component is given the already-
 * paginated row slice plus the callbacks it needs.
 *
 * Kept loosely typed at the row level (Record-shaped) because the
 * parent query selects a subset of `businesses` columns via
 * `BUSINESS_SAFE_COLUMNS_SELECT` and threading the full Supabase row
 * type through here adds noise without runtime benefit.
 */
export interface BusinessTableRow {
  id: string;
  ref_id: string;
  username: string;
  name_ar: string;
  name_en: string | null;
  membership_tier: string;
  rating_avg: number;
  rating_count: number;
  is_verified: boolean;
  is_active: boolean;
  is_demo?: boolean | null;
  logo_url?: string | null;
  logo_image_variants?: AdminBusinessImageVariants | null;
  name_ar_short?: unknown;
  name_en_short?: unknown;
  short_description_ar?: unknown;
  short_description_en?: unknown;
  description_ar?: unknown;
  description_en?: unknown;
}

export interface TranslationCompleteness {
  ar: boolean;
  en: boolean;
  full: boolean;
}

interface BusinessTableViewProps {
  rows: ReadonlyArray<BusinessTableRow>;
  language: string;
  isRTL: boolean;
  selected: Set<string>;
  allPagedSelected: boolean;
  toggleSelect: (id: string) => void;
  togglePageAll: () => void;
  translationCompleteness: (b: BusinessTableRow) => TranslationCompleteness;
  onEdit: (b: BusinessTableRow) => void;
  onOpenServices: (id: string) => void;
}

const BusinessTableViewImpl: React.FC<BusinessTableViewProps> = ({
  rows,
  language,
  isRTL,
  selected,
  allPagedSelected,
  toggleSelect,
  togglePageAll,
  translationCompleteness,
  onEdit,
  onOpenServices,
}) => {
  return (
    <div className="rounded-2xl border border-border/30 bg-card overflow-hidden">
      <div className="p-0">
        <Table>
          <TableHeader>
            <TableRow className="bg-muted/30">
              <TableHead className="w-8">
                <button
                  onClick={togglePageAll}
                  className="text-muted-foreground hover:text-foreground"
                >
                  {allPagedSelected ? <CheckSquare className="w-4 h-4" /> : <Square className="w-4 h-4" />}
                </button>
              </TableHead>
              <TableHead className="text-[11px] font-semibold">{pickBi(isRTL, 'النشاط', 'Business')}</TableHead>
              <TableHead className="text-[11px] font-semibold">{pickBi(isRTL, 'المعرف', 'Username')}</TableHead>
              <TableHead className="text-[11px] font-semibold">{pickBi(isRTL, 'العضوية', 'Tier')}</TableHead>
              <TableHead className="text-[11px] font-semibold">{pickBi(isRTL, 'التقييم', 'Rating')}</TableHead>
              <TableHead className="text-[11px] font-semibold">{pickBi(isRTL, 'الترجمة', 'Trans.')}</TableHead>
              <TableHead className="text-[11px] font-semibold">{pickBi(isRTL, 'الحالة', 'Status')}</TableHead>
              <TableHead className="text-[11px] font-semibold text-center">{pickBi(isRTL, 'إجراءات', 'Actions')}</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {rows.map((biz, idx) => {
              const tierInfo = TIERS.find((t) => t.value === biz.membership_tier) || TIERS[0];
              const tc = translationCompleteness(biz);
              return (
                <TableRow
                  key={biz.id}
                  className={`hover:bg-muted/30 ${!biz.is_active ? 'opacity-50' : ''}`}
                  style={{ animationDelay: `${idx * 0.02}s` }}
                >
                  <TableCell className="py-2.5">
                    <button
                      onClick={() => toggleSelect(biz.id)}
                      className="text-muted-foreground hover:text-foreground"
                    >
                      {selected.has(biz.id) ? <CheckSquare className="w-4 h-4 text-accent" /> : <Square className="w-4 h-4" />}
                    </button>
                  </TableCell>
                  <TableCell className="py-2.5">
                    <div className="flex items-center gap-2.5">
                      <Avatar className="w-8 h-8 border border-border/50">
                        <AvatarImage
                          src={
                            biz.logo_image_variants?.thumbnail
                            || biz.logo_image_variants?.card
                            || biz.logo_url
                            || undefined
                          }
                        />
                        <AvatarFallback className="bg-primary/5 text-primary font-bold text-[10px]">
                          {biz.name_ar?.charAt(0)}
                        </AvatarFallback>
                      </Avatar>
                      <div>
                        <p className="text-xs font-semibold truncate max-w-[180px]" dir="auto">
                          {language === 'ar' ? biz.name_ar : (biz.name_en || biz.name_ar)}
                        </p>
                        <div className="flex items-center gap-1">
                          <p className="text-[10px] text-muted-foreground tech-content">{biz.ref_id}</p>
                          {biz.is_demo && (
                            <Badge
                              variant="outline"
                              className="text-[9px] h-4 px-1 gap-0.5 border-amber-500/40 text-amber-600 dark:text-amber-400"
                              title={pickBi(isRTL, 'بيانات تجريبية', 'Demo data')}
                            >
                              <FlaskConical className="w-2.5 h-2.5" />
                              {pickBi(isRTL, 'تجريبي', 'Demo')}
                            </Badge>
                          )}
                        </div>
                      </div>
                    </div>
                  </TableCell>
                  <TableCell className="text-[11px] text-muted-foreground tech-content">@{biz.username}</TableCell>
                  <TableCell>
                    <Badge className={`text-[9px] h-5 ${tierInfo.color} border-0`}>
                      {tierInfo.icon} {language === 'ar' ? tierInfo.label_ar : tierInfo.label_en}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <span className="flex items-center gap-0.5 text-[11px]">
                      <Star className="w-3 h-3 text-accent fill-accent" /> {biz.rating_avg}
                      <span className="text-muted-foreground">({biz.rating_count})</span>
                    </span>
                  </TableCell>
                  <TableCell>
                    <Badge
                      variant="outline"
                      className={`text-[9px] h-5 gap-1 ${tc.full ? 'border-success/30 text-success' : 'border-warning/30 text-warning'}`}
                      title={tc.full ? pickBi(isRTL, 'مكتملة', 'Complete') : pickBi(isRTL, 'ناقصة', 'Incomplete')}
                    >
                      <Languages className="w-2.5 h-2.5" />
                      {tc.ar ? 'AR' : '·'} / {tc.en ? 'EN' : '·'}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-1">
                      {biz.is_verified && (
                        <Badge className="text-[8px] h-4 bg-info/10 text-info border-0">
                          {pickBi(isRTL, 'موثق', 'Verified')}
                        </Badge>
                      )}
                      {!biz.is_active && (
                        <Badge variant="destructive" className="text-[8px] h-4">
                          {pickBi(isRTL, 'معطل', 'Disabled')}
                        </Badge>
                      )}
                      {biz.is_active && !biz.is_verified && (
                        <Badge className="text-[8px] h-4 bg-success/10 text-success border-0">
                          {pickBi(isRTL, 'نشط', 'Active')}
                        </Badge>
                      )}
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center justify-center gap-1">
                      <Button variant="outline" size="sm" className="h-6 w-6 p-0" onClick={() => onEdit(biz)}>
                        <Edit className="w-3 h-3" />
                      </Button>
                      <Button variant="outline" size="sm" className="h-6 w-6 p-0" onClick={() => onOpenServices(biz.id)}>
                        <Package className="w-3 h-3" />
                      </Button>
                      <Button variant="ghost" size="sm" className="h-6 w-6 p-0" asChild>
                        <Link to={`/${biz.username}`}>
                          <Eye className="w-3 h-3" />
                        </Link>
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </div>
    </div>
  );
};

export const BusinessTableView = React.memo(BusinessTableViewImpl);
BusinessTableView.displayName = 'BusinessTableView';

export default BusinessTableView;