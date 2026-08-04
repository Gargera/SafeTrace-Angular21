import { CaseStatus } from '../../../shared/enums/case-status';

export const CASE_STATUS_TRANSLATIONS_AR: Record<CaseStatus, string> = {
  [CaseStatus.Pending]: 'قيد المراجعة',
  [CaseStatus.Active]: 'نشط',
  [CaseStatus.Deleted]: 'محذوف',
  [CaseStatus.Found]: 'تم العثور',
  [CaseStatus.Rejected]: 'مرفوض',
  [CaseStatus.Expired]: 'منتهي الصلاحية',
};

export function getCaseStatusTranslationAr(status?: string | null): string {
  if (!status) return '';

  const normalizedValue = Object.values(CaseStatus).find((value) => value === status);
  return normalizedValue ? CASE_STATUS_TRANSLATIONS_AR[normalizedValue as CaseStatus] : status;
}
