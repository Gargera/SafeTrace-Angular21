import { CaseType } from '../../shared/enums/case-type';

export const CASE_TYPE_TRANSLATIONS_AR: Record<CaseType, string> = {
  [CaseType.Urgent]: 'عاجل',
  [CaseType.LongTerm]: 'طويل الأمد',
  [CaseType.Unknown]: 'مجهول الهوية'
};

export function getCaseTypeTranslationAr(caseType?: string | null): string {
  if (!caseType) return '';

  const normalizedValue = Object.values(CaseType).find((value) => value === caseType);
  return normalizedValue ? CASE_TYPE_TRANSLATIONS_AR[normalizedValue as CaseType] : caseType;
}
