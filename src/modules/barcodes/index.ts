// Module: barcodes
// Canonical public API for the barcodes module.
export {
  listBarcodeRegistryRecords,
  getBarcodeRegistrySummary,
  getBarcodeRegistryRecordById,
  type BarcodeRegistryRow,
  type BarcodeRegistrySummary,
  type BarcodeRegistryDetail,
  type ListBarcodeRegistryRecordsOptions,
  type ListBarcodeRegistryRecordsResult,
} from './services/adminBarcodeRegistry';
