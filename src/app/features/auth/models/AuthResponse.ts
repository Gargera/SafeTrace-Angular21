import { VerificationStatus } from '../../../shared/enums/verification-status';

export interface AuthResponse {
  accessToken: string;
  refreshToken: string;
  refreshTokenExpiration: string;
  email: string;
  fullName: string;
  verificationStatus: VerificationStatus;
}
