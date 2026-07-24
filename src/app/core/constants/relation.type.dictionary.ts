import { RelationType } from '../../shared/enums/relation-type';

export const RELATION_TYPE_TRANSLATIONS_AR: Record<RelationType, string> = {
  [RelationType.Father]: 'الأب',
  [RelationType.Mother]: 'الأم',
  [RelationType.Brother]: 'الأخ',
  [RelationType.Sister]: 'الأخت',
  [RelationType.Friend]: 'صديق / زميل',
  [RelationType.Other]: 'صلة قرابة أخرى',
};

export function getRelationTypeTranslationAr(relation?: RelationType | null): string {
  if (relation === null || relation === undefined) return '';
  return RELATION_TYPE_TRANSLATIONS_AR[relation] ?? '';
}

// FIX: RelationType is now a STRING enum (see relation-type.ts), so Object.values()
// returns only the string values directly — no reverse-mapping filter needed
// (that filter was only necessary for numeric enums).
export const RELATION_TYPE_OPTIONS: { value: RelationType; label: string }[] =
  Object.values(RelationType).map((value) => ({
    value,
    label: RELATION_TYPE_TRANSLATIONS_AR[value] ?? 'غير محدد',
  }));