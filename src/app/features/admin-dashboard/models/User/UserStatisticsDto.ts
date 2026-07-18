export interface UserStatisticsDto {
  totalUsers: number;
  activeUsers: number;
  bannedUsers: number;
  verifiedUsers: number;
  pendingVerificationUsers: number;
  unverifiedUsers: number;
  usersPerRole: { [key: string]: number };
}
