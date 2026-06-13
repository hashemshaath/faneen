/**
 * Phase 5F — legacy path shim.
 *
 * The inline "Create new entity" panel was split into focused section
 * components under `src/components/admin/businesses/create/`. This file
 * now re-exports the new `BusinessCreatePanel` under the legacy
 * `CreateBusinessPanel` name so any other importer keeps working.
 */
export {
  BusinessCreatePanel as CreateBusinessPanel,
  BusinessCreatePanel as default,
  type BusinessCreatePanelProps as CreateBusinessPanelProps,
} from '@/components/admin/businesses/create/BusinessCreatePanel';
