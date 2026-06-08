import React, { useEffect, useState } from 'react';
import { DashboardLayout } from '@/components/dashboard/DashboardLayout';
import { PageHeader } from '@/components/shared';
import { useNoIndex } from '@/hooks/useNoIndex';
import { Bi, useBi } from '@/components/common/Bilingual';
import { useLanguage } from '@/i18n/LanguageContext';
import { Card } from '@/components/ui/card';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { Loader2, Boxes } from 'lucide-react';
import { CategoryAdminPanel } from '@/components/admin/CategoryAdminPanel';
import {
  AssetsApi, AssetStatusBadge, AssetOpsCard, RentalAssetOpsCard,
  AssetRentalPanel, AssetOverridePanel,
  AssetUtilizationSummary, AssetQrIdentity, AssetMaintenanceAlerts,
  RentalAssetPolishOpsCard,
} from '@/modules/assets';
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

        <Tabs defaultValue="ops">
          <TabsList>
            <TabsTrigger value="ops"><Bi ar="عمليات الأصول" en="Operations" /></TabsTrigger>
            <TabsTrigger value="categories"><Bi ar="التصنيفات والترتيب" en="Categories & order" /></TabsTrigger>
            <TabsTrigger value="recent"><Bi ar="آخر الأصول" en="Recent assets" /></TabsTrigger>
          </TabsList>

          <TabsContent value="ops" className="mt-4 space-y-4">
            <RentalAssetOpsCard />
            <RentalAssetPolishOpsCard />
          </TabsContent>

          <TabsContent value="categories" className="mt-4">
            <CategoryAdminPanel
              categoryTable="asset_categories"
              itemTable="assets"
              itemImageField="images"
              itemActiveField="is_active"
              titleAr="تصنيفات الأصول"
              titleEn="Asset categories"
            />
          </TabsContent>

          <TabsContent value="recent" className="mt-4">
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
                      <AssetMaintenanceAlerts asset={a} />
                      <AssetRentalPanel assetId={a.id} />
                      <AssetUtilizationSummary assetId={a.id} />
                      <AssetQrIdentity asset={a} />
                      <AssetOverridePanel assetId={a.id} currentStatus={a.status} />
                    </div>
                  ))}
                </div>
              )}
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </DashboardLayout>
  );
};

export default AdminAssets;