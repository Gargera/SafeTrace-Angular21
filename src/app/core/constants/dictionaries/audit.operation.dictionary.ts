export const AUDIT_OPERATION_TRANSLATIONS_AR: Record<string, string> = {
  'Insert': 'إضافة',
  'Update': 'تعديل',
  'Delete': 'حذف'
};

export function getAuditOperationTranslationAr(operation?: string | null): string {
  if (!operation) return '';
  return AUDIT_OPERATION_TRANSLATIONS_AR[operation] || operation;
}
