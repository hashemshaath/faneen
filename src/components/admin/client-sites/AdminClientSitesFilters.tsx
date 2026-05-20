import React from 'react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Separator } from '@/components/ui/separator';
import { Filter, Search, X } from 'lucide-react';
import { SITE_TYPES, type StatusFilter } from '@/lib/client-sites/admin-client-site-monitoring';

type Bi = (ar: string, en: string) => string;

export interface ActiveFilter { key: string; label: string; clear: () => void }

interface Props {
  bi: Bi;
  search: string; setSearch: (v: string) => void;
  city: string; setCity: (v: string) => void;
  status: StatusFilter; setStatus: (v: StatusFilter) => void;
  visibility: string; setVisibility: (v: string) => void;
  qrStatus: string; setQrStatus: (v: string) => void;
  siteType: string; setSiteType: (v: string) => void;
  activeFilters: ActiveFilter[];
  onResetAll: () => void;
  searchInputRef?: React.Ref<HTMLInputElement>;
}

const AdminClientSitesFilters: React.FC<Props> = ({
  bi, search, setSearch, city, setCity, status, setStatus,
  visibility, setVisibility, qrStatus, setQrStatus, siteType, setSiteType,
  activeFilters, onResetAll, searchInputRef,
}) => {
  return (
    <Card className="border-border/60">
      <CardHeader className="pb-2 flex-row items-center justify-between space-y-0">
        <CardTitle className="text-sm flex items-center gap-2">
          <Filter className="h-4 w-4 text-muted-foreground" aria-hidden />
          {bi('عوامل التصفية', 'Filters')}
        </CardTitle>
        {activeFilters.length > 0 && (
          <Button variant="ghost" size="sm" onClick={onResetAll} className="h-8" aria-label={bi('إعادة ضبط', 'Reset all')}>
            <X className="h-3.5 w-3.5 me-1" /> {bi('إعادة ضبط', 'Reset all')}
          </Button>
        )}
      </CardHeader>
      <CardContent className="p-4 pt-2 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3">
        <div className="relative">
          <Search className="absolute top-1/2 -translate-y-1/2 start-3 h-4 w-4 text-muted-foreground pointer-events-none" aria-hidden />
          <Input
            dir="auto"
            placeholder={bi('بحث (site_ref أو الاسم)', 'Search (site_ref or name)')}
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="ps-9 h-11"
            ref={searchInputRef}
            aria-label={bi('بحث', 'Search')}
          />
          <kbd className="hidden md:flex absolute top-1/2 -translate-y-1/2 end-2 h-5 items-center px-1.5 rounded border bg-muted text-[10px] text-muted-foreground tech-content">/</kbd>
        </div>
        <Input
          dir="auto"
          placeholder={bi('المدينة', 'City')}
          value={city}
          onChange={(e) => setCity(e.target.value)}
          className="h-11"
          aria-label={bi('المدينة', 'City')}
        />
        <Select value={status} onValueChange={(v) => setStatus(v as StatusFilter)}>
          <SelectTrigger className="h-11" aria-label={bi('الحالة', 'Status')}><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="active">{bi('نشطة', 'Active')}</SelectItem>
            <SelectItem value="archived">{bi('مؤرشفة', 'Archived')}</SelectItem>
            <SelectItem value="all">{bi('الكل', 'All')}</SelectItem>
          </SelectContent>
        </Select>
        <Select value={visibility} onValueChange={setVisibility}>
          <SelectTrigger className="h-11" aria-label={bi('الرؤية', 'Visibility')}><SelectValue placeholder={bi('الرؤية', 'Visibility')} /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">{bi('كل الرؤية', 'All visibility')}</SelectItem>
            <SelectItem value="private">{bi('خاص', 'Private')}</SelectItem>
            <SelectItem value="shared_by_qr">{bi('مشاركة عبر QR', 'Shared by QR')}</SelectItem>
            <SelectItem value="provider_invited">{bi('بدعوة مزود', 'Provider invited')}</SelectItem>
            <SelectItem value="public_limited">{bi('عام محدود', 'Public limited')}</SelectItem>
          </SelectContent>
        </Select>
        <Select value={qrStatus} onValueChange={setQrStatus}>
          <SelectTrigger className="h-11" aria-label={bi('حالة QR', 'QR status')}><SelectValue placeholder={bi('حالة QR', 'QR status')} /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">{bi('كل حالات QR', 'All QR')}</SelectItem>
            <SelectItem value="enabled">{bi('مفعّل', 'Enabled')}</SelectItem>
            <SelectItem value="disabled">{bi('معطّل', 'Disabled')}</SelectItem>
            <SelectItem value="revoked">{bi('ملغى', 'Revoked')}</SelectItem>
          </SelectContent>
        </Select>
        <Select value={siteType} onValueChange={setSiteType}>
          <SelectTrigger className="h-11" aria-label={bi('النوع', 'Type')}><SelectValue placeholder={bi('النوع', 'Type')} /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">{bi('كل الأنواع', 'All types')}</SelectItem>
            {SITE_TYPES.map((t) => (
              <SelectItem key={t} value={t}>{t}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </CardContent>
      {activeFilters.length > 0 && (
        <>
          <Separator />
          <div className="p-3 flex flex-wrap items-center gap-2">
            <span className="text-xs text-muted-foreground">{bi('نشطة:', 'Active:')}</span>
            {activeFilters.map(f => (
              <Badge
                key={f.key}
                variant="secondary"
                className="gap-1 cursor-pointer hover:bg-muted"
                onClick={f.clear}
                role="button"
                aria-label={`${bi('إزالة', 'Remove')} ${f.label}`}
              >
                {f.label}
                <X className="h-3 w-3" />
              </Badge>
            ))}
          </div>
        </>
      )}
    </Card>
  );
};

export default AdminClientSitesFilters;