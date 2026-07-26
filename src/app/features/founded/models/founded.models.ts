import { AgeCategories } from '../../../shared/enums/age-categories';
import { CaseType } from '../../../shared/enums/case-type';
import { Gender } from '../../../shared/enums/gender';

export interface FoundedHeaderQueryDTO {
  search?: string;
  minAge?: number;
  maxAge?: number;
  caseType?: CaseType | null;
  gender?: Gender | null;
  page: number;
  pageSize: number;
}


export interface FoundedApiListItemDto {
  id: number;
  caseId: number;
  name: string;
  age: number;
  foundedAt: string;
  image: string;
}

export interface FoundPersonListItemDto {
  id: number;
  fullName: string;
  mainImage: string;
  age: number;
  ageCategory: AgeCategories;
  foundDate: string;
}

export interface PostDetailsResponseDTO {
  fullName: string;
  mainImage: string;
  age: number;
  gender: string;
  founedDate: string;
  foundDescription: string;
  missingDescription: string;
  foundLocation: string;
  missingLocation: string;
}