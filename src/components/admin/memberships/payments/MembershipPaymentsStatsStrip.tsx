/**
 * Presentational KPI strip for the admin membership payments page.
 * Pure UI — consumes pre-computed counts as props.
 * No DB, no Supabase, no queries, no mutations.
 */
import React from 'react';
import { MembershipStatsStrip, type MembershipStatItem } from '@/components/admin/memberships/shared';

export interface MembershipPaymentsStatsStripProps {
  items: MembershipStatItem[];
  className?: string;
}

export const MembershipPaymentsStatsStrip: React.FC<MembershipPaymentsStatsStripProps> = ({ items, className }) => {
  return <MembershipStatsStrip items={items} columns={4} className={className} />;
};

export default MembershipPaymentsStatsStrip;