import { CaseType } from '../../../shared/enums/case-type';
import { Gender } from '../../../shared/enums/gender';
import { AgeCategories } from '../../../shared/enums/age-categories';

export interface FoundedHeaderQueryDTO {
  search?: string;
  ageCategory?: AgeCategories | number;
  caseType?: CaseType | null;
  gender?: Gender | number | null;
  page: number;
  pageSize: number;
}

export interface FoundedApiListItemDto {
  id: number;
  caseId: number;
  name: string;
  age: string;
  foundedAt: string;
  image: string;
}

export interface PostDetailsResponseDTO {
  fullName: string;
  mainImage: string;
  age: string;
  gender: string;
  founedDate: string; // Misspelled in the API likely
  foundDescription: string;
  missingDescription: string;
  foundLocation: string;
  missingLocation: string;
}
