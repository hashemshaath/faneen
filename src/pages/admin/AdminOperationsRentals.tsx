/**
 * RENTAL-MICROSERVICE-2 — Rentals lane inside the Operations Center.
 * Renders the unified ops queue card (counts + manual expiry-scan trigger).
 * AdminRoute wrapper supplies DashboardLayout — keep this tab body lean.
 */
import React from 'react';
import { RentalOpsQueueCard } from '@/modules/rentals';
import { RentalAssetOpsCard } from '@/modules/assets';
import { Bi } from '@/components/common/Bilingual';

const AdminOperationsRentals: React.FC = () => (
  <div className="space-y-4 py-2">
    <div className="text-sm text-muted-foreground">
      <Bi
        ar="مؤشرات تشغيلية لخدمة التأجير: العقود النشطة، القريبة من الانتهاء، المتجاوزة، والتمديدات المعلّقة، إضافة إلى جودة بيانات العناصر."
        en="Operational signals for rentals: active, expiring, expired, overdue orders, pending extensions, and item data quality."
      />
    </div>
    <RentalOpsQueueCard />
    <RentalAssetOpsCard />
  </div>
);

export default AdminOperationsRentals;