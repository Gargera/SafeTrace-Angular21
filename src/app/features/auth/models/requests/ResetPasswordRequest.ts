export interface ResetPasswordRequest {
  email: string;
  otpCode: string;
  newPassword: string;
}