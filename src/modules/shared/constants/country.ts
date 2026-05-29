/**
 * Saudi Arabia foundation constants (P0 / P0.1).
 *
 * Scaffold only — production callsites are not migrated yet.
 * TODO(R1B+): replace hardcoded SA UUID/currency/locale literals in callsites
 * with these constants once each module is touched for refactor.
 */
export const SA_COUNTRY_ID = '4e37871f-3211-4484-935e-cf8c387cbf80' as const;
export const SA_COUNTRY_CODE = 'SA' as const;
export const SA_CURRENCY = 'SAR' as const;
export const SA_LOCALE = 'ar-SA-u-nu-latn' as const;
export const SA_TIMEZONE = 'Asia/Riyadh' as const;