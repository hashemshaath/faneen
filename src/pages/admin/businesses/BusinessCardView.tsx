import React from 'react';
import { Link } from 'react-router-dom';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  CheckSquare,
  Square,
  Star,
  Ban,
  FileText,
  FlaskConical,
  AlertTriangle,
  Phone,
  Mail,
  Package,
  Eye,
  Edit,
  Shield,
  CheckCircle,
  ShieldCheck,
} from 'lucide-react';
import { pickBi } from '@/components/common/Bilingual';
import type { BusinessTableRow, TranslationCompleteness } from './BusinessTableView';
import { TIERS } from './_shared';

/**
 * Row shape for the card view — extends the table row with a few extra
 * fields that the card surface needs (contact info + approval status).
 */
export interface BusinessCardRow extends BusinessTableRow {
  phone?: string | null;
  email?: string | null;
  approval_status?: string | null;
}

interface BusinessCardViewProps {
  rows: ReadonlyArray<BusinessCardRow>;
  language: string;
  isRTL: boolean;
  selected: Set<string>;
  allPagedSelected: boolean;
  toggleSelect: (id: string) => void;
  togglePageAll: () => void;
  translationCompleteness: (b: BusinessCardRow) => TranslationCompleteness;
  contractBusinessIds: ReadonlyArray<string>;
  allServices: ReadonlyArray<{ business_id: string }>;
  onEdit: (b: BusinessCardRow) => void;
  onOpenServices: (id: string) => void;
  onTierChange: (id: string, tier: string) => void;
  onApprovalChange: (id: string, status: string) => void;
  onVerifyToggle: (id: string, name: string, currentVerified: boolean) => void;
  onActiveToggle: (id: string, currentActive: boolean) => void;
  safePage: number;
  pageSize: number;
  filteredLength: number;
}

