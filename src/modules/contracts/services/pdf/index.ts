/**
 * R2A.5a — Contract PDF service surface (re-export shim only).
 *
 * No implementation lives here. All symbols are re-exported from the
 * canonical implementation in src/lib/contract-pdf-export.ts. This phase
 * intentionally does not move PDF code, Arabic font/shaping logic, QR
 * logic, or privacy guards.
 */
export {
  buildContractPDF,
  exportContractPDF,
  previewContractPDF,
  buildContractPdfForAnalysis,
  buildArabicFontTestPDF,
  exportArabicFontTestPDF,
  exportMeasurementsPDF,
  printMeasurements,
  exportMeasurementsExcel,
  parseMeasurementsFromCSV,
} from '@/lib/contract-pdf-export';

export type {
  ContractExportData,
  ImportedMeasurement,
} from '@/lib/contract-pdf-export';