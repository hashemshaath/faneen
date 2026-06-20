/**
 * Single label source for dashboard navigation. Re-exports the existing
 * canonical glossary so we don't fork it. Any new label must land in
 * `unifiedLabels.ts` first, then be consumed via this barrel.
 */
export {
  UNIFIED_GROUP_LABELS,
  UNIFIED_ITEM_LABELS,
  CREATE_ENTITY_ROUTE,
  COMPLETE_ENTITY_ROUTE,
} from '@/components/dashboard/navigation/unifiedLabels';