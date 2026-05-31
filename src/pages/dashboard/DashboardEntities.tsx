import React, { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { Building2, Search, Filter, Users, ShieldCheck, ArrowRight } from 'lucide-react';
import DashboardLayout from '@/components/dashboard/DashboardLayout';
import { useAuth } from '@/contexts/AuthContext';
import { useLanguage } from '@/i18n/LanguageContext';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Card } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { listAdminBusinesses } from '@/modules/businesses/services/listAdminBusinesses';
import { listUserEntityLinks, type UserEntityLink } from '@/modules/admin/services/users/listUserEntityLinks';
import { useNoIndex } from '@/hooks/useNoIndex';
import { pickBi } from '@/components/common/Bilingual';

interface EntityRow {
  id: string;
  ref_id: string | null;
  legacy_ref_id?: string | null;
  name_ar: string | null;
  name_en: string | null;
  username: string | null;
  is_active: boolean | null;
  is_verified: boolean | null;
  membership_tier: string | null;
  approval_status: string | null;
  role?: string;
}

const STATUS_LABELS: Record<string, { ar: string; en: string }> = {
  draft: { ar: 'مسودة', en: 'Draft' },
  pending: { ar: 'قيد المراجعة', en: 'Pending' },
  verified: { ar: 'موثّق', en: 'Verified' },
  approved: { ar: 'معتمد', en: 'Approved' },
  rejected: { ar: 'مرفوض', en: 'Rejected' },
};

const TIER_LABELS: Record<string, { ar: string; en: string }> = {
  free: { ar: 'مجاني', en: 'Free' },
  basic: { ar: 'أساسي', en: 'Basic' },
  premium: { ar: 'مميز', en: 'Premium' },
  enterprise: { ar: 'مؤسسي', en: 'Enterprise' },
};

