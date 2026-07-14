import { UserRole } from '../../../shared/enums/user-role';
import { VerificationStatus } from '../../../shared/enums/verification-status';

export interface AuthResponse {
  accessToken: string;
  refreshTokenExpiration: string;
  email: string;
  fullName: string;
  profileImage?: string | null;
  verificationStatus: VerificationStatus;

}
