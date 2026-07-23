import { AgeCategories } from '../../shared/enums/age-categories';

export const AGE_CATEGORIES_TRANSLATIONS_AR: Record<AgeCategories, string> = {
  [AgeCategories.Toddler]: 'طفل رضيع',
  [AgeCategories.Child]: 'طفل',
  [AgeCategories.Teenager]: 'مراهق',
  [AgeCategories.Young]: 'شاب',
  [AgeCategories.Adult]: 'بالغ',
  [AgeCategories.LateAdult]: 'مسن'
};

export function getAgeCategoryTranslationAr(ageCategory?: string | null): string {
  if (!ageCategory) return '';

  const normalizedValue = Object.values(AgeCategories).find((value) => value === ageCategory);
  return normalizedValue ? AGE_CATEGORIES_TRANSLATIONS_AR[normalizedValue as AgeCategories] : ageCategory;
}