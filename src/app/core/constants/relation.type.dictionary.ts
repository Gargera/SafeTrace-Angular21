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

export const RELATION_TYPE_OPTIONS: { value: RelationType; label: string }[] =
  Object.values(RelationType)
    .filter((v): v is RelationType => typeof v === 'number')
    .map((value) => ({ 
      value, 
      label: RELATION_TYPE_TRANSLATIONS_AR[value] ?? 'غير محدد' 
    }));