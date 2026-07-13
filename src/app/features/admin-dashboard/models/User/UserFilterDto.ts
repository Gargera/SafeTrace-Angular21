import { VerificationStatus } from "../../../../shared/enums/verification-status";

export interface UserFilterDto {
  pageNumber: number;
  pageSize: number;
  searchTerm?: string;
  verificationStatus?: VerificationStatus;
  roleId?: string;
}