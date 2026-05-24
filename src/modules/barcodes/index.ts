// Module: barcodes
// Canonical public API for the barcodes module.
export {
  listBarcodeRegistryRecords,
  getBarcodeRegistrySummary,
  getBarcodeRegistryRecordById,
  freezeBarcodeAdmin,
  archiveBarcodeAdmin,
  restoreBarcodeAdmin,
  transferBarcodeAdmin,
  listBarcodeTransferTrailAdmin,
  issueSuccessorBarcodeAdmin,
  type BarcodeRegistryRow,
  type BarcodeRegistrySummary,
  type BarcodeRegistryDetail,
  type ListBarcodeRegistryRecordsOptions,
  type ListBarcodeRegistryRecordsResult,
  type BarcodeLifecycleResult,
  type BarcodeTransferTrailEntry,
  type IssueSuccessorBarcodeResult,
} from './services/adminBarcodeRegistry';
