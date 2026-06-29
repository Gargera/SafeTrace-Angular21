import { CaseType } from '../../../shared/enums/case-type';

export interface FoundedHeaderQueryDTO {
  search?: string;
  ageCategory?: number;
  caseType?: CaseType | null;
  gender?: Gender | null;
  page: number;
  pageSize: number;
}

export enum Gender {
  Male = 0,
  Female = 1,
}

export interface FoundedApiListItemDto {
  id: number;
  caseId: number;
  name: string;
  age: string;
  foundedAt: string;
  image: string;
}

export interface FoundPersonListItemDto {
  id: number;
  fullName: string;
  mainImage: string;
  age: string;
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

export interface PaginationResponseDto<T> {
  items: T[];
  pageNumber: number;
  pageSize: number;
  totalCount: number;
}

export interface ApiResponse<T> {
  success: boolean;
  message: string;
  data: T;
}
