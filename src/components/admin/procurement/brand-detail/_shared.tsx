/**
 * ADMIN REDESIGN PHASE 9G — shared presentational helpers for the brand-detail
 * panels. Pure UI only. No Supabase, no queries, no mutations.
 */
import React from 'react';
import { Label } from '@/components/ui/label';

export function FieldLabeled({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <Label className="text-xs">{label}</Label>
      <div className="mt-1">{children}</div>
    </div>
  );
}