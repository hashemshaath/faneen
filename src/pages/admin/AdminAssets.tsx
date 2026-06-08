import React, { useEffect, useState } from 'react';
import { DashboardLayout } from '@/components/dashboard/DashboardLayout';
import { PageHeader } from '@/components/shared';
import { useNoIndex } from '@/hooks/useNoIndex';
import { Bi, useBi } from '@/components/common/Bilingual';
import { useLanguage } from '@/i18n/LanguageContext';
import { Card } from '@/components/ui/card';
import { Loader2, Boxes } from 'lucide-react';
import { AssetsApi, AssetStatusBadge, AssetOpsCard, RentalAssetOpsCard, AssetRentalPanel } from '@/modules/assets';
import type { Asset } from '@/modules/assets';

/** Admin asset hub — operational oversight across all providers. Never public. */
const AdminAssets: React.FC = () => {
  useNoIndex();
  const { isRTL } = useLanguage();
  const bi = useBi();
  const [loading, setLoading] = useState(true);
  const [assets, setAssets] = useState<Asset[]>([]);

  useEffect(() => {
    (async () => {
      const { data } = await AssetsApi.listAllAssets();
      setAssets(data ?? []);
      setLoading(false);
    })();
  }, []);

  return (
    <DashboardLayout>
      <div className="space-y-6 pb-16 md:pb-20">
        <PageHeader
          icon={Boxes}
          title={bi('مركز الأصول','Asset Center')}
          subtitle={bi('نظرة موحدة على أساطيل المعدات: الحالة، الصيانة، الفحوصات، والاستغلال.','Unified view: fleet status, maintenance, inspections, utilization.')}
        />
        <AssetOpsCard />
        <RentalAssetOpsCard />

        <Card className="p-4">
          <div className="font-semibold mb-3"><Bi ar="آخر الأصول" en="Recent assets" /></div>
          {loading ? (
            <div className="flex justify-center py-10"><Loader2 className="size-5 animate-spin" /></div>
          ) : assets.length === 0 ? (
            <div className="text-sm text-muted-foreground"><Bi ar="لا توجد أصول مسجلة." en="No assets registered." /></div>
          ) : (
            <div className="divide-y">
              {assets.map(a => (
                <div key={a.id} className="py-3 space-y-2">
                  <div className="flex items-center justify-between gap-3">
                    <div>
                      <div className="text-sm font-medium">{isRTL ? a.name_ar : (a.name_en || a.name_ar)}</div>
                      <div className="text-xs text-muted-foreground tech-content">{a.ref_id}{a.serial_number ? ` · ${a.serial_number}` : ''}</div>
                    </div>
                    <AssetStatusBadge status={a.status} />
                  </div>
                  <AssetRentalPanel assetId={a.id} />
                </div>
              ))}
            </div>
          )}
        </Card>
      </div>
    </DashboardLayout>
  );
};

export default AdminAssets;