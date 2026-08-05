import { Gender } from '../../../shared/enums/gender';

export const GENDER_TRANSLATIONS_AR: Record<Gender, string> = {
  [Gender.Male]: 'ذكر',
  [Gender.Female]: 'أنثى'
};

export function getGenderTranslationAr(gender?: string | null): string {
  if (!gender) return '';

  const normalizedValue = Object.values(Gender).find((value) => value === gender);
  return normalizedValue ? GENDER_TRANSLATIONS_AR[normalizedValue as Gender] : gender;
}