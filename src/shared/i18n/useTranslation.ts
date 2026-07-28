import { useTranslation as useI18nTranslation } from 'react-i18next';

/*
 * Thin re-export of react-i18next's hook. Kept as its own module so future
 * changes (typed resources, namespace presets) don't ripple through every screen.
 */
export function useTranslation() {
  return useI18nTranslation();
}

export default useTranslation;