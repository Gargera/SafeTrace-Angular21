// Enums
import { AgeSort } from '../../shared/enums/age-sort';
import { AgeCategories } from '../../shared/enums/age-categories';
import { CaseStatus } from '../../shared/enums/case-status';
import { CaseType } from '../../shared/enums/case-type';
import { DateSort } from '../../shared/enums/date-sort';
import { FileType } from '../../shared/enums/file-type';
import { Gender } from '../../shared/enums/gender';
import { RelationType } from '../../shared/enums/relation-type';

// ============ RESPONSE MODELS ============

export interface AgeCategoryResponse {
  id: number;
  name: string;
}

export interface UserResponse {
  fName: string;
  lName: string;
  email: string;
  phoneNumber: string;
}

export interface CasePhotoResponse {
  id: number;
  imagePath: string;
  isPrimary: boolean;
  type: FileType;
}

export interface FoundPersonInfoResponse {
  id: number;
  description: string;
  government: string;
  city: string;
  street: string;
  caseId: number;
  foundedAt: string; // DateOnly
  foundedUserId: string;
}

export interface MatchedCaseResponse {
  id: number;
  caseCode: string;
  caseType: CaseType;
  status: CaseStatus;
  fName: string | null;
  sName: string | null;
  tName: string | null;
  lName: string | null;
  gender: Gender;
  age: number;
  city: string;
  government: string;
  createdAt: string; // DateTime
  mainPhoto: string;
  matchScore: number;
}

export interface CreateCaseResponse {
  isCreated: boolean;
  isBlocked: boolean;
  caseId: number | null;
  matchedCases: MatchedCaseResponse[];
}

export interface DuplicateCheckResponse {
  sameTypeMatch: MatchedCaseResponse | null;
  crossTypeMatches: MatchedCaseResponse[];
  hasSameTypeMatch: boolean;
  hasCrossTypeMatches: boolean;
}

export interface MatchedCasesResponse {
  hasMatches: boolean;
  matchedCases: MatchedCaseResponse[];
}

export const EmptyMatchedCasesResponse: MatchedCasesResponse = {
  hasMatches: false,
  matchedCases: [],
};

export interface CaseDetailResponse {
  id: number;
  caseCode: string;
  caseType: CaseType;
  status: CaseStatus;
  gender: Gender;
  government: string;
  city: string;
  street: string;
  fName: string | null;
  sName: string | null;
  tName: string | null;
  lName: string | null;
  age: number;
  communicationPhone: string | null;
  relation: RelationType;
  createdAt: string; // DateTime
  updatedAt: string | null; // DateTime
  eventDate: string; // DateTime
  description: string | null;
  foundPersonInfo: FoundPersonInfoResponse | null;
  ageCategory: AgeCategoryResponse | null;
  user: UserResponse | null;
  photos: CasePhotoResponse[];
  video: string | null;
  rejectionReason: string | null;
}

export interface CaseListItemResponse {
  id: number;
  caseCode: string;
  caseType: CaseType;
  status: CaseStatus;
  fName: string | null;
  sName: string | null;
  tName: string | null;
  lName: string | null;
  gender: Gender;
  age: number;
  city: string;
  government: string;
  createdAt: string; // DateTime
  mainPhoto: string;
}

// ============ REQUEST MODELS ============

export interface CaseMatchSubjectInfoRequest {
  gender: Gender;
  age: number;
}

export interface CaseUpsertBaseRequest {
  gender: Gender;
  age: number;
  government: string;
  city: string;
  street: string | null;
  eventDate: string;

  sName: string | null;
  tName: string | null;
  communicationPhone: string | null;
  description: string | null;

  video: File | null;
}


export interface CreateCaseBaseRequest extends CaseUpsertBaseRequest {
  primaryImage: File;
  additionalImages: File[] | null;
}

export interface UpdateCaseBaseRequest extends CaseUpsertBaseRequest {
  primaryImage?: File | null;

  newPhotos: File[] | null;
  deletedPhotoIds: number[] | null;
  primaryPhotoId: number | null;
}

export interface CasesFilterRequest {
  status: CaseStatus | null;
  caseType: CaseType | null;
  gender: Gender | null;
  ageCategory: AgeCategories | null;
  fullName: string | null;
  caseCode: string | null;
  government: string | null;
  city: string | null;
  minAge: number | null;
  maxAge: number | null;
  fromDate: string | null; // DateTime
  toDate: string | null; // DateTime
  ageSort: AgeSort | null;
  dateSort: DateSort | null;
  page: number; // Default: 1
  pageSize: number; // Default: 12
}

export interface FoundPersonInfoRequest {
  description: string;
  government: string;
  city: string;
  street: string;
  foundedAt: string; // DateOnly
}

export interface CaseFileResponse {
  id: number;
  imagePath: string;
  isPrimary: boolean;
  faceId?: string | null;
}