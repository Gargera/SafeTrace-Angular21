export interface AuthResponse {
  accessToken: string;
  refreshToken: string;
  refreshTokenExpiration: string;
  email: string;
  fullName: string;
  verificationStatus: string;
}