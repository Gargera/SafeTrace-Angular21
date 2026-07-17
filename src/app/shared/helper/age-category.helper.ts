import { AgeCategories } from '../enums/age-categories';

export interface AgeRange {
  minAge: number | null;
  maxAge: number | null;
}

export function getAgeRange(category: AgeCategories | null): AgeRange {
  switch (category) {
    case AgeCategories.Toddler:
      return { minAge: 0, maxAge: 2 };

    case AgeCategories.Child:
      return { minAge: 3, maxAge: 12 };

    case AgeCategories.Teenager:
      return { minAge: 13, maxAge: 17 };

    case AgeCategories.Young:
      return { minAge: 18, maxAge: 35 };

    case AgeCategories.Adult:
      return { minAge: 36, maxAge: 59 };

    case AgeCategories.LateAdult:
      return { minAge: 60, maxAge: 120 };

    default:
      return { minAge: null, maxAge: null };
  }
}

export function getAgeCategory(age: number): AgeCategories {
  if (age <= 2) return AgeCategories.Toddler;
  if (age <= 12) return AgeCategories.Child;
  if (age <= 17) return AgeCategories.Teenager;
  if (age <= 35) return AgeCategories.Young;
  if (age <= 59) return AgeCategories.Adult;

  return AgeCategories.LateAdult;
}