const DashboardEntities: React.FC = () => {
  useNoIndex();
  const { user, isAdmin } = useAuth();
  const { language } = useLanguage();
  const isRTL = language === 'ar';

  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [tierFilter, setTierFilter] = useState<string>('all');

  const { data, isLoading } = useQuery({
    queryKey: ['dashboard-entities', user?.id, isAdmin],
    queryFn: async (): Promise<EntityRow[]> => {
      if (isAdmin) {
        const res = await listAdminBusinesses<EntityRow>({
          select:
            'id, ref_id, legacy_ref_id, name_ar, name_en, username, is_active, is_verified, membership_tier, approval_status',
          orderBy: { column: 'created_at', ascending: false },
        });
        return (res.data ?? []) as EntityRow[];
      }
      if (!user?.id) return [];
      const res = await listUserEntityLinks(user.id);
      return (res.data ?? []).map((l: UserEntityLink) => ({
        id: l.business_id,
        ref_id: l.business_ref_id,
        legacy_ref_id: l.business_legacy_ref_id,
        name_ar: l.business_name_ar,
        name_en: l.business_name_en,
        username: l.business_username,
        is_active: l.is_active,
        is_verified: l.is_verified,
        membership_tier: l.membership_tier,
        approval_status: l.approval_status,
        role: l.role,
      }));
    },
    enabled: !!user?.id,
  });

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return (data ?? []).filter((e) => {
      if (statusFilter !== 'all') {
        if (statusFilter === 'verified' && !e.is_verified) return false;
        if (statusFilter === 'draft' && (e.approval_status ?? 'draft') !== 'draft') return false;
        if (!['verified', 'draft'].includes(statusFilter) && e.approval_status !== statusFilter) return false;
      }
      if (tierFilter !== 'all' && (e.membership_tier ?? 'free') !== tierFilter) return false;
      if (!q) return true;
      return (
        (e.name_ar ?? '').toLowerCase().includes(q) ||
        (e.name_en ?? '').toLowerCase().includes(q) ||
        (e.username ?? '').toLowerCase().includes(q) ||
        (e.ref_id ?? '').toLowerCase().includes(q) ||
        (e.legacy_ref_id ?? '').toLowerCase().includes(q)
      );
    });
  }, [data, search, statusFilter, tierFilter]);

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <header className="flex items-start justify-between gap-4 flex-wrap">
          <div>
            <h1 className="text-2xl font-bold flex items-center gap-2">
              <Building2 className="w-6 h-6 text-primary" />
              {pickBi(isRTL, 'حسابات الكيانات', 'Entities')}
            </h1>
            <p className="text-sm text-muted-foreground mt-1">
              {isAdmin
                ? pickBi(isRTL, 'إدارة جميع كيانات المنصة', 'Manage all platform entities')
                : pickBi(isRTL, 'الكيانات التي تملكها أو تعمل بها', 'Entities you own or work in')}
            </p>
          </div>
          <Badge variant="outline" className="tech-content">
            {(filtered?.length ?? 0)} / {(data?.length ?? 0)}
          </Badge>
        </header>

        <Card className="p-4">
          <div className="grid gap-3 md:grid-cols-[1fr_180px_180px]">
            <div className="relative">
              <Search className="absolute top-1/2 -translate-y-1/2 start-3 w-4 h-4 text-muted-foreground" />
              <Input
                dir="auto"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder={pickBi(isRTL, 'بحث بالاسم أو المعرف...', 'Search by name or ref...')}
                className="h-12 ps-10"
              />
            </div>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="h-12">
                <Filter className="w-4 h-4 me-2" />
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">{pickBi(isRTL, 'كل الحالات', 'All statuses')}</SelectItem>
                <SelectItem value="draft">{pickBi(isRTL, 'مسودة', 'Draft')}</SelectItem>
                <SelectItem value="verified">{pickBi(isRTL, 'موثّق', 'Verified')}</SelectItem>
                <SelectItem value="pending">{pickBi(isRTL, 'قيد المراجعة', 'Pending')}</SelectItem>
                <SelectItem value="approved">{pickBi(isRTL, 'معتمد', 'Approved')}</SelectItem>
                <SelectItem value="rejected">{pickBi(isRTL, 'مرفوض', 'Rejected')}</SelectItem>
              </SelectContent>
            </Select>
            <Select value={tierFilter} onValueChange={setTierFilter}>
              <SelectTrigger className="h-12">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">{pickBi(isRTL, 'كل العضويات', 'All tiers')}</SelectItem>
                <SelectItem value="free">{pickBi(isRTL, 'مجاني', 'Free')}</SelectItem>
                <SelectItem value="basic">{pickBi(isRTL, 'أساسي', 'Basic')}</SelectItem>
                <SelectItem value="premium">{pickBi(isRTL, 'مميز', 'Premium')}</SelectItem>
                <SelectItem value="enterprise">{pickBi(isRTL, 'مؤسسي', 'Enterprise')}</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </Card>

        {isLoading ? (
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            {Array.from({ length: 6 }).map((_, i) => (
              <Skeleton key={i} className="h-40 rounded-xl" />
            ))}
          </div>
        ) : filtered.length === 0 ? (
          <Card className="p-12 text-center text-muted-foreground">
            <Building2 className="w-12 h-12 mx-auto mb-3 opacity-40" />
            {pickBi(isRTL, 'لا توجد كيانات مطابقة', 'No matching entities')}
          </Card>
        ) : (
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            {filtered.map((e) => {
              const name = pickBi(isRTL, e.name_ar, e.name_en) || e.username || '—';
              const status = e.approval_status ?? 'draft';
              const statusCfg = STATUS_LABELS[status] ?? { ar: status, en: status };
              const tier = e.membership_tier ?? 'free';
              const tierCfg = TIER_LABELS[tier] ?? { ar: tier, en: tier };
              return (
                <Link
                  key={e.id}
                  to={`/dashboard/entities/${e.id}`}
                  className="group block hover-lift"
                >
                  <Card className="p-5 h-full border-border/60 transition-colors group-hover:border-primary/40">
                    <div className="flex items-start justify-between gap-2 mb-3">
                      <div className="flex items-center gap-2 min-w-0">
                        <div className="w-10 h-10 rounded-xl bg-primary/10 text-primary flex items-center justify-center shrink-0">
                          <Building2 className="w-5 h-5" />
                        </div>
                        <div className="min-w-0">
                          <h3 className="font-semibold truncate">{name}</h3>
                          <p className="text-[11px] text-muted-foreground tech-content truncate">
                            {e.ref_id ?? e.legacy_ref_id ?? '—'}
                          </p>
                        </div>
                      </div>
                      <ArrowRight className={`w-4 h-4 text-muted-foreground opacity-0 group-hover:opacity-100 transition ${isRTL ? 'rotate-180' : ''}`} />
                    </div>
                    <div className="flex flex-wrap gap-1.5">
                      <Badge variant={e.is_verified ? 'default' : 'outline'} className="text-[10px]">
                        {e.is_verified ? (
                          <><ShieldCheck className="w-3 h-3 me-1" />{pickBi(isRTL, 'موثّق', 'Verified')}</>
                        ) : (
                          pickBi(isRTL, statusCfg.ar, statusCfg.en)
                        )}
                      </Badge>
                      <Badge variant="secondary" className="text-[10px]">
                        {pickBi(isRTL, tierCfg.ar, tierCfg.en)}
                      </Badge>
                      {e.role && (
                        <Badge variant="outline" className="text-[10px]">
                          <Users className="w-3 h-3 me-1" />
                          {e.role}
                        </Badge>
                      )}
                      {!e.is_active && (
                        <Badge variant="destructive" className="text-[10px]">
                          {pickBi(isRTL, 'موقوف', 'Inactive')}
                        </Badge>
                      )}
                    </div>
                  </Card>
                </Link>
              );
            })}
          </div>
        )}
      </div>
    </DashboardLayout>
  );
};

export default DashboardEntities;