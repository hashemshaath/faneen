export interface BuildContractVerificationUrlInput {
  origin: string;
  contractBarcodeCode: string;
  contractNumber: string;
  documentHash: string;
}

export const buildContractVerificationUrl = (
  input: BuildContractVerificationUrlInput,
): string => {
  if (input.contractBarcodeCode) {
    return `${input.origin}/q/${encodeURIComponent(input.contractBarcodeCode)}`;
  }

  return `${input.origin}/v/c/${encodeURIComponent(input.contractNumber)}?h=${encodeURIComponent(input.documentHash)}`;
};