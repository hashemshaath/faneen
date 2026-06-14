import type { BrandColorTokens } from '@/config/brandTheme';
import type { BrandingConfig } from '@/hooks/useBranding';

export type FieldKey =
  | 'fullLightUrl' | 'fullDarkUrl' | 'markUrl'
  | 'sizeNavbar' | 'sizeFooter' | 'sizeAuth' | 'sizeLoader' | 'sizeMark';

export type ImageFieldKey = Extract<FieldKey, 'fullLightUrl' | 'fullDarkUrl' | 'markUrl'>;
export type SizeFieldKey = Exclude<FieldKey, ImageFieldKey>;

export type AdminColorField = Extract<keyof BrandColorTokens,
  | 'primary' | 'primaryHover' | 'primaryDark'
  | 'secondary' | 'secondaryDark'
  | 'accent' | 'accentHover'
  | 'background' | 'surface' | 'text' | 'textMuted' | 'border'
  | 'success' | 'warning' | 'error' | 'info'>;

export interface ColorFieldDef {
  key: AdminColorField;
  ar: string;
  en: string;
  desc: string;
}

export interface ColorSectionDef {
  title_ar: string;
  title_en: string;
  group: ColorFieldDef[];
  isBrand?: boolean;
}

export type AdminColorState = Record<AdminColorField, string>;

export type { BrandingConfig };