import { VerificationStatus } from '../../shared/enums/verification-status';

export interface GetUserInfoDTO {
  fullName: string;
  email: string;
  emailConfirmed: boolean;
  homeLatitude: number | null;
  homeLongitude: number | null;
  profileImage: string | null;
  verificationStatus: VerificationStatus;
  identificationImage: string | null;
}

// ── One DTO per endpoint — matches the backend exactly, keeps sections independent ──

/** PUT /UserProfile/UpdateName (form-data) */
export interface UpdateNameDTO {
  firstName: string;
  lastName: string;
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
