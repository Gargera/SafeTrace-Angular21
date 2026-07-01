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

export interface UpdateProfileInfoDTO {
  firstName: string;
  lastName: string;
  homeLatitude: number | null;
  homeLongitude: number | null;
  identificationImage?: File | null;
  profileImage?: File | null;
  currentPassword: string;
  newPassword: string;
}
