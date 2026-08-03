import { AgeCategories } from '../../../../shared/enums/age-categories';

export interface FoundPersonListItemDto {
  id: number;
  fullName: string;
  mainImage: string;
  age: number;
  ageCategory: AgeCategories;
  foundDate: string;
}
