import { AgeCategories } from '../../../../shared/enums/age-categories';
import { CaseType } from '../../../../shared/enums/case-type';

export interface FoundPersonListItemDto {
  id: number;
  fullName: string;
  caseType: CaseType;
  mainImage: string;
  age: number;
  ageCategory: AgeCategories;
  foundDate: string;
}
