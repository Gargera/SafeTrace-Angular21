import { CaseType } from '../enums/case-type';
import { CaseStatus } from '../enums/case-status';
import { AgeCategories } from '../enums/age-categories';

// ASSUMPTION: not provided in backend.md — mirror your real backend enums if different.
export enum Gender {
  Male = 'Male',
  Female = 'Female',
}

export enum AgeSort {
  Ascending = 'Ascending',
  Descending = 'Descending',
}

export enum DateSort {
  Ascending = 'Ascending',
  Descending = 'Descending',
}

// Mirrors CasesFilterBaseDto
export interface CasesFilterBase {
  status?: CaseStatus;
  gender?: Gender;
  fullName?: string;
  government?: string;
  city?: string;
  minAge?: number;
  maxAge?: number;
  fromDate?: string; // ISO date string
  toDate?: string; // ISO date string
  ageSort?: AgeSort;
  dateSort?: DateSort;
  page: number;
  // ASSUMPTION: backend DTO has no PageSize field yet.
  // Add `public int PageSize { get; set; } = 4;` to CasesFilterBaseDto
  // (or hardcode pageSize in GetPagedResultAsync) for this to actually take effect server-side.
  pageSize: number;
}

// Mirrors UrgentCasesFilterDto (extra geo fields)
export interface UrgentCasesFilter extends CasesFilterBase {
  latitude?: number;
  longitude?: number;
  radiusInMeters?: number;
}

// ASSUMPTION: TListDto shape — adjust field names to match your real API response.
export interface MyCaseListItemDto {
  id: number;
  fullName: string;
  age: number;
  ageCategory: AgeCategories;
  gender: Gender;
  status: CaseStatus;
  government: string;
  city: string;
  caseType: CaseType;
  reportedDate: string; // ISO date string
  mainImageUrl?: string;
}

export interface PaginationResponseDto<T> {
  items: T[];
  pageNumber: number;
  pageSize: number;
  totalCount: number;
  totalPages: number;
}

// Mirrors your generic ApiResponse<T> wrapper (as used by ProfileService: `data.data`)
export interface ApiResponse<T> {
  succeeded: boolean;
  message?: string;
  data: T;
}