const BusinessCardViewImpl: React.FC<BusinessCardViewProps> = ({
  rows,
  language,
  isRTL,
  selected,
  allPagedSelected,
  toggleSelect,
  togglePageAll,
  translationCompleteness,
  contractBusinessIds,
  allServices,
  onEdit,
  onOpenServices,
  onTierChange,
  onApprovalChange,
  onVerifyToggle,
  onActiveToggle,
  safePage,
  pageSize,
  filteredLength,
}) => {
  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2 px-1 text-[11px] text-muted-foreground">
        <button onClick={togglePageAll} className="inline-flex items-center gap-1 hover:text-foreground">
          {allPagedSelected ? <CheckSquare className="w-4 h-4 text-accent" /> : <Square className="w-4 h-4" />}
          {pickBi(isRTL, 'تحديد الصفحة', 'Select page')}
        </button>
        <span className="ms-auto tech-content">
          {(safePage - 1) * pageSize + 1}–{Math.min(safePage * pageSize, filteredLength)} / {filteredLength}
        </span>
      </div>
      {rows.map((biz, idx) => {
        const tierInfo = TIERS.find((t) => t.value === biz.membership_tier) || TIERS[0];
        const hasContract = contractBusinessIds.includes(biz.id);
        const svcCount = allServices.filter((s) => s.business_id === biz.id).length;
        const tc = translationCompleteness(biz);
        const isSel = selected.has(biz.id);
        return (
          <div
            key={biz.id}
            className={`group relative rounded-2xl border bg-card transition-all duration-200 hover:shadow-md
              ${isSel ? 'border-accent ring-2 ring-accent/30' : (!biz.is_active ? 'opacity-60 border-destructive/40' : 'border-border/30 hover:border-primary/20')}`}
            style={{ animationDelay: `${idx * 0.03}s` }}
          >
            <div className="p-3 sm:p-4">
              <div className="flex flex-col gap-3">
                {/* ── Identity row ── */}
                <div className="flex items-start gap-2.5 sm:gap-3 min-w-0">
                  <button
                    onClick={() => toggleSelect(biz.id)}
                    className="mt-1 text-muted-foreground hover:text-foreground shrink-0"
                    aria-label="select"
                  >
                    {isSel ? <CheckSquare className="w-4 h-4 text-accent" /> : <Square className="w-4 h-4" />}
                  </button>
                  <div className="relative shrink-0">
                    <Avatar className="w-11 h-11 sm:w-12 sm:h-12 ring-2 ring-border/10">
                      <AvatarImage
                        src={
                          biz.logo_image_variants?.thumbnail
                          || biz.logo_image_variants?.card
                          || biz.logo_url
                          || undefined
                        }
                      />
                      <AvatarFallback className="bg-gradient-to-br from-accent/20 to-primary/10 text-accent font-bold text-sm">
                        {biz.name_ar?.charAt(0)}
                      </AvatarFallback>
                    </Avatar>
                    {biz.is_verified && (
                      <div className="absolute -bottom-1 -end-1 w-5 h-5 rounded-full bg-info/15 flex items-center justify-center ring-2 ring-card">
                        <CheckCircle className="w-3 h-3 text-info" />
                      </div>
                    )}
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <h3 className="font-heading font-bold text-sm sm:text-base leading-tight break-words min-w-0" dir="auto">
                        {language === 'ar' ? biz.name_ar : (biz.name_en || biz.name_ar)}
                      </h3>
                      {!biz.is_active && (
                        <Badge variant="destructive" className="text-[9px] gap-0.5 px-1.5 py-0">
                          <Ban className="w-2.5 h-2.5" />
                          {pickBi(isRTL, 'معطل', 'Disabled')}
                        </Badge>
                      )}
                      {hasContract && (
                        <Badge variant="outline" className="text-[9px] gap-0.5 px-1.5 py-0">
                          <FileText className="w-2.5 h-2.5" />
                          {pickBi(isRTL, 'عقود', 'Contracts')}
                        </Badge>
                      )}
                      {biz.is_demo && (
                        <Badge
                          variant="outline"
                          className="text-[9px] gap-0.5 px-1.5 py-0 border-amber-500/40 text-amber-600 dark:text-amber-400"
                          title={pickBi(isRTL, 'بيانات تجريبية', 'Demo data')}
                        >
                          <FlaskConical className="w-2.5 h-2.5" />
                          {pickBi(isRTL, 'تجريبي', 'Demo')}
                        </Badge>
                      )}
                      {!tc.full && (
                        <Badge
                          variant="outline"
                          className="text-[9px] gap-0.5 px-1.5 py-0 border-warning/40 text-warning"
                          title={pickBi(isRTL, 'الترجمة غير مكتملة', 'Translation incomplete')}
                        >
                          <AlertTriangle className="w-2.5 h-2.5" />
                          {tc.ar ? 'EN' : 'AR'}
                        </Badge>
                      )}
                    </div>
                    <div className="flex flex-wrap items-center gap-x-3 gap-y-1 mt-1.5">
                      <span className="text-[11px] text-muted-foreground tech-content">@{biz.username}</span>
                      <span className="text-[11px] text-muted-foreground tech-content">{biz.ref_id}</span>
                      {biz.phone && (
                        <span className="inline-flex items-center gap-1 text-[11px] text-muted-foreground tech-content" dir="ltr">
                          <Phone className="w-3 h-3 shrink-0" />
                          {biz.phone}
                        </span>
                      )}
                      {biz.email && (
                        <span
                          className="inline-flex items-center gap-1 text-[11px] text-muted-foreground tech-content truncate max-w-[220px]"
                          dir="ltr"
                        >
                          <Mail className="w-3 h-3 shrink-0" />
                          {biz.email}
                        </span>
                      )}
                    </div>
                    <div className="flex flex-wrap items-center gap-1.5 mt-2">
                      <Badge className={`${tierInfo.color} text-[10px] border px-1.5 py-0`}>
                        {tierInfo.icon} {language === 'ar' ? tierInfo.label_ar : tierInfo.label_en}
                      </Badge>
                      <span className="flex items-center gap-0.5 text-[11px] text-muted-foreground">
                        <Star className="w-3 h-3 text-accent fill-accent" />
                        {biz.rating_avg} ({biz.rating_count})
                      </span>
                      {svcCount > 0 && (
                        <Badge variant="outline" className="text-[10px] gap-0.5 px-1.5 py-0">
                          <Package className="w-2.5 h-2.5" /> {svcCount} {pickBi(isRTL, 'خدمة', 'services')}
                        </Badge>
                      )}
                    </div>
                  </div>
                  {/* Quick view button — always visible top-corner */}
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-8 w-8 p-0 rounded-xl shrink-0"
                    asChild
                    title={pickBi(isRTL, 'عرض الملف', 'View profile')}
                  >
                    <Link to={`/${biz.username}`}>
                      <Eye className="w-4 h-4" />
                    </Link>
                  </Button>
                </div>

                {/* ── Actions row ── full-width, scrolls on mobile */}
                <div className="-mx-1 px-1 pt-2 border-t border-border/30 overflow-x-auto no-scrollbar">
                  <div className="flex items-center gap-1.5 min-w-max">
                    <Select
                      value={biz.membership_tier}
                      onValueChange={(tier) => onTierChange(biz.id, tier)}
                    >
                      <SelectTrigger className="h-8 text-xs w-28 border-dashed rounded-xl shrink-0">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent className="rounded-xl">
                        {TIERS.map((t) => (
                          <SelectItem key={t.value} value={t.value}>
                            {t.icon} {language === 'ar' ? t.label_ar : t.label_en}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>

                    <Select
                      value={biz.approval_status || 'draft'}
                      onValueChange={(status) => onApprovalChange(biz.id, status)}
                    >
                      <SelectTrigger
                        className="h-8 text-xs w-32 rounded-xl shrink-0"
                        title={pickBi(isRTL, 'حالة النشر', 'Publication status')}
                      >
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent className="rounded-xl">
                        <SelectItem value="draft">
                          📝 {pickBi(isRTL, 'مسودة', 'Draft')}
                        </SelectItem>
                        <SelectItem value="submitted">
                          📨 {pickBi(isRTL, 'مُرسلة', 'Submitted')}
                        </SelectItem>
                        <SelectItem value="under_review">
                          🔍 {pickBi(isRTL, 'قيد المراجعة', 'Under review')}
                        </SelectItem>
                        <SelectItem value="approved">
                          ✅ {pickBi(isRTL, 'معتمدة', 'Approved')}
                        </SelectItem>
                        <SelectItem value="published">
                          🌐 {pickBi(isRTL, 'منشورة', 'Published')}
                        </SelectItem>
                        <SelectItem value="rejected">
                          ⛔ {pickBi(isRTL, 'مرفوضة', 'Rejected')}
                        </SelectItem>
                      </SelectContent>
                    </Select>

                    <Button
                      variant={biz.is_verified ? 'default' : 'outline'}
                      size="sm"
                      className={`h-8 text-xs gap-1.5 rounded-xl shrink-0 ${
                        biz.is_verified
                          ? 'bg-info text-info-foreground hover:bg-info/90'
                          : 'text-info border-info/40'
                      }`}
                      onClick={() => onVerifyToggle(biz.id, biz.name_ar || biz.name_en || '', biz.is_verified)}
                      title={pickBi(isRTL, 'تبديل حالة التوثيق الرسمي', 'Toggle official verification')}
                    >
                      {biz.is_verified ? <CheckCircle className="w-3 h-3" /> : <Shield className="w-3 h-3" />}
                      <span>
                        {biz.is_verified
                          ? pickBi(isRTL, 'موثّق — إلغاء', 'Verified — Unverify')
                          : pickBi(isRTL, 'توثيق الحساب', 'Verify')}
                      </span>
                    </Button>

                    <Button
                      variant="outline"
                      size="sm"
                      className={`h-8 text-xs gap-1.5 rounded-xl shrink-0 ${
                        !biz.is_active ? 'text-success border-success' : 'text-warning border-warning'
                      }`}
                      onClick={() => onActiveToggle(biz.id, biz.is_active)}
                    >
                      {biz.is_active ? <Ban className="w-3 h-3" /> : <CheckCircle className="w-3 h-3" />}
                      <span>
                        {biz.is_active
                          ? pickBi(isRTL, 'تعطيل', 'Disable')
                          : pickBi(isRTL, 'تفعيل', 'Enable')}
                      </span>
                    </Button>

                    <Button
                      variant="outline"
                      size="sm"
                      className="h-8 text-xs gap-1.5 rounded-xl shrink-0"
                      onClick={() => onOpenServices(biz.id)}
                      title={pickBi(isRTL, 'خدمات', 'Services')}
                    >
                      <Package className="w-3 h-3" />
                      <span className="hidden md:inline">{pickBi(isRTL, 'خدمات', 'Services')}</span>
                    </Button>

                    <Button
                      variant="outline"
                      size="sm"
                      className="h-8 text-xs gap-1.5 rounded-xl shrink-0"
                      asChild
                      title={pickBi(isRTL, 'خدمات الجهة', 'Activations')}
                    >
                      <Link to={`/admin/service-activations?businessId=${biz.id}`}>
                        <ShieldCheck className="w-3 h-3" />
                        <span className="hidden lg:inline">{pickBi(isRTL, 'خدمات الجهة', 'Activations')}</span>
                      </Link>
                    </Button>

                    <Button
                      variant="outline"
                      size="sm"
                      className="h-8 gap-1.5 text-xs rounded-xl shrink-0 ms-auto"
                      onClick={() => onEdit(biz)}
                    >
                      <Edit className="w-3 h-3" />
                      <span className="hidden md:inline">{pickBi(isRTL, 'تعديل', 'Edit')}</span>
                    </Button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
};

export const BusinessCardView = React.memo(BusinessCardViewImpl);
BusinessCardView.displayName = 'BusinessCardView';

export default BusinessCardView;
