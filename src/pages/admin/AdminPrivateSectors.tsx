import React, { useMemo, useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { DashboardLayout } from '@/components/dashboard/DashboardLayout';
import { useLanguage } from '@/i18n/LanguageContext';
import { useNoIndex } from '@/hooks/useNoIndex';
import { listBusinessesByIds } from '@/modules/businesses';
import { toast } from 'sonner';
import { ShieldCheck } from 'lucide-react';
import { AdminPageHeader } from '@/components/admin/AdminPageHeader';
import {
  listAllSectors, reviewSector, listGlobalAudit, listAuditForSector,
  updateSector, deleteSector, setSectorReason,
} from '@/features/private-sectors/service';
import {
  PS_STATUS_META, PS_BRAND_TYPE_META, PrivateSector, PrivateSectorStatus,
} from '@/features/private-sectors/types';
import { PrivateSectorForm } from '@/features/private-sectors/PrivateSectorForm';
import { SectorDistributorsPanel } from '@/features/private-sectors/SectorDistributorsPanel';
import { ONBOARDING_SECTORS } from '@/data/onboarding-sectors';
import {
  PrivateSectorsStatsSection,
  PrivateSectorsFiltersBar,
  PrivateSectorsListSection,
  PrivateSectorRow,
  PrivateSectorAuditPanel,
  PrivateSectorAuditList,
} from '@/components/admin/content/private-sectors';
import type { AdminFilterPill } from '@/components/admin/AdminFiltersBar';

type TabKey = PrivateSectorStatus | 'all';
const STATUS_KEYS: TabKey[] = ['pending', 'approved', 'rejected', 'suspended', 'draft', 'all'];

const AdminPrivateSectors: React.FC = () => {
  useNoIndex();
  const { isRTL } = useLanguage();
  const qc = useQueryClient();
  const [tab, setTab] = useState<PrivateSectorStatus | 'all'>('pending');
  const [search, setSearch] = useState('');
  const [editing, setEditing] = useState<Partial<PrivateSector> | null>(null);
  const [auditFor, setAuditFor] = useState<string | null>(null);
  const [distributorsFor, setDistributorsFor] = useState<string | null>(null);
  const [reasonOf, setReasonOf] = useState<string | null>(null);
  const [reason, setReason] = useState('');

  const { data: sectors = [], isLoading } = useQuery({
    queryKey: ['admin-private-sectors', tab],
    queryFn: () => listAllSectors({ status: tab }),
  });

  const { data: globalAudit = [] } = useQuery({
    queryKey: ['admin-private-sectors-audit-global'],
    queryFn: () => listGlobalAudit(50),
  });

  const { data: focusAudit = [] } = useQuery({
    queryKey: ['admin-private-sector-audit', auditFor],
    enabled: !!auditFor,
    queryFn: () => listAuditForSector(auditFor!, 50),
  });

  const businessIds = useMemo(() => Array.from(new Set(sectors.map((s) => s.business_id))), [sectors]);
  const { data: businesses = [] } = useQuery({
    queryKey: ['admin-ps-businesses', businessIds.sort().join(',')],
    enabled: businessIds.length > 0,
    queryFn: async () => {
      const { data } = await listBusinessesByIds<{
        id: string;
        name_ar: string | null;
        name_en: string | null;
        ref_id: string | null;
      }>({
        ids: businessIds,
        select: 'id, name_ar, name_en, ref_id',
      });
      return data ?? [];
    },
  });
  const businessById = useMemo(() => new Map(businesses.map((b) => [b.id, b])), [businesses]);

  const refresh = () => qc.invalidateQueries({ queryKey: ['admin-private-sectors'] });

  const reviewMut = useMutation({
    mutationFn: ({ id, decision, reason }: { id: string; decision: PrivateSectorStatus; reason?: string }) =>
      reviewSector(id, decision, reason),
    onSuccess: () => {
      refresh();
      qc.invalidateQueries({ queryKey: ['admin-private-sectors-audit-global'] });
      setReasonOf(null); setReason('');
      toast.success(isRTL ? 'تم تحديث الحالة' : 'Status updated');
    },
    onError: (e: unknown) => toast.error(e instanceof Error ? e.message : 'Error'),
  });

  const saveMut = useMutation({
    mutationFn: async ({ values, reason }: { values: Partial<PrivateSector>; reason?: string }) => {
      if (reason) await setSectorReason(reason);
      return updateSector(editing!.id!, values);
    },
    onSuccess: () => { refresh(); setEditing(null); toast.success(isRTL ? 'تم الحفظ' : 'Saved'); },
    onError: (e: unknown) => toast.error(e instanceof Error ? e.message : 'Error'),
  });

  const delMut = useMutation({
    mutationFn: deleteSector,
    onSuccess: () => { refresh(); toast.success(isRTL ? 'تم الحذف' : 'Deleted'); },
    onError: (e: unknown) => toast.error(e instanceof Error ? e.message : 'Error'),
  });

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return sectors;
    return sectors.filter((s) => {
      const b = businessById.get(s.business_id);
      return [s.name_ar, s.name_en, s.ref_id, b?.name_ar, b?.name_en, b?.ref_id]
        .filter(Boolean).some((v) => v!.toLowerCase().includes(q));
    });
  }, [sectors, search, businessById]);

  const totals = useMemo(() => {
    const t = { all: sectors.length, pending: 0, approved: 0, rejected: 0, suspended: 0, draft: 0 };
    for (const s of sectors) t[s.status] += 1;
    return t;
  }, [sectors]);

  const statsLabels = {
    all:       isRTL ? 'الكل'         : 'All',
    pending:   isRTL ? 'قيد المراجعة' : 'Pending',
    approved:  isRTL ? 'معتمد'        : 'Approved',
    rejected:  isRTL ? 'مرفوض'        : 'Rejected',
    suspended: isRTL ? 'موقوف'        : 'Suspended',
    draft:     isRTL ? 'مسودة'        : 'Draft',
  };

  const pills: AdminFilterPill[] = STATUS_KEYS.map((k) => ({
    key: k,
    label: statsLabels[k],
    count: totals[k],
    tone: k === 'pending' ? 'warning'
        : k === 'approved' ? 'success'
        : k === 'rejected' ? 'destructive'
        : k === 'suspended' ? 'muted'
        : k === 'draft' ? 'muted'
        : 'default',
  }));

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <AdminPageHeader
          icon={ShieldCheck}
          tone="info"
          eyebrow={isRTL ? 'الإدارة' : 'Admin'}
          title={isRTL ? 'إدارة القطاعات الخاصة' : 'Private Sectors Admin'}
          subtitle={isRTL ? 'مراجعة واعتماد وإدارة كل القطاعات والعلامات الخاصة بالمزودين.' : 'Review, approve and manage all provider-owned brands and sub-sectors.'}
          breadcrumbs={[
            { label: isRTL ? 'الإدارة' : 'Admin', href: '/admin' },
            { label: isRTL ? 'القطاعات الخاصة' : 'Private Sectors' },
          ]}
        />

        {editing && (
          <PrivateSectorForm
            initial={editing}
            busy={saveMut.isPending}
            onCancel={() => setEditing(null)}
            onSubmit={async (v, reason) => { await saveMut.mutateAsync({ values: v, reason }); }}
          />
        )}

        <PrivateSectorsStatsSection
          totals={totals}
          labels={statsLabels}
          activeKey={tab}
          onSelect={(k) => setTab(k)}
        />

        <PrivateSectorsFiltersBar
          searchValue={search}
          onSearchChange={setSearch}
          searchPlaceholder={isRTL ? 'بحث بالاسم/المنشأة/المعرف…' : 'Search by name / business / ref…'}
          pills={pills}
          activePill={tab}
          onPillSelect={(k) => setTab(k as TabKey)}
          canReset={tab !== 'pending' || !!search}
          onReset={() => { setTab('pending'); setSearch(''); }}
          resetLabel={isRTL ? 'إعادة تعيين' : 'Reset'}
        />

        <PrivateSectorsListSection
          isLoading={isLoading}
          isEmpty={!isLoading && filtered.length === 0}
          loadingLabel={isRTL ? 'جاري التحميل…' : 'Loading…'}
          emptyLabel={isRTL ? 'لا توجد قطاعات بهذه الحالة.' : 'No sectors in this state.'}
        >
          {filtered.map((s) => {
            const meta = PS_STATUS_META[s.status];
            const parent = ONBOARDING_SECTORS.find((p) => p.id === s.parent_sector);
            const biz = businessById.get(s.business_id);
            return (
              <PrivateSectorRow
                key={s.id}
                sector={s}
                isRTL={isRTL}
                statusLabel={isRTL ? meta.ar : meta.en}
                brandTypeLabel={isRTL ? PS_BRAND_TYPE_META[s.brand_type].ar : PS_BRAND_TYPE_META[s.brand_type].en}
                parentSectorLabel={parent ? (isRTL ? parent.name_ar : parent.name_en) : null}
                business={biz}
                actions={{
                  onApprove: () => reviewMut.mutate({ id: s.id, decision: 'approved' }),
                  onRejectStart: () => { setReasonOf(s.id); setReason(''); },
                  onSuspend: () => reviewMut.mutate({ id: s.id, decision: 'suspended' }),
                  onResetDraft: () => reviewMut.mutate({ id: s.id, decision: 'draft' }),
                  onEdit: () => setEditing(s),
                  onToggleAudit: () => setAuditFor(auditFor === s.id ? null : s.id),
                  onToggleDistributors: () => setDistributorsFor(distributorsFor === s.id ? null : s.id),
                  onDelete: () => delMut.mutate(s.id),
                }}
                reasonOpen={reasonOf === s.id}
                reasonValue={reason}
                onReasonChange={setReason}
                onConfirmReject={() => reviewMut.mutate({ id: s.id, decision: 'rejected', reason })}
                onCancelReject={() => setReasonOf(null)}
                rejectBusy={reviewMut.isPending}
                auditSlot={auditFor === s.id ? (
                  <PrivateSectorAuditList
                    entries={focusAudit}
                    emptyLabel={isRTL ? 'لا توجد إدخالات بعد.' : 'No entries yet.'}
                  />
                ) : undefined}
                distributorsSlot={distributorsFor === s.id ? (
                  <SectorDistributorsPanel sectorId={s.id} canManage={true} />
                ) : undefined}
              />
            );
          })}
        </PrivateSectorsListSection>

        <PrivateSectorAuditPanel
          title={isRTL ? 'آخر نشاط على القطاعات الخاصة' : 'Recent global activity'}
          emptyLabel={isRTL ? 'لا يوجد نشاط بعد.' : 'No activity yet.'}
          entries={globalAudit}
        />
      </div>
    </DashboardLayout>
  );
};

export default AdminPrivateSectors;