import { VerificationStatus } from "../../../../shared/enums/verification-status";

export interface GetUserDto {
  id: string;
  fName: string;
  lName: string;
  email: string;
  phoneNumber: string;
  verificationStatus: VerificationStatus;
  isBlocked: boolean;
  role: string;
}