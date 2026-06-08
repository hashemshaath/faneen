import React from 'react';
import { AssetOpsCard } from '@/modules/assets';
import { Bi } from '@/components/common/Bilingual';

const AdminOperationsAssets: React.FC = () => (
  <div className="space-y-4 py-2">
    <div className="text-sm text-muted-foreground">
      <Bi
        ar="مؤشرات تشغيلية للأصول: الصيانة المستحقة والمتجاوزة، الفحوصات المتأخرة، الاستغلال المنخفض، والتنبيهات المفتوحة."
        en="Asset operational signals: maintenance due/overdue, late inspections, low utilization, and open alerts."
      />
    </div>
    <AssetOpsCard />
  </div>
);

export default AdminOperationsAssets;