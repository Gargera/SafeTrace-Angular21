import { RelationType } from '../../../shared/enums/relation-type';

export const RELATION_TYPE_TRANSLATIONS_AR: Record<RelationType, string> = {
  [RelationType.Father]: 'الأب',
  [RelationType.Mother]: 'الأم',
  [RelationType.Brother]: 'الأخ',
  [RelationType.Sister]: 'الأخت',
  [RelationType.Son]: 'الابن',
  [RelationType.Daughter]: 'الابنة',
  [RelationType.Husband]: 'الزوج',
  [RelationType.Wife]: 'الزوجة',
  [RelationType.Grandfather]: 'الجد',
  [RelationType.Grandmother]: 'الجدة',
  [RelationType.Uncle]: 'العم / الخال',
  [RelationType.Aunt]: 'العمة / الخالة',
  [RelationType.Cousin]: 'ابن/ابنة العم أو الخال',
  [RelationType.Nephew]: 'ابن الأخ / ابن الاخت',
  [RelationType.Niece]: 'ابنة الأخ / ابنة الاخت',
  [RelationType.Friend]: 'صديق / زميل',
  [RelationType.Other]: 'صلة قرابة أخرى',
};

export function getRelationTypeTranslationAr(relation?: RelationType | null): string {
  if (relation === null || relation === undefined) return '';
  return RELATION_TYPE_TRANSLATIONS_AR[relation] ?? '';
}

export const RELATION_TYPE_OPTIONS: { value: RelationType; label: string }[] =
  Object.values(RelationType).map((value) => ({
    value,
    label: RELATION_TYPE_TRANSLATIONS_AR[value] ?? 'غير محدد',
  }));