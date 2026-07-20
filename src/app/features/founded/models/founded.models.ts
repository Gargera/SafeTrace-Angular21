import { CaseType } from '../../../shared/enums/case-type';
import { Gender } from '../../../shared/enums/gender';

export interface FoundedHeaderQueryDTO {
  search?: string;
  ageCategory?: number;
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
  ageCategory: string;
  foundDate: string;
}

export interface PostDetailsResponseDTO {
  fullName: string;
  mainImage: string;
  age: string;
  gender: string;
  founedDate: string;
  foundDescription: string;
  missingDescription: string;
  foundLocation: string;
  missingLocation: string;
}