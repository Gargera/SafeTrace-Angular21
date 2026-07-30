import { AgeCategoryResponse } from '../../../core/models/cases.model';
import { CaseStatus } from '../../../shared/enums/case-status';
import { CaseType } from '../../../shared/enums/case-type';
import { Gender } from '../../../shared/enums/gender';
import { UserRole } from '../../../shared/enums/user-role';
import { VerificationStatus } from '../../../shared/enums/verification-status';

export interface GetUserInfoDTO {
  fullName: string;
  email: string;
  emailConfirmed: boolean;
  homeLatitude: number | null;
  homeLongitude: number | null;
  profileImage: string | null;
  verificationStatus: VerificationStatus;
  identificationImage: string | null;
  role: UserRole;
  phoneNumber: string | null; // ← كانت PhoneNumber بحرف كبير
  cases: any[];
}
export interface UpdateCurrentLocationDTO {
  currentLocationLatitude: number;
  currentLocationLongitude: number;
}
// ── One DTO per endpoint — matches the backend exactly, keeps sections independent ──

/** PUT /UserProfile/UpdateName (form-data) */
export interface UpdateNameDTO {
  firstName: string;
  lastName: string;
}

export interface ChangePhoneNumberDTO {
  phoneNumber: string;
}
/** PUT /UserProfile/UpdateProfileImage (form-data) */
export interface UpdateProfileImageDTO {
  profileImage: File;
}

/** PUT /UserProfile/AddIdImage (form-data) */
export interface AddIdImageDTO {
  identificationImage: File;
}

/** PUT /UserProfile/UpdateHomeLocation (form-data) */
export interface UpdateHomeLocationDTO {
  homeLatitude: number;
  homeLongitude: number;
}

/** POST /Account/change-password (JSON body) */
export interface ChangePasswordDTO {
  currentPassword: string;
  newPassword: string;
  /** Only include if your auth flow needs the current refresh token to rotate it. */
  currentRefreshToken?: string | null;
}
export interface UpdateProfileImageDTO {
  profileImage: File;
}

export interface MyCasesFilterRequest {
  fullName?: string | null;
  caseCode?: string | null;
  status?: CaseStatus | null;
  caseType?: CaseType | null;
  page?: number;
  pageSize?: number;
}

export interface MyCaseListItemResponse {
  id: number;
  fullName: string;
  caseCode?: string;
  age: number;
  ageCategory: AgeCategoryResponse | null;
  gender: Gender;
  status: CaseStatus;
  government: string;
  city: string;
  caseType: CaseType;
  createdAt: string;
  mainImageUrl: string | null;
  foundPersonInfoId?: number | null;
}
