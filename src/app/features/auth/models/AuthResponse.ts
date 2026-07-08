export interface AuthResponse {
  accessToken: string;
  refreshTokenExpiration: string;
  email: string;
  fullName: string;
  profileImage?: string | null;
  verificationStatus: string;
}